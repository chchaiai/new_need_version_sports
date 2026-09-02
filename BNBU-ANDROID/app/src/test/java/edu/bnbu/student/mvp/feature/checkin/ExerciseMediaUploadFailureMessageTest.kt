package edu.bnbu.student.mvp.feature.checkin

import edu.bnbu.student.mvp.core.network.v1.ExerciseMediaObjectUploadException
import edu.bnbu.student.mvp.core.network.v1.ExerciseMediaStorageErrorCode
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ExerciseMediaUploadFailureMessageTest {
    @Test
    fun classifiesSignatureDeniedAndExpiredStorageResponses() {
        val signature = exerciseProofSubmissionErrorMessage(
            storageError(ExerciseMediaStorageErrorCode.SIGNATURE_DOES_NOT_MATCH, "storage-signature-1")
        )
        val denied = exerciseProofSubmissionErrorMessage(
            storageError(ExerciseMediaStorageErrorCode.ACCESS_DENIED, "storage-denied-1")
        )
        val expired = exerciseProofSubmissionErrorMessage(
            storageError(ExerciseMediaStorageErrorCode.REQUEST_EXPIRED, "storage-expired-1")
        )

        assertTrue(signature.contains("上传签名"))
        assertTrue(signature.contains("storage-signature-1"))
        assertTrue(denied.contains("拒绝了本次上传权限"))
        assertTrue(denied.contains("storage-denied-1"))
        assertTrue(expired.contains("已过期或超出有效时间"))
        assertTrue(expired.contains("storage-expired-1"))
    }

    @Test
    fun generic403DoesNotDisplayUnsafeDiagnosticContent() {
        val unsafeRequestId = "storage-id\nX-Amz-Signature=secret"

        val message = exerciseProofSubmissionErrorMessage(
            ExerciseMediaObjectUploadException(
                message = "raw <Error>signed-url-secret</Error>",
                httpStatus = 403,
                storageRequestId = unsafeRequestId
            )
        )

        assertTrue(message.contains("对象存储拒绝了本次上传"))
        assertTrue(message.contains("诊断编号：暂不可用"))
        assertFalse(message.contains("X-Amz-Signature"))
        assertFalse(message.contains("signed-url-secret"))
        assertFalse(message.contains("<Error>"))
    }

    private fun storageError(
        code: ExerciseMediaStorageErrorCode,
        requestId: String
    ) = ExerciseMediaObjectUploadException(
        message = "Private media upload returned HTTP 403.",
        httpStatus = 403,
        storageErrorCode = code,
        storageRequestId = requestId
    )
}
