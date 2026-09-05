package edu.bnbu.student.mvp.feature.checkin.session

import java.io.File
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class AcceptedContractStaticPolicyTest {
    private val projectRoot: File by lazy {
        val userDirectory = requireNotNull(System.getProperty("user.dir"))
        generateSequence(File(userDirectory).canonicalFile) { it.parentFile }
            .firstOrNull { File(it, "app/src/main/AndroidManifest.xml").isFile }
            ?: error("Android project root could not be located from $userDirectory")
    }

    @Test
    fun acceptedAdr103ForbidsAndroidLocationPermissionAndCollection() {
        val manifest = projectFile("app/src/main/AndroidManifest.xml").readText()
        assertFalse(manifest.contains("android.permission.ACCESS_FINE_LOCATION"))
        assertFalse(manifest.contains("android.permission.ACCESS_COARSE_LOCATION"))

        val buildScript = projectFile("app/build.gradle.kts").readText()
        assertFalse(buildScript.contains("play-services-location"))

        val checkInSource = projectFile("app/src/main/java/edu/bnbu/student/mvp/feature/checkin")
            .walkTopDown()
            .filter { it.isFile && it.extension == "kt" }
            .joinToString("\n") { it.readText() }
        listOf(
            "ACCESS_FINE_LOCATION",
            "ACCESS_COARSE_LOCATION",
            "LocationServices",
            "getFusedLocationProviderClient",
            "LocationStatus",
            "requestLocation(",
            "定位状态",
            "Location status"
        ).forEach { forbidden ->
            assertFalse("Check-in source must not contain $forbidden", checkInSource.contains(forbidden))
        }

        val chinesePolicy = projectFile("app/src/main/assets/privacy_policy_zh_cn.md").readText()
        val englishPolicy = projectFile("app/src/main/assets/privacy_policy_en.md").readText()
        assertTrue(chinesePolicy.contains("当前版本不声明或申请精确、大致或后台定位权限"))
        assertTrue(englishPolicy.contains("does not request location permission"))
    }

    @Test
    fun productionEmailFieldsUseNeutralGuidanceInsteadOfExampleDomains() {
        val sources = listOf(
            "app/src/main/java/edu/bnbu/student/mvp/feature/login/EmailLoginScreen.kt",
            "app/src/main/java/edu/bnbu/student/mvp/feature/login/ContactBindingScreen.kt"
        ).map(::projectFile).joinToString("\n") { it.readText() }

        assertFalse(sources.contains("example.", ignoreCase = true))
        assertFalse(sources.contains("school.edu", ignoreCase = true))
        assertTrue(sources.contains("请输入学校登记邮箱"))
        assertTrue(sources.contains("Enter the email registered with your school"))
    }

    @Test
    fun profileRemovesEnduranceConversionButKeepsRawFactsAndPublicStudentNumberSeparate() {
        val profile = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/profile/ProfileScreen.kt"
        ).readText()
        val account = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/profile/AccountDetailsScreen.kt"
        ).readText()
        val dashboard = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/dashboard/DashboardScreen.kt"
        ).readText()
        val labels = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/core/model/ServerDisplayLabels.kt"
        ).readText()
        val appRoot = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/shell/AppRootScreen.kt"
        ).readText()
        val recordsAndProgress = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/grades/GradesScreen.kt"
        ).readText()
        val rawEndurance = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/grades/RawEnduranceResult.kt"
        ).readText()

        assertFalse(profile.contains("profile_endurance"))
        assertFalse(profile.contains("onOpenEnduranceScoring"))
        assertFalse(appRoot.contains("SubScreen.EnduranceScoring"))
        assertFalse(appRoot.contains("EnduranceScoringScreen("))
        assertTrue(recordsAndProgress.contains("RawEnduranceResultCard("))
        assertTrue(rawEndurance.contains("RawEnduranceResultCard("))
        assertTrue(recordsAndProgress.contains("enduranceRunTimeSeconds"))
        assertFalse(recordsAndProgress.contains("enduranceRunScore"))
        assertTrue(profile.contains("student.studentNumberForDisplay()"))
        assertTrue(account.contains("student.studentNumberForDisplay()"))
        assertTrue(dashboard.contains("studentNumberForDisplay()"))
        assertTrue(labels.contains("!it.equals(id.trim(), ignoreCase = true)"))
        assertTrue(labels.contains("UUID_LIKE_VALUE"))
        assertTrue(profile.contains("maxLines = 2"))
    }

    @Test
    fun semesterUiUsesPublicLabelsAndWrapsWithoutInternalIdFallback() {
        val repository = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/core/data/ApiStudentRepository.kt"
        ).readText()
        val courses = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/courses/CoursesScreen.kt"
        ).readText()

        assertTrue(repository.contains("semester = contractSemester?.displayName.orEmpty()"))
        assertFalse(repository.contains("semester = contractSemester?.displayName ?: section.semesterId"))
        assertTrue(courses.contains("course.safeSemesterDisplayLabel()"))
        assertTrue(courses.contains("return safeSemesterYearTermLabel()"))
        assertTrue(courses.contains("value.equals(internalSemesterId.trim(), ignoreCase = true)"))
        assertTrue(courses.contains("UUID_LIKE_SEMESTER_VALUE"))
        assertTrue(courses.contains("maxLines = 3"))
    }

    @Test
    fun studentCourseUiUsesCourseNameWithoutCourseCodeOrSectionNumber() {
        val models = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/core/model/StudentModels.kt"
        ).readText()
        val courses = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/courses/CoursesScreen.kt"
        ).readText()
        val checkIn = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseCheckInScreen.kt"
        ).readText()
        val joinConfirm = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/courses/CourseJoinConfirmScreen.kt"
        ).readText()

        assertFalse(models.contains("val displayTitle: String"))
        assertFalse(models.contains("val code: String"))
        assertFalse(models.contains("val section: String"))
        assertFalse(courses.contains("course.displayTitle"))
        assertFalse(courses.contains("CourseFact(interfaceText(\"课程代码\""))
        assertFalse(courses.contains("CourseFact(interfaceText(\"教学班\""))
        assertTrue(checkIn.contains("currentCourseName = currentCourse?.name"))
        assertFalse(joinConfirm.contains("val courseNumber: String"))
        assertFalse(joinConfirm.contains("val section: String"))
        assertFalse(joinConfirm.contains("text = \"\${course.courseNumber} · \${course.section}\""))
    }

    @Test
    fun studentCourseDetailsDoNotRenderExerciseRecords() {
        val courses = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/courses/CoursesScreen.kt"
        ).readText()
        val state = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/core/state/StudentAppState.kt"
        ).readText()

        assertFalse(courses.contains("appState.recordsFor(course)"))
        assertFalse(courses.contains("RecordCard("))
        assertFalse(courses.contains("相关记录"))
        assertFalse(courses.contains("暂无相关记录"))
        assertFalse(courses.contains("历史课程记录仅供查看"))
        assertFalse(state.contains("fun recordsFor(course: Course)"))
    }

    @Test
    fun remoteBusinessDateAndStudentScoreStayBackendAuthoritative() {
        val state = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/core/state/StudentAppState.kt"
        ).readText()
        val checkIn = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseCheckInScreen.kt"
        ).readText()
        val repository = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/core/data/ApiStudentRepository.kt"
        ).readText()

        assertTrue(checkIn.contains("!appState.isV1ContractBacked && appState.hasSubmittedCheckInToday"))
        assertTrue(state.contains("if (!isV1ContractBacked && hasSubmittedCheckInToday())"))
        assertTrue(state.contains("response.creditedDurationSeconds / 3600.0"))
        assertTrue(state.contains("businessDate = response.businessDate"))
        assertTrue(state.contains("status = SyncOperationStatus.Queued"))
        assertFalse(state.contains("progress = workspace.progress.withRecordedCheckIn"))
        assertTrue(repository.contains("validCurrentRecords"))
        assertTrue(repository.contains(".sumOf { it.creditedDurationSeconds }"))
        assertTrue(repository.contains("selectCurrentEnrollmentId("))
        assertTrue(repository.contains("record.currentReview?.result?.value == \"VALID\""))
    }

    @Test
    fun legacyDurationShortcutsRemainInCoreButAreNotReachableFromTheV8Ui() {
        val controller = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/session/ExerciseSessionController.kt"
        ).readText()
        val screen = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseCheckInScreen.kt"
        ).readText()
        val gateway = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/core/network/v1/V1ExerciseSessionGateway.kt"
        ).readText()
        assertFalse(controller.contains("debugAddActiveDuration"))
        assertFalse(controller.contains("startedAtEpochMillis - durationMillis"))
        assertTrue(controller.contains("advanceLocalReviewToTwoHours(isLocalReviewMode: Boolean)"))
        assertTrue(controller.contains("!isLocalReviewMode || serverCoordinator != null"))
        assertFalse(screen.contains("isLocalReviewMode = appState.isLocalReviewMode"))
        assertFalse(screen.contains("exercise.localReview.twoHours"))
        assertFalse(screen.contains("直达 2 小时"))
        assertFalse(screen.contains("仅用于免登录测试"))
        assertTrue(controller.contains("coordinator.addSixtyMinutes()"))
        assertFalse(screen.contains("if (controller.isTestDurationToolVisible)"))
        assertFalse(screen.contains("controller::addSixtyMinutes"))
        assertFalse(screen.contains("增加 60 分钟"))
        assertTrue(gateway.contains("control(\"addSixtyMinutesToExerciseSession\", \"add-sixty-minutes\", current)"))
        assertTrue(gateway.contains("addSixtyMinutesToExerciseSession"))
    }

    @Test
    fun acceptedCaptureCanBePreviewedAndDeletedBeforeFormalSubmission() {
        val screen = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseCheckInScreen.kt"
        ).readText()
        val manager = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/SessionMediaManager.kt"
        ).readText()
        val controller = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/session/ExerciseSessionController.kt"
        ).readText()
        val store = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/session/SessionMediaDraftStore.kt"
        ).readText()

        assertFalse(screen.contains("RetainCapturedMediaDialog("))
        assertFalse(screen.contains("photoAwaitingRetentionConfirmation"))
        assertFalse(screen.contains("确认保留这项现场素材？"))
        assertTrue(screen.contains("controller.completeCapture(target, success = true)"))
        assertTrue(screen.contains("controller.completeCapture(target, success = false)"))
        assertTrue(manager.contains("RetainedPhotoPreviewDialog("))
        assertTrue(manager.contains("RetainedVideoPreviewDialog("))
        assertTrue(manager.contains("controller.removeDraft(draftId)"))
        assertTrue(manager.contains("删除这项凭证？"))
        listOf(
            "controller.prepareReplacementCapture(",
            "controller.savePhotoEdit(",
            "controller.trimVideo(",
            "controller.setVideoCover(",
            "controller.reorderPhotos("
        ).forEach { forbidden -> assertFalse(manager.contains(forbidden)) }
        listOf(
            "fun prepareReplacementCapture(",
            "fun savePhotoEdit(",
            "fun trimVideo(",
            "fun setVideoCover(",
            "fun reorderPhotos("
        ).forEach { forbidden -> assertFalse(controller.contains(forbidden)) }
        assertTrue(controller.contains("fun removeDraft("))
        assertTrue(controller.contains("mediaStore.remove(key, draftId)"))
        assertTrue(controller.contains("if (draft.serverMediaId != null)"))
        assertTrue(controller.contains("val readyDrafts = validateReadyProofs().getOrElse"))
        assertTrue(controller.contains("for (draft in readyDrafts)"))
        assertTrue(controller.contains("if (!success)"))
        assertTrue(controller.contains("mediaStore.cancelCapture(target)"))
        assertTrue(controller.contains("return@launch"))
        assertTrue(store.contains("Only completeCapture(success = true)"))
        assertTrue(store.contains("if (draft.serverMediaId != null) return false"))
        assertTrue(store.contains("it.status == SessionMediaDraftStatus.Ready"))
    }

    @Test
    fun remoteFailuresUseStructuredSafeErrorsInsteadOfRawMessages() {
        val mapper = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/core/UserFacingError.kt"
        ).readText()
        val panel = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/core/designsystem/BNBUErrorPanel.kt"
        ).readText()
        val remoteScreens = listOf(
            "app/src/main/java/edu/bnbu/student/mvp/feature/login/EmailLoginScreen.kt",
            "app/src/main/java/edu/bnbu/student/mvp/feature/login/ContactBindingScreen.kt",
            "app/src/main/java/edu/bnbu/student/mvp/feature/courses/ScanJoinScreen.kt",
            "app/src/main/java/edu/bnbu/student/mvp/feature/courses/CourseJoinConfirmScreen.kt",
            "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseCheckInScreen.kt",
            "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/CheckInRecords.kt",
            "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/session/ExerciseSessionController.kt",
            "app/src/main/java/edu/bnbu/student/mvp/feature/exemption/ExemptionScreen.kt"
        ).map(::projectFile).joinToString("\n") { it.readText() }

        assertTrue(mapper.contains("^[A-Z][A-Z0-9_]{0,79}$"))
        assertTrue(mapper.contains("^[A-Za-z0-9._:-]{1,64}$"))
        assertTrue(mapper.contains("SafeErrorDetails"))
        assertTrue(mapper.contains("SafeClientLogger"))
        assertFalse(mapper.contains("error.serverMessage"))
        assertFalse(mapper.contains("localizedMessage"))
        assertTrue(panel.contains("error: UserFacingError"))
        assertTrue(panel.contains("error.action"))
        assertTrue(panel.contains("error.requestId"))
        assertTrue(remoteScreens.contains("ClientErrorMapper.map("))
        assertTrue(remoteScreens.contains("BNBUErrorPanel("))
        assertFalse(remoteScreens.contains(" + (e.message ?: \"\")"))
        assertFalse(remoteScreens.contains("return error.message"))
    }

    @Test
    fun highFrequencyFormsUseTheSharedAccessibleFieldPrimitive() {
        val primitive = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/core/designsystem/FormControls.kt"
        ).readText()
        val highFrequencyForms = listOf(
            "app/src/main/java/edu/bnbu/student/mvp/feature/login/EmailLoginScreen.kt",
            "app/src/main/java/edu/bnbu/student/mvp/feature/courses/CourseJoinConfirmScreen.kt",
            "app/src/main/java/edu/bnbu/student/mvp/feature/courses/EnterInviteCodeScreen.kt",
            "app/src/main/java/edu/bnbu/student/mvp/feature/courses/ScanJoinScreen.kt",
            "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseCheckInScreen.kt",
            "app/src/main/java/edu/bnbu/student/mvp/feature/exemption/ExemptionScreen.kt",
            "app/src/main/java/edu/bnbu/student/mvp/feature/feedback/FeedbackScreen.kt"
        ).map(::projectFile)

        listOf(
            "errorText: String?",
            "required: Boolean",
            "enabled: Boolean",
            "readOnly: Boolean",
            "counter: Pair<Int, Int>?",
            "keyboardOptions: KeyboardOptions",
            "isSecure: Boolean",
            "collectIsFocusedAsState",
            "PasswordVisualTransformation",
            "显示密码",
            "隐藏密码"
        ).forEach { expected -> assertTrue(primitive.contains(expected)) }
        highFrequencyForms.forEach { source ->
            assertTrue("${source.name} must use BNBUFormField", source.readText().contains("BNBUFormField("))
        }
    }

    @Test
    fun oldResubmissionApiRemainsInCoreButIsNotPresentedAsTheV8SupplementFlow() {
        val gateway = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/core/network/v1/V1ExerciseSessionGateway.kt"
        ).readText()
        val repository = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/core/data/ApiStudentRepository.kt"
        ).readText()
        val detail = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/CheckInRecords.kt"
        ).readText()

        assertTrue(gateway.contains("getExerciseRecordAttemptContext"))
        assertTrue(gateway.contains("exercise-records/{recordId}/attempt-context"))
        assertTrue(gateway.contains("createExerciseRecordResubmission"))
        assertTrue(gateway.contains("exercise-records/{recordId}/resubmissions"))
        assertTrue(gateway.contains("previousAttemptId == previousRecordId"))
        assertTrue(repository.contains("createExerciseRecordResubmission("))
        assertTrue(repository.contains("version = record.version"))

        assertTrue(detail.contains("record.teacherPublicFeedback"))
        assertTrue(detail.contains("首版照片与视频（只读）"))
        assertFalse(detail.contains("SubmissionChainPanel("))
        assertFalse(detail.contains("可重新补交"))
        assertFalse(detail.contains("fetchExerciseRecordAttemptContext(record.id)"))
        assertFalse(detail.contains("onStartResubmission"))
        assertFalse(detail.contains("createExerciseRecordResubmission("))
        assertFalse(detail.contains("reviewStatus = \"DRAFT\""))
    }

    @Test
    fun studentRecordUiUsesV8MinuteAndReviewHierarchy() {
        val detail = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/checkin/CheckInRecords.kt"
        ).readText()
        val state = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/core/state/StudentAppState.kt"
        ).readText()

        assertTrue(detail.contains("实际运动"))
        assertTrue(detail.contains("可计分钟"))
        assertTrue(detail.contains("实际计入"))
        assertTrue(detail.contains("处理阶段"))
        assertTrue(detail.contains("公开原因或说明"))
        assertTrue(detail.contains("首版照片与视频（只读）"))
        assertFalse(detail.contains("计入学时"))
        assertFalse(detail.contains("提交次数"))
        assertFalse(detail.contains("打卡时长"))
        assertFalse(detail.contains("教师公开意见"))
        assertFalse(detail.contains("appState.apiRepository"))
        assertTrue(state.contains("internal suspend fun fetchExerciseRecordAttemptContext("))
    }

    @Test
    fun accountDeletionRequiresChallengeOtpFinalConfirmationAndServerProofBeforeCleanup() {
        val gateway = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/core/network/v1/V1AccountDeletionGateway.kt"
        ).readText()
        val screen = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/profile/AccountDeletionScreen.kt"
        ).readText()
        val state = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/core/state/StudentAppState.kt"
        ).readText()
        val shell = projectFile(
            "app/src/main/java/edu/bnbu/student/mvp/feature/shell/AppRootScreen.kt"
        ).readText()

        assertTrue(gateway.contains("me/account-deletion-challenges"))
        assertTrue(gateway.contains("challengeId,"))
        assertTrue(gateway.contains("\"confirm\""))
        assertTrue(gateway.contains("StudentAccountDeletionChallengeRequest(expectedVersion, locale)"))
        assertTrue(gateway.contains("expectedVersion = challenge.version"))
        assertTrue(gateway.contains("verificationCode = verificationCode"))
        assertTrue(gateway.contains(".withMutationIntent(intent)"))
        assertTrue(gateway.contains("data.status != \"DELETED\""))
        assertTrue(gateway.contains("!data.allSessionsRevoked"))
        assertTrue(gateway.contains("!data.newRegistrationRequired"))

        assertTrue(screen.contains("showChallengeConfirmation"))
        assertTrue(screen.contains("showFinalConfirmation"))
        assertTrue(screen.contains("BNBUFormField("))
        assertTrue(screen.contains("ClientErrorContext.ACCOUNT_DELETION"))
        assertTrue(screen.contains("appState.completeAccountDeletion(confirmation)"))
        assertFalse(screen.contains("localizedDescription"))
        assertFalse(screen.contains("failure.message"))

        assertTrue(state.contains("internal fun completeAccountDeletion("))
        assertTrue(state.contains("localStore?.clearAll()"))
        assertTrue(state.contains("credentials = null"))
        assertTrue(state.contains("resetToSignedOutState()"))
        assertTrue(shell.contains("SubScreen.AccountDeletion"))
    }

    private fun projectFile(relativePath: String): File =
        File(projectRoot, relativePath).also {
            require(it.exists()) { "Required project file is missing: ${it.absolutePath}" }
        }
}
