package edu.bnbu.student.mvp.core.network.v1

import edu.bnbu.student.mvp.core.exercise.ExerciseMediaUploadMethod
import edu.bnbu.student.mvp.core.exercise.ExerciseMediaUploadSession
import edu.bnbu.student.mvp.core.exercise.UploadExerciseMediaObjectCommand
import java.io.File
import java.time.Instant
import okhttp3.OkHttpClient
import okhttp3.mockwebserver.MockResponse
import okhttp3.mockwebserver.MockWebServer
import org.junit.After
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertThrows
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.rules.TemporaryFolder
import kotlinx.coroutines.runBlocking

class PrivateExerciseMediaObjectUploaderTest {
    @get:Rule
    val temporaryFolder = TemporaryFolder()

    private lateinit var server: MockWebServer
    private lateinit var uploader: PrivateExerciseMediaObjectUploader
    private lateinit var sourceFile: File

    @Before
    fun setUp() {
        server = MockWebServer()
        server.start()
        uploader = PrivateExerciseMediaObjectUploader(
            httpClient = OkHttpClient(),
            clock = { FixedNow }
        )
        sourceFile = temporaryFolder.newFile("photo.jpg").apply {
            writeBytes(byteArrayOf(0x01, 0x02, 0x03, 0x04))
        }
    }

    @After
    fun tearDown() {
        server.shutdown()
    }

    @Test
    fun uploadsOnlyToSignedStorageUrlWithoutBackendAuthenticationHeaders() = runBlocking {
        server.enqueue(MockResponse().setResponseCode(200).setHeader("ETag", "\"etag-1\""))

        val receipt = uploader.upload(command())

        assertEquals("\"etag-1\"", receipt.entityTag)
        val request = server.takeRequest()
        assertEquals("PUT", request.method)
        assertEquals("image/jpeg", request.getHeader("Content-Type"))
        assertEquals(sourceFile.length().toString(), request.getHeader("Content-Length"))
        assertEquals("required-value", request.getHeader("x-required-header"))
        assertNull(request.getHeader("Authorization"))
        assertNull(request.getHeader("X-Request-ID"))
        assertNull(request.getHeader("Idempotency-Key"))
        assertArrayEquals(sourceFile.readBytes(), request.body.readByteArray())
    }

    @Test
    fun refusesRedirectInsteadOfForwardingSignedHeadersToAnotherLocation() {
        server.enqueue(
            MockResponse()
                .setResponseCode(307)
                .setHeader("Location", server.url("/redirected"))
        )

        assertThrows(ExerciseMediaObjectUploadException::class.java) {
            runBlocking { uploader.upload(command()) }
        }
        assertEquals(1, server.requestCount)
    }

    @Test
    fun rejectsExpiredUploadSessionBeforeReadingTheNetwork() {
        val expired = command().copy(
            uploadSession = session().copy(expiresAtEpochMillis = FixedNow.toEpochMilli())
        )

        assertThrows(IllegalArgumentException::class.java) {
            runBlocking { uploader.upload(expired) }
        }
        assertEquals(0, server.requestCount)
    }

    @Test
    fun missingEntityTagIsNotReportedAsSuccessfulUpload() {
        server.enqueue(MockResponse().setResponseCode(200))

        val error = assertThrows(ExerciseMediaObjectUploadException::class.java) {
            runBlocking { uploader.upload(command()) }
        }

        assertEquals(200, error.httpStatus)
        assertNull(error.storageErrorCode)
    }

    @Test
    fun signatureMismatchUsesAllowlistedCodeAndPrefersStorageRequestHeader() {
        val signedUrlSecret = "X-Amz-Signature=do-not-render"
        server.enqueue(
            MockResponse()
                .setResponseCode(403)
                .setHeader("x-amz-request-id", "storage-header-1")
                .setBody(
                    """<Error><Code>SignatureDoesNotMatch</Code><Message>$signedUrlSecret</Message><RequestId>storage-xml-ignored</RequestId></Error>"""
                )
        )

        val error = assertThrows(ExerciseMediaObjectUploadException::class.java) {
            runBlocking { uploader.upload(command()) }
        }

        assertEquals(403, error.httpStatus)
        assertEquals(ExerciseMediaStorageErrorCode.SIGNATURE_DOES_NOT_MATCH, error.storageErrorCode)
        assertEquals("storage-header-1", error.storageRequestId)
        assertNull(error.cause)
        assertFalse(error.message.orEmpty().contains(signedUrlSecret))
        assertFalse(error.toString().contains(signedUrlSecret))
        assertFalse(error.message.orEmpty().contains("<Error>"))
    }

    @Test
    fun accessDeniedUsesAllowlistedXmlRequestIdWhenHeaderIsAbsent() {
        server.enqueue(
            MockResponse()
                .setResponseCode(403)
                .setBody("""<Error><Code>AccessDenied</Code><RequestId>storage-xml-2</RequestId></Error>""")
        )

        val error = assertThrows(ExerciseMediaObjectUploadException::class.java) {
            runBlocking { uploader.upload(command()) }
        }

        assertEquals(ExerciseMediaStorageErrorCode.ACCESS_DENIED, error.storageErrorCode)
        assertEquals("storage-xml-2", error.storageRequestId)
    }

    @Test
    fun expiredStorageErrorsRemainStructuredWithoutAutomaticRetry() {
        listOf(
            "ExpiredToken" to ExerciseMediaStorageErrorCode.EXPIRED_TOKEN,
            "RequestExpired" to ExerciseMediaStorageErrorCode.REQUEST_EXPIRED,
            "RequestTimeTooSkewed" to ExerciseMediaStorageErrorCode.REQUEST_TIME_TOO_SKEWED
        ).forEachIndexed { index, (wireCode, expectedCode) ->
            server.enqueue(
                MockResponse()
                    .setResponseCode(403)
                    .setBody("""<Error><Code>$wireCode</Code><RequestId>storage-expired-$index</RequestId></Error>""")
            )

            val error = assertThrows(ExerciseMediaObjectUploadException::class.java) {
                runBlocking { uploader.upload(command()) }
            }

            assertEquals(expectedCode, error.storageErrorCode)
            assertEquals("storage-expired-$index", error.storageRequestId)
        }
        assertEquals(3, server.requestCount)
    }

    @Test
    fun unknownOrOutOfBoundsStorageDetailsAreNotRetained() {
        val hiddenXml = "<Error><Code>AccessDenied</Code><RequestId>unsafe request id</RequestId></Error>"
        server.enqueue(
            MockResponse()
                .setResponseCode(403)
                .setBody("x".repeat(8_192) + hiddenXml)
        )

        val error = assertThrows(ExerciseMediaObjectUploadException::class.java) {
            runBlocking { uploader.upload(command()) }
        }

        assertNull(error.storageErrorCode)
        assertNull(error.storageRequestId)
        assertFalse(error.message.orEmpty().contains(hiddenXml))
    }

    private fun command() = UploadExerciseMediaObjectCommand(
        uploadSession = session(),
        sourceFile = sourceFile,
        mimeType = "image/jpeg",
        expectedFileSizeBytes = sourceFile.length()
    )

    private fun session() = ExerciseMediaUploadSession(
        uploadSessionId = "upload-1",
        mediaId = "media-1",
        uploadUrl = server.url("/private-object").toUri(),
        uploadMethod = ExerciseMediaUploadMethod.PUT,
        requiredHeaders = mapOf(
            "Content-Type" to "image/jpeg",
            "Content-Length" to sourceFile.length().toString(),
            "x-required-header" to "required-value"
        ),
        expiresAtEpochMillis = FixedNow.plusSeconds(300).toEpochMilli()
    )

    private companion object {
        val FixedNow: Instant = Instant.parse("2026-08-07T12:00:00Z")
    }
}
