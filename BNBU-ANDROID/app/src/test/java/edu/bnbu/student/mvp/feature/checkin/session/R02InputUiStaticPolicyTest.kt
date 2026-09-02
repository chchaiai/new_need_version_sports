package edu.bnbu.student.mvp.feature.checkin.session

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class R02InputUiStaticPolicyTest {
    private val projectRoot: File by lazy {
        val userDirectory = requireNotNull(System.getProperty("user.dir"))
        generateSequence(File(userDirectory).canonicalFile) { it.parentFile }
            .firstOrNull { File(it, "app/src/main/AndroidManifest.xml").isFile }
            ?: error("Android project root could not be located from $userDirectory")
    }

    @Test
    fun sharedFieldPublishesLabelValidationAndProgressSemantics() {
        val primitive = source(
            "app/src/main/java/edu/bnbu/student/mvp/core/designsystem/FormControls.kt"
        )

        listOf(
            "successText: String?",
            "loading: Boolean",
            "onFocusChanged: (Boolean) -> Unit",
            "contentDescription = label",
            "if (required) add",
            "if (readOnly) add",
            "if (loading) add",
            "if (errorText != null) add",
            "error(errorText)",
            "LiveRegionMode.Assertive",
            "LiveRegionMode.Polite",
            "clearAndSetSemantics",
            "enabled = enabled && !loading"
        ).forEach { token ->
            assertTrue("Shared field must include $token", primitive.contains(token))
        }
    }

    @Test
    fun helpSearchAndFeedbackCategoryExposeTheirControlContract() {
        val help = source(
            "app/src/main/java/edu/bnbu/student/mvp/feature/help/HelpCenterScreen.kt"
        )
        val feedback = source(
            "app/src/main/java/edu/bnbu/student/mvp/feature/feedback/FeedbackScreen.kt"
        )

        assertTrue(help.contains("BNBUFormField("))
        assertTrue(help.contains("testTag = \"help.search\""))
        assertTrue(help.contains("imeAction = ImeAction.Search"))
        assertFalse("Help search must not regress to an unlabeled raw field", help.contains("OutlinedTextField("))

        listOf(
            "ExposedDropdownMenuBox(",
            "mergeDescendants = true",
            "testTag(\"feedback.category\")",
            "Category (required)",
            "Expanded",
            "Collapsed"
        ).forEach { token ->
            assertTrue("Feedback category must include $token", feedback.contains(token))
        }
    }

    @Test
    fun emailLoginAndOtpFocusTheFirstInvalidField() = assertTouchedSubmitAndFirstInvalidFocus(
        name = "login and OTP",
        relativePath = "app/src/main/java/edu/bnbu/student/mvp/feature/login/EmailLoginScreen.kt",
        requiredTokens = listOf(
            "emailTouched",
            "sendAttempted",
            "emailFocusRequester.requestFocus()",
            "codeTouched",
            "signInAttempted",
            "codeFocusRequester.requestFocus()"
        )
    )

    @Test
    fun invitationCodeFocusesTheFirstInvalidField() = assertTouchedSubmitAndFirstInvalidFocus(
        name = "invitation code",
        relativePath = "app/src/main/java/edu/bnbu/student/mvp/feature/courses/EnterInviteCodeScreen.kt",
        requiredTokens = listOf("codeTouched", "submitAttempted", "codeFocusRequester.requestFocus()")
    )

    @Test
    fun checkInDescriptionFocusesTheFirstInvalidField() = assertTouchedSubmitAndFirstInvalidFocus(
        name = "check-in description",
        relativePath = "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseCheckInScreen.kt",
        requiredTokens = listOf(
            "descriptionTouched",
            "descriptionValidationRequested",
            "descriptionFocusRequester.requestFocus()"
        )
    )

    @Test
    fun checkInDescriptionUsesOneVisibleFieldLabel() {
        val checkIn = source(
            "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseCheckInScreen.kt"
        )

        assertFalse(
            "The description panel must not repeat the form field label",
            checkIn.contains("运动说明（必填）")
        )
        assertTrue(checkIn.contains("label = interfaceText(\"运动说明\", \"Exercise description\")"))
        assertTrue(checkIn.contains("请简要说明本次完成的运动内容 · 1～"))
    }

    @Test
    fun exemptionFocusesTheFirstInvalidField() = assertTouchedSubmitAndFirstInvalidFocus(
        name = "exemption",
        relativePath = "app/src/main/java/edu/bnbu/student/mvp/feature/exemption/ExemptionScreen.kt",
        requiredTokens = listOf(
            "organizationTouched",
            "reasonTouched",
            "submitAttempted",
            "organizationFocusRequester.requestFocus()",
            "reasonFocusRequester.requestFocus()"
        )
    )

    @Test
    fun feedbackFocusesTheFirstInvalidField() = assertTouchedSubmitAndFirstInvalidFocus(
        name = "feedback",
        relativePath = "app/src/main/java/edu/bnbu/student/mvp/feature/feedback/FeedbackScreen.kt",
        requiredTokens = listOf(
            "descriptionTouched",
            "submitAttempted",
            "descriptionFocusRequester.requestFocus()"
        )
    )

    @Test
    fun accountDeletionOtpFocusesTheFirstInvalidField() = assertTouchedSubmitAndFirstInvalidFocus(
        name = "account deletion OTP",
        relativePath = "app/src/main/java/edu/bnbu/student/mvp/feature/profile/AccountDeletionScreen.kt",
        requiredTokens = listOf(
            "verificationCodeTouched",
            "finalReviewAttempted",
            "verificationCodeFocusRequester.requestFocus()"
        )
    )

    @Test
    fun priorityPageInventoryKeepsSharedFieldsAndStableTestTags() {
        val fieldsByPage = mapOf(
            "app/src/main/java/edu/bnbu/student/mvp/feature/login/EmailLoginScreen.kt" to
                listOf("emailLogin.email", "emailLogin.code"),
            "app/src/main/java/edu/bnbu/student/mvp/feature/login/ContactBindingScreen.kt" to
                listOf("emailSecurity.newEmail", "emailSecurity.newCode"),
            "app/src/main/java/edu/bnbu/student/mvp/feature/courses/EnterInviteCodeScreen.kt" to
                listOf("courseJoin.enterCode.input"),
            "app/src/main/java/edu/bnbu/student/mvp/feature/courses/CourseJoinConfirmScreen.kt" to
                listOf("courseJoinConfirm.studentNumber"),
            "app/src/main/java/edu/bnbu/student/mvp/feature/courses/ScanJoinScreen.kt" to
                listOf("courseJoin.scan.inviteCode"),
            "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseCheckInScreen.kt" to
                listOf("checkIn.exerciseDescription"),
            "app/src/main/java/edu/bnbu/student/mvp/feature/exemption/ExemptionScreen.kt" to
                listOf("exemption.reason"),
            "app/src/main/java/edu/bnbu/student/mvp/feature/feedback/FeedbackScreen.kt" to
                listOf("feedback.description"),
            "app/src/main/java/edu/bnbu/student/mvp/feature/help/HelpCenterScreen.kt" to
                listOf("help.search"),
            "app/src/main/java/edu/bnbu/student/mvp/feature/profile/AccountDeletionScreen.kt" to
                listOf("accountDeletion.verificationCode")
        )

        fieldsByPage.forEach { (relativePath, testTags) ->
            val content = source(relativePath)
            assertTrue("$relativePath must use BNBUFormField", content.contains("BNBUFormField("))
            testTags.forEach { testTag ->
                assertTrue("$relativePath must keep test tag $testTag", content.contains(testTag))
            }
        }
    }

    private fun source(relativePath: String): String =
        File(projectRoot, relativePath).also {
            require(it.isFile) { "Required project file is missing: ${it.absolutePath}" }
        }.readText()

    private fun assertTouchedSubmitAndFirstInvalidFocus(
        name: String,
        relativePath: String,
        requiredTokens: List<String>
    ) {
        val content = source(relativePath)
        assertTrue("$name must use BNBUFormField", content.contains("BNBUFormField("))
        requiredTokens.forEach { token ->
            assertTrue("$name must include $token", content.contains(token))
        }
    }
}
