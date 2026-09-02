package edu.bnbu.student.mvp.phase5ga

import com.google.gson.JsonArray
import com.google.gson.JsonObject
import com.google.gson.JsonParser
import edu.bnbu.student.mvp.core.network.v1.V1Json
import edu.bnbu.student.mvp.phase5ga.generated.ApplicationType
import edu.bnbu.student.mvp.phase5ga.generated.CertificationDetails
import edu.bnbu.student.mvp.phase5ga.generated.CertificationKind
import edu.bnbu.student.mvp.phase5ga.generated.CreateCertificationApplicationRequest
import edu.bnbu.student.mvp.phase5ga.generated.PasswordChangeRequest
import edu.bnbu.student.mvp.phase5ga.generated.PasswordResetRequest
import edu.bnbu.student.mvp.phase5ga.generated.StudentApplication
import edu.bnbu.student.mvp.phase5ga.generated.StudentApplicationPage
import edu.bnbu.student.mvp.phase5ga.generated.UpdateSubAdminRequest
import java.io.File
import java.security.MessageDigest
import java.time.LocalDate
import java.util.UUID
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class Phase5gaCertificationContractRevalidationTest {
    @Test
    fun bindingVersionShaEnumAndAffectedOperationSurfaceAreExact() {
        val bytes = phase5gaContract.readBytes()
        val actualSha = MessageDigest.getInstance("SHA-256")
            .digest(bytes)
            .joinToString("") { byte ->
                (byte.toInt() and 0xff).toString(16).padStart(2, '0')
            }
        val contract = bytes.toString(Charsets.UTF_8)
        val metadata = phase5gaMetadata.readText(Charsets.UTF_8)

        assertEquals(CONTRACT_SHA, actualSha)
        assertTrue(contract.contains("  version: $CONTRACT_VERSION\n"))
        assertTrue(contract.contains("  x-contract-status: $CONTRACT_STATUS\n"))
        assertTrue(metadata.contains("\"contractVersion\": \"$CONTRACT_VERSION\""))
        assertTrue(metadata.contains("\"contractStatus\": \"$CONTRACT_STATUS\""))
        assertTrue(metadata.contains("\"openapiSha256\": \"$CONTRACT_SHA\""))
        assertEquals(
            listOf("SCHOOL_TEAM", "STUDENT_CLUB"),
            CertificationKind.entries.map(CertificationKind::value)
        )

        val operationIds = Regex("(?m)^\\s+operationId:\\s+(\\S+)\\s*$")
            .findAll(contract)
            .map { it.groupValues[1] }
            .toList()
        val requestSurface = operationIds.filter { operationId ->
            operationBlock(contract, operationId)
                .contains("#/components/schemas/CreateStudentApplicationRequest")
        }
        val responseSurface = operationIds.filter { operationId ->
            operationBlock(contract, operationId)
                .contains("#/components/schemas/StudentApplication")
        }.toSet()

        assertEquals(listOf("createStudentApplication"), requestSurface)
        assertEquals(RESPONSE_OPERATIONS.keys, responseSurface)
        RESPONSE_OPERATIONS.forEach { (operationId, expectedShape) ->
            val block = operationBlock(contract, operationId)
            assertTrue(
                "$operationId must return $expectedShape",
                block.contains("#/components/schemas/$expectedShape")
            )
        }
    }

    @Test
    fun bothCertificationKindsSurviveRequestSerializationAndSevenResponseSurfaces() {
        CertificationKind.entries.forEach { kind ->
            val constructedRequest = CreateCertificationApplicationRequest(
                applicationType = CreateCertificationApplicationRequest.ApplicationType.CERTIFICATION,
                courseId = COURSE_ID,
                certification = CertificationDetails(
                    certificationKind = kind,
                    organizationOrTeamName = "BNBU Example Organization",
                    validFrom = LocalDate.parse("2026-09-01"),
                    validTo = LocalDate.parse("2027-08-31")
                ),
                evidenceAssetIds = listOf(EVIDENCE_ID)
            )

            val requestJson = V1Json.gson.toJsonTree(constructedRequest).asJsonObject
            val generatedRequest = V1Json.gson.fromJson(
                validateCertificationRequestSchema(requestJson),
                CreateCertificationApplicationRequest::class.java
            )
            val serializedAgain = V1Json.gson.toJsonTree(generatedRequest).asJsonObject
            validateCertificationRequestSchema(serializedAgain)

            assertEquals("CERTIFICATION", serializedAgain.get("applicationType").asString)
            assertEquals(kind.value, serializedAgain.certification().get("certificationKind").asString)
            assertEquals(kind, generatedRequest.certification.certificationKind)

            val responseJson = certificationResponseFixture(kind.value)
            assertEquals(serializedAgain.certification(), responseJson.certification())

            RESPONSE_OPERATIONS.forEach { (operationId, shape) ->
                val generatedResponse = decodeResponseSurface(operationId, shape, responseJson)
                val validationModel = generatedResponse.toValidationModel()
                assertEquals(kind.toValidationKind(), validationModel.kind)
                assertEquals("BNBU Example Organization", validationModel.organizationOrTeamName)
            }
        }
    }

    @Test
    fun allSevenIllegalCertificationFixturesFailClosedForRequestAndResponse() {
        val invalidRequests = invalidRequestFixtures()
        val invalidResponses = invalidResponseFixtures()

        assertEquals(INVALID_FIXTURE_LABELS, invalidRequests.keys)
        assertEquals(INVALID_FIXTURE_LABELS, invalidResponses.keys)
        invalidRequests.forEach { (label, fixture) ->
            assertTrue(
                "Request fixture must be rejected: $label",
                runCatching {
                    val validated = validateCertificationRequestSchema(fixture)
                    V1Json.gson.fromJson(
                        validated,
                        CreateCertificationApplicationRequest::class.java
                    )
                }.isFailure
            )
        }
        invalidResponses.forEach { (label, fixture) ->
            assertTrue(
                "Response fixture must be rejected: $label",
                runCatching {
                    val validated = validateCertificationResponseSchema(fixture)
                    V1Json.gson.fromJson(validated, StudentApplication::class.java)
                        .toValidationModel()
                }.isFailure
            )
        }
    }

    @Test
    fun sharedPasswordSchemasGenerateWithoutAddingAnAndroidPasswordProductFlow() {
        assertEquals(
            setOf("currentPassword", "newPassword", "expectedVersion"),
            PasswordChangeRequest::class.java.contractFieldNames()
        )
        assertEquals(
            setOf("otpProof", "newPassword"),
            PasswordResetRequest::class.java.contractFieldNames()
        )
        val updateSubAdminFields = UpdateSubAdminRequest::class.java.contractFieldNames()
        assertFalse(updateSubAdminFields.contains("newPassword"))
        assertFalse(updateSubAdminFields.contains("confirmNewPassword"))
    }

    private fun decodeResponseSurface(
        operationId: String,
        shape: String,
        responseJson: JsonObject
    ): StudentApplication {
        validateCertificationResponseSchema(responseJson)
        return when (shape) {
            "StudentApplication" -> V1Json.gson.fromJson(
                responseJson,
                StudentApplication::class.java
            )
            "StudentApplicationPage" -> {
                val pageJson = JsonObject().apply {
                    add("items", JsonArray().apply { add(responseJson.deepCopy()) })
                    add(
                        "page",
                        JsonObject().apply {
                            add("nextCursor", null)
                            addProperty("hasMore", false)
                            addProperty("limit", 20)
                        }
                    )
                }
                val page = V1Json.gson.fromJson(pageJson, StudentApplicationPage::class.java)
                require(page.items.size == 1) { "$operationId must preserve its single fixture item." }
                page.items.single()
            }
            else -> error("Unsupported Phase 5G-A response shape: $shape")
        }
    }

    private fun validateCertificationRequestSchema(root: JsonObject): JsonObject {
        strictObject(root, REQUEST_KEYS)
        require(root.get("applicationType").isJsonPrimitive)
        require(root.get("applicationType").asString == "CERTIFICATION")
        UUID.fromString(root.get("courseId").asString)
        val evidence = root.getAsJsonArray("evidenceAssetIds")
        require(evidence.size() in 1..3)
        evidence.forEach { UUID.fromString(it.asString) }
        validateCertificationDetails(root.get("certification"))
        return root
    }

    private fun validateCertificationResponseSchema(root: JsonObject): JsonObject {
        strictObject(root, RESPONSE_KEYS)
        require(root.get("applicationType").isJsonPrimitive)
        require(root.get("applicationType").asString == "CERTIFICATION")
        validateCertificationDetails(root.get("certification"))
        return root
    }

    private fun validateCertificationDetails(element: com.google.gson.JsonElement) {
        require(element.isJsonObject) {
            "CERTIFICATION requires a non-null CertificationDetails object."
        }
        val details = strictObject(element.asJsonObject, CERTIFICATION_KEYS)
        val kind = details.get("certificationKind")
        require(kind.isJsonPrimitive && kind.asJsonPrimitive.isString)
        require(kind.asString in CERTIFICATION_KIND_VALUES) {
            "certificationKind must be a member of the closed Contract enum."
        }
        require(details.get("organizationOrTeamName").asString.isNotBlank())
        val validFrom = LocalDate.parse(details.get("validFrom").asString)
        val validTo = LocalDate.parse(details.get("validTo").asString)
        require(!validTo.isBefore(validFrom))
    }

    private fun strictObject(value: JsonObject, expectedKeys: Set<String>): JsonObject {
        require(value.keySet() == expectedKeys) {
            "Fixture fields differ from the locked Contract: expected=$expectedKeys actual=${value.keySet()}"
        }
        return value
    }

    private fun StudentApplication.toValidationModel(): CertificationValidationModel {
        require(applicationType == ApplicationType.CERTIFICATION)
        val details = requireNotNull(certification) {
            "CERTIFICATION response must contain CertificationDetails."
        }
        return CertificationValidationModel(
            kind = details.certificationKind.toValidationKind(),
            organizationOrTeamName = details.organizationOrTeamName,
            validFrom = details.validFrom,
            validTo = details.validTo
        )
    }

    private fun CertificationKind.toValidationKind(): ValidationCertificationKind = when (this) {
        CertificationKind.SCHOOL_TEAM -> ValidationCertificationKind.SCHOOL_TEAM
        CertificationKind.STUDENT_CLUB -> ValidationCertificationKind.STUDENT_CLUB
    }

    private fun JsonObject.certification(): JsonObject = getAsJsonObject("certification")

    private fun Class<*>.contractFieldNames(): Set<String> = declaredFields
        .asSequence()
        .filterNot { it.isSynthetic || it.name == "\$stable" }
        .map { it.name }
        .toSet()

    private fun operationBlock(contract: String, operationId: String): String {
        val operationIndex = contract.indexOf("operationId: $operationId")
        require(operationIndex >= 0) { "Missing operationId $operationId" }
        val nextOperation = contract.indexOf("operationId: ", operationIndex + 1)
        val components = contract.indexOf("\ncomponents:", operationIndex + 1)
        val end = listOf(nextOperation, components)
            .filter { it >= 0 }
            .minOrNull()
            ?: contract.length
        return contract.substring(operationIndex, end)
    }

    private fun invalidRequestFixtures(): Map<String, JsonObject> {
        val base = requestFixture("SCHOOL_TEAM")
        return linkedMapOf(
            "missing certificationKind" to base.deepCopy().apply {
                certification().remove("certificationKind")
            },
            "null certificationKind" to base.deepCopy().apply {
                certification().add("certificationKind", null)
            },
            "unknown enum" to base.deepCopy().apply {
                certification().addProperty("certificationKind", "UNKNOWN")
            },
            "arbitrary String" to base.deepCopy().apply {
                certification().addProperty("certificationKind", "football team")
            },
            "private subtype replacement" to base.deepCopy().apply {
                certification().remove("certificationKind")
                certification().addProperty("applicationSubtype", "SCHOOL_TEAM")
            },
            "CERTIFICATION without CertificationDetails" to base.deepCopy().apply {
                remove("certification")
            },
            "extra private field" to base.deepCopy().apply {
                addProperty("clientPrivateCertificationCode", "SCHOOL_TEAM")
            }
        )
    }

    private fun invalidResponseFixtures(): Map<String, JsonObject> {
        val base = certificationResponseFixture("SCHOOL_TEAM")
        return linkedMapOf(
            "missing certificationKind" to base.deepCopy().apply {
                certification().remove("certificationKind")
            },
            "null certificationKind" to base.deepCopy().apply {
                certification().add("certificationKind", null)
            },
            "unknown enum" to base.deepCopy().apply {
                certification().addProperty("certificationKind", "UNKNOWN")
            },
            "arbitrary String" to base.deepCopy().apply {
                certification().addProperty("certificationKind", "football team")
            },
            "private subtype replacement" to base.deepCopy().apply {
                certification().remove("certificationKind")
                certification().addProperty("applicationSubtype", "SCHOOL_TEAM")
            },
            "CERTIFICATION without CertificationDetails" to base.deepCopy().apply {
                remove("certification")
            },
            "extra private field" to base.deepCopy().apply {
                addProperty("clientPrivateCertificationCode", "SCHOOL_TEAM")
            }
        )
    }

    private fun requestFixture(kind: String): JsonObject = JsonParser.parseString(
        """
            {
              "applicationType": "CERTIFICATION",
              "courseId": "$COURSE_ID",
              "certification": {
                "certificationKind": "$kind",
                "organizationOrTeamName": "BNBU Example Organization",
                "validFrom": "2026-09-01",
                "validTo": "2027-08-31"
              },
              "evidenceAssetIds": ["$EVIDENCE_ID"]
            }
        """.trimIndent()
    ).asJsonObject

    private fun certificationResponseFixture(kind: String): JsonObject = JsonParser.parseString(
        """
            {
              "applicationId": "00000000-0000-4000-8000-000000000003",
              "applicationNumber": "CERT-2026-0001",
              "applicationType": "CERTIFICATION",
              "courseId": "$COURSE_ID",
              "enrollmentId": "00000000-0000-4000-8000-000000000004",
              "student": {
                "studentId": "00000000-0000-4000-8000-000000000005",
                "studentNumber": "20260001",
                "name": "Contract Fixture Student",
                "gender": "FEMALE",
                "gradeYear": 1,
                "college": null,
                "major": null,
                "administrativeClass": null,
                "studentStatus": "ACTIVE"
              },
              "status": "SUBMITTED",
              "certification": {
                "certificationKind": "$kind",
                "organizationOrTeamName": "BNBU Example Organization",
                "validFrom": "2026-09-01",
                "validTo": "2027-08-31"
              },
              "evidence": [
                {
                  "mediaAssetId": "$EVIDENCE_ID",
                  "purpose": "APPLICATION_EVIDENCE",
                  "mediaKind": "IMAGE",
                  "contentType": "image/jpeg",
                  "byteSize": 1024,
                  "checksumSha256": "${"0".repeat(64)}",
                  "durationMilliseconds": null,
                  "hasAudio": null,
                  "widthPixels": 100,
                  "heightPixels": 100,
                  "status": "BOUND",
                  "rejectionCode": null,
                  "version": 1
                }
              ],
              "decisions": [],
              "certificationCredit": null,
              "submittedAt": "2026-09-01T00:00:00Z",
              "updatedAt": "2026-09-01T00:00:00Z",
              "version": 1
            }
        """.trimIndent()
    ).asJsonObject

    private val androidRoot: File by lazy {
        val userDirectory = requireNotNull(System.getProperty("user.dir"))
        generateSequence(File(userDirectory).canonicalFile) { it.parentFile }
            .firstOrNull { File(it, "app/src/main/AndroidManifest.xml").isFile }
            ?: error("Android project root could not be located from $userDirectory")
    }

    private val phase5gaContract: File by lazy {
        File(requireNotNull(androidRoot.parentFile), "contracts/openapi.yaml").also {
            require(it.isFile) { "Phase 5G-A contract is missing: ${it.absolutePath}" }
        }
    }

    private val phase5gaMetadata: File by lazy {
        File(requireNotNull(androidRoot.parentFile), "contracts/contract-metadata.json").also {
            require(it.isFile) { "Phase 5G-A metadata is missing: ${it.absolutePath}" }
        }
    }

    private data class CertificationValidationModel(
        val kind: ValidationCertificationKind,
        val organizationOrTeamName: String,
        val validFrom: LocalDate,
        val validTo: LocalDate
    )

    private enum class ValidationCertificationKind {
        SCHOOL_TEAM,
        STUDENT_CLUB
    }

    private companion object {
        const val CONTRACT_VERSION = "1.2.0-contract"
        const val CONTRACT_STATUS = "RC"
        const val CONTRACT_SHA = "667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a"

        val COURSE_ID: UUID = UUID.fromString("00000000-0000-4000-8000-000000000001")
        val EVIDENCE_ID: UUID = UUID.fromString("00000000-0000-4000-8000-000000000002")

        val CERTIFICATION_KIND_VALUES = setOf("SCHOOL_TEAM", "STUDENT_CLUB")
        val REQUEST_KEYS = setOf(
            "applicationType",
            "courseId",
            "certification",
            "evidenceAssetIds"
        )
        val CERTIFICATION_KEYS = setOf(
            "certificationKind",
            "organizationOrTeamName",
            "validFrom",
            "validTo"
        )
        val RESPONSE_KEYS = setOf(
            "applicationId",
            "applicationNumber",
            "applicationType",
            "courseId",
            "enrollmentId",
            "student",
            "status",
            "certification",
            "evidence",
            "decisions",
            "certificationCredit",
            "submittedAt",
            "updatedAt",
            "version"
        )
        val RESPONSE_OPERATIONS = linkedMapOf(
            "createStudentApplication" to "StudentApplication",
            "supplementStudentApplication" to "StudentApplication",
            "listOwnApplications" to "StudentApplicationPage",
            "getOwnApplication" to "StudentApplication",
            "listCourseApplications" to "StudentApplicationPage",
            "getCourseApplication" to "StudentApplication",
            "decideStudentApplication" to "StudentApplication"
        )
        val INVALID_FIXTURE_LABELS = linkedSetOf(
            "missing certificationKind",
            "null certificationKind",
            "unknown enum",
            "arbitrary String",
            "private subtype replacement",
            "CERTIFICATION without CertificationDetails",
            "extra private field"
        )
    }
}
