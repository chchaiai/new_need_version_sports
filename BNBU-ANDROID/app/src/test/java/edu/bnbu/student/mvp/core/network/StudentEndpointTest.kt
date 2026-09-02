package edu.bnbu.student.mvp.core.network

import edu.bnbu.student.mvp.core.network.v1.V1ApiRequest
import edu.bnbu.student.mvp.core.network.v1.V1ApiTransport
import edu.bnbu.student.mvp.core.network.v1.V1HttpMethod
import org.junit.Assert.assertEquals
import org.junit.Assert.assertThrows
import org.junit.Test

class StudentEndpointTest {
    @Test
    fun endpointContractsMatchAuthoritativeV1Routes() {
        val contracts = listOf(
            route("getLiveHealth", V1HttpMethod.GET, "health/live"),
            route("getReadyHealth", V1HttpMethod.GET, "health/ready"),
            route("getSystemMode", V1HttpMethod.GET, "system-mode"),
            route("requestStudentSignInCode", V1HttpMethod.POST, "auth/student-sign-in-codes"),
            route("getCurrentUser", V1HttpMethod.GET, "me"),
            route("listEnrollments", V1HttpMethod.GET, "enrollments"),
            route("getClassSection", V1HttpMethod.GET, "class-sections/section-1"),
            route("getCourse", V1HttpMethod.GET, "courses/course-1"),
            route("listExerciseRecords", V1HttpMethod.GET, "exercise-records"),
            route("createExerciseRecordDraft", V1HttpMethod.POST, "exercise-records"),
            route("updateExerciseRecordDraft", V1HttpMethod.PATCH, "exercise-records/record-1"),
            route("submitExerciseRecord", V1HttpMethod.POST, "exercise-records/record-1/submit"),
            route("listStudentScores", V1HttpMethod.GET, "student-scores"),
            route("listNotifications", V1HttpMethod.GET, "notifications"),
            route("markNotificationRead", V1HttpMethod.POST, "notifications/notice-1/read"),
            route("registerPushDevice", V1HttpMethod.POST, "push-devices"),
            route("unregisterPushDevice", V1HttpMethod.DELETE, "push-devices/device-1"),
            route("getCurrentUserPreferences", V1HttpMethod.GET, "me/preferences"),
            route("updateCurrentUserPreferences", V1HttpMethod.PATCH, "me/preferences"),
            route("listHelpArticles", V1HttpMethod.GET, "help-articles"),
            route("listFeedback", V1HttpMethod.GET, "feedback"),
            route("createFeedback", V1HttpMethod.POST, "feedback"),
            route("listExemptionApplications", V1HttpMethod.GET, "exemption-applications"),
            route("createExemptionApplication", V1HttpMethod.POST, "exemption-applications"),
            route("updateExemptionApplication", V1HttpMethod.PATCH, "exemption-applications/application-1"),
            route("submitExemptionApplication", V1HttpMethod.POST, "exemption-applications/application-1/submit"),
            route("initiateMediaUpload", V1HttpMethod.POST, "media-uploads"),
            route("confirmMediaUpload", V1HttpMethod.POST, "media-uploads/upload-1/confirm"),
            route("getAppReleasePolicy", V1HttpMethod.GET, "app-release-policy")
        )
        val transport = transport()

        contracts.forEach { contract ->
            val request = transport.buildRequest(
                V1ApiRequest(
                    operationId = contract.operationId,
                    method = contract.method,
                    relativePath = contract.path,
                    body = if (contract.method.isReadOnly) null else emptyMap<String, String>()
                )
            )
            assertEquals(contract.method.name, request.method)
            assertEquals("/api/v1/${contract.path}", request.url.encodedPath)
        }
    }

    @Test
    fun dynamicPathAndQueryValuesAreEncodedAsOpaqueValues() {
        val request = transport().buildRequest(
            V1ApiRequest(
                operationId = "getExerciseRecord",
                method = V1HttpMethod.GET,
                relativePath = "exercise-records/{recordId}",
                pathSegments = listOf("exercise-records", "record/a b"),
                query = mapOf("enrollmentId" to "enrollment/2026 fall")
            )
        )

        assertEquals(
            "https://api.example.test/api/v1/exercise-records/record%2Fa%20b?enrollmentId=enrollment%2F2026%20fall",
            request.url.toString()
        )
    }

    @Test
    fun legacyAbsoluteTraversalAndEmbeddedQueryPathsFailClosed() {
        listOf(
            "/student/profile",
            "https://legacy.example.test/student/profile",
            "../student/profile",
            "student/profile?scope=current"
        ).forEach { path ->
            assertThrows(IllegalArgumentException::class.java) {
                V1ApiRequest("legacyPath", V1HttpMethod.GET, path)
            }
        }
    }

    private fun route(operationId: String, method: V1HttpMethod, path: String) =
        RouteContract(operationId, method, path)

    private fun transport(): V1ApiTransport = V1ApiTransport(
        baseUrl = "https://api.example.test/api/v1",
        requestIdProvider = { "android-test" }
    )

    private data class RouteContract(
        val operationId: String,
        val method: V1HttpMethod,
        val path: String
    )
}
