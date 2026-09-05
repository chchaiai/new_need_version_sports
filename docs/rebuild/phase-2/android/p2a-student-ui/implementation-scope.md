# P2A Android 学生端 UI 实施范围

本文件冻结下一阶段的候选 Compose 写入范围。它不构成当前阶段修改源码的授权；每个实施批次开始前仍须报告分支、HEAD、状态和准确文件，并由用户说“开始下一步”。

## 1. 开发基线

```text
Repository: chchaiai/new_need_version_sports
Base branch: main（只以固定 Commit 表示，不跟随“最新 main”）
Base commit: 49d992a1333294ea561923cfea0b7d25864a4d91
Android tree: a5071942e2371dc288e8b9e3630080f60e344761
Task branch: codex/phase2-android-student-ui
Design version: P2A-UI-2026.09.04-draft1
```

## 2. 实施原则

1. 只改学生端 Compose UI、UI 文案、UI 图标和对应 UI/静态策略测试。
2. 不修改 Contract、网络 DTO、Repository、Backend、数据库、部署或共享业务正文。
3. 无 Backend 时通过 UI 展示模型隔离旧数据模型；不把评审样例写进正式业务仓储。
4. 先移除禁止披露和旧业务含义，再增加新页面；每批构建和自动测试。
5. Web 提供视觉与信息分组参考，不复制其遗留业务计算。
6. 不做像素级复刻；保留 Android 导航、返回、权限、相机和系统组件习惯。

## 3. 批次 A：共同 UI 基础与导航语义

候选修改文件：

```text
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/shell/AppRootScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/core/designsystem/Components.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/core/designsystem/BNBUErrorPanel.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/core/designsystem/InterfaceText.kt
BNBU-ANDROID/app/src/main/res/values/strings.xml
BNBU-ANDROID/app/src/main/res/values-en/strings.xml
```

候选新增 UI 文件：

```text
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/common/StudentPageState.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/common/StudentStateScaffold.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/common/StudentReviewDataBanner.kt
```

目标：固定五个底部标签、七状态外壳、评审数据标识和通用权限/恢复反馈。通用组件不得含业务计算。

## 4. 批次 B：五个主导航和通知

候选修改文件：

```text
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/dashboard/DashboardScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/courses/CoursesScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/CheckInScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/grades/GradesScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/grades/GradeDisplayPolicy.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/profile/ProfileScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/notifications/NotificationSheet.kt
```

候选新增 UI 展示模型：

```text
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/dashboard/StudentDashboardUiModel.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/courses/StudentCourseUiModel.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/grades/StudentProgressUiModel.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/notifications/StudentNoticeUiModel.kt
```

目标：分钟化、两类进度、三种时长、本人核验、原始耐力、通知白名单，并从可达 UI 中清除成绩/分数/等级/排名。

说明：保留现有 `GradesScreen.kt` 文件名可减少无关路由迁移，但页面标题和业务含义必须变成“记录与进度”；是否在后续清理阶段物理改名另行确认。

## 5. 批次 C：扫码、邀请和入班结果

候选修改文件：

```text
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/courses/ScanJoinScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/courses/EnterInviteCodeScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/courses/CourseJoinConfirmScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/shell/AppRootScreen.kt
```

候选新增文件：

```text
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/courses/CourseJoinResultScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/courses/CourseJoinUiModel.kt
```

目标：覆盖 `PAGE-STU-030` 至 `035`，新增独立结果页面；正式路径删除/隔离模拟扫码成功控件。

## 6. 批次 D：运动、证据、上传恢复和游泳

候选修改文件：

```text
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseCheckInScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/CheckInRecords.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/SessionMediaManager.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseVideoRecorder.kt
```

只有在 UI 展示确实需要、且不改变接口或领域规则时，才可另行申请修改以下会话 UI 状态文件：

```text
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/session/ExerciseSessionState.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/session/ExerciseVideoRecordingState.kt
```

候选新增文件：

```text
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseEvidenceScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseSubmissionScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/SwimmingDelayExplanationScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseReviewUiModel.kt
```

目标：覆盖 `PAGE-STU-040` 至 `043` 和 `050` 至 `051`。本批只完成 UI 和本地恢复呈现，不修改 Gateway、上传协议、服务器计时或计入算法。

## 7. 批次 E：一次补充、原始耐力和免测/认证

候选修改文件：

```text
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/exemption/ExemptionScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/grades/GradesScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/profile/ProfileScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/shell/AppRootScreen.kt
```

候选新增文件：

```text
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/SupplementTaskScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/SupplementResultScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/SupplementUiModel.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/grades/RawEnduranceResult.kt
```

目标：覆盖 `PAGE-STU-052`、`060`、`061`、`070`；旧 `EnduranceScoringScreen.kt` 从学生可达导航中移除。本阶段不删除该旧文件，也不修改成绩 DTO。

## 8. 批次 F：账户、帮助、反馈与隐私文案审计

只在逐页核对发现冲突时修改：

```text
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/login/RecoveryRequestScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/login/ContactBindingScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/guide/OnboardingGuideScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/profile/AccountDetailsScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/profile/AccountDeletionScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/profile/PrivacyPolicyScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/help/HelpCenterScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/help/HelpArticlePresentation.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/feedback/FeedbackScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/settings/AboutScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/settings/ChangelogScreen.kt
```

登录核心和安全存储不在本批范围内。

## 9. 运动图标资源

保留 Web 九类运动的语义，不要求像素一致。候选资源：

```text
BNBU-ANDROID/app/src/main/res/drawable/ic_sports_running.xml
BNBU-ANDROID/app/src/main/res/drawable/ic_sports_basketball.xml
BNBU-ANDROID/app/src/main/res/drawable/ic_sports_football.xml
BNBU-ANDROID/app/src/main/res/drawable/ic_sports_badminton.xml
BNBU-ANDROID/app/src/main/res/drawable/ic_sports_table_tennis.xml
BNBU-ANDROID/app/src/main/res/drawable/ic_sports_swimming.xml
BNBU-ANDROID/app/src/main/res/drawable/ic_sports_fitness.xml
BNBU-ANDROID/app/src/main/res/drawable/ic_sports_cycling.xml
BNBU-ANDROID/app/src/main/res/drawable/ic_sports_other.xml
```

现有羽毛球和乒乓球资源可修改；其余按需新增。所有图标需要内容描述或由父组件提供可理解语义。

## 10. UI 测试候选范围

允许新增或更新直接验证本阶段 UI 的测试：

```text
BNBU-ANDROID/app/src/androidTest/java/edu/bnbu/student/mvp/CoreJourneyUiTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/checkin/ExerciseSportGridLayoutTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/courses/ScanJoinScreenTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/grades/GradeDisplayPolicyTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/grades/CheckInHoursPresentationPolicyTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/help/HelpArticlePresentationTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/profile/OrganizationRecognitionCopyTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/ui/StudentUiForbiddenCopyPolicyTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/ui/StudentUiPageStatePolicyTest.kt
```

测试重点：禁止成绩披露、分钟文案、`PENDING → 已退班`、提交不等于有效、图标数量、页面/状态可达性以及无演示成功进入正式路径。

## 11. 明确禁止的写入范围

```text
contracts/**
BNBU-Sports-Backend/**
BNBU-Sports-Web-new/**
infra/**
tests/e2e/**
docs/business/**
docs/rebuild/STATUS.md
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/core/model/**
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/core/data/**
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/core/network/**
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/core/exercise/**
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/core/state/**
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/core/review/**
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/session/*Gateway*
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/session/*Mapper*
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/session/*UploadCoordinator*
```

此外禁止修改、清理、stash、reset、回退或覆盖：

```text
D:\DT\soprts\BNBU-week9-fix\BNBU-Sports-Android
D:\DT\soprts\start3\new_need_version_sports-完整仓库-2026-09-04\new_need_version_sports
D:\DT\soprts\start3\BNBU-week9-fix（如存在）
任何其他历史目录
```

## 12. 必须停止并报告的情况

- 页面需要新增 v8.0 正文没有定义的业务决定；
- UI 无法表达所需状态而必须修改 Contract、DTO、Repository、Gateway 或核心领域模型；
- 需要决定固定退回原因分类；
- 需要真实 Backend 才能判断成功、权限、截止或计入结果；
- 需要写入本文件禁止的路径；
- 发现目标文件已有用户未提交修改或基线发生变化。

发生上述情况时记录证据、影响和待确认问题，不自行推断，也不以 Mock 关闭缺口。

## 13. 建议实施顺序

```text
A 共同 UI 基础
→ B 五个主导航与通知
→ C 入班流程
→ D 运动/证据/上传恢复
→ E 补充/耐力/免测认证
→ F 账户与静态内容核验
→ 全量单测、Lint、Debug 构建
→ Android Studio 模拟器和真机人工验收（由用户执行）
→ Reviewer 确认
→ 用户手动 push 和创建 PR
```

每批结束都必须报告真实执行的测试；“构建成功”不得写成“完整业务通过”。
