# Phase 2 P2A Android 学生端 UI：第五步扫码与入班批次交接

> 日期：2026-09-05
>
> 原 15 步计划编号：**第五步**
>
> 完成状态：**DONE（第五步 `PAGE-STU-030—035` UI 批次）**；Phase 2 Android 全量页面仍为 **PARTIAL**。
>
> 设计基线：`P2A-UI-2026.09.04-draft1`

## 1. 固定基线

```text
Repository: https://github.com/chchaiai/new_need_version_sports.git
Base branch: main
Base commit / current HEAD: 49d992a1333294ea561923cfea0b7d25864a4d91
Task branch: codex/phase2-android-student-ui
Android base tree: a5071942e2371dc288e8b9e3630080f60e344761
Contract version: 1.2.0-contract / RC
Contract SHA-256: 667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a
```

业务含义仍只以四份 v8.0 正文为权威。P2W 学生 Web 设计交付用于页面层级、流程、状态和信息分组核对。没有修改业务正文、Contract、Backend、Web、数据库、部署或 `STATUS.md`；`STATUS.md` 继续由指定汇总人维护。

## 2. 本批完成内容

### 2.1 `PAGE-STU-030 / 032` 登录前后扫码

- 登录前和登录后继续共用 Android 相机扫码含义，保留进入页面才请求相机权限、永久拒绝后转系统设置、无相机设备提示、闪光灯和退出时暂停相机。
- 正式路径彻底移除 `SIMULATED-PREVIEW-ONLY`、模拟课程和“模拟扫码成功”按钮；扫码成功只能来自真实解析与邀请预览返回。
- 无效二维码、查询中、技术错误、可重试错误和相机权限状态继续独立呈现。
- 手动输入入口优先转到独立 `PAGE-STU-033`，不把输入弹窗当成正式主流程；弹窗只保留为未提供外部导航回调时的组件级回退。

### 2.2 `PAGE-STU-033` 输入邀请码

- 邀请码输入与格式状态可恢复；进行中的网络请求不会在进程重建后伪装成仍在提交。
- 业务错误与网络/协议错误使用安全的本地映射，不直接展示服务端原文、邀请码或异常消息。
- 可重试错误提供重试入口，加载期间禁止重复提交和破坏性返回。
- 输入长度受现有 Android 邀请凭证边界约束，不记录或输出完整邀请码。

### 2.3 `PAGE-STU-031 / 034` 邀请与入班确认

- 先展示服务端预览返回的课程、教师、学期、是否开放入班和邀请截止，再填写/核对学生身份并二次确认。
- 截止时间只展示服务端事实，不用设备倒计时自行判定邀请有效或宽限结束。
- 页面明确说明默认 30 分钟、可设 5—120 分钟、一次不可刷新 10 分钟自然到期宽限，以及撤销/关闭立即终止。
- 服务端预览已表示关闭入班时，确认页只显示阻断说明，不允许提交。
- 已知当前课程与同学期其他课程继续使用已加载的本人工作区作提前提示；最终提交仍必须由服务端校验。
- 提交不再用 Toast 代替结果；成功或失败统一进入独立结果页。

### 2.4 `PAGE-STU-035` 独立入班结果

- 新增独立结果页和 UI 状态模型，区分：成功、已在该课程、同学期已有其他班、自然过期、宽限耗尽、邀请撤销、课程/学期关闭、无权限、技术失败、结果未知。
- 只有明确的服务端成功响应可以构造成功状态；网络错误、协议错误和未知错误不会升级为成功。
- 技术失败可返回确认页重试，并通过 `SaveableStateHolder` 保留安全表单输入；更换邀请会清除旧确认状态。
- 结果未知要求重新核对邀请/课程事实，不自动重放写操作，也不显示假成功。
- 失败页只显示经清理的诊断编号，不显示服务端消息、请求正文、邀请码或认证凭证。
- Compose Preview 为全部结果状态提供虚构样例，并有“本地设计评审样例”标识；该 Preview 不进入正式运行路径、不创建成员关系。

### 2.5 导航与恢复

- 登录前流程可在扫码与独立邀请码页之间返回；确认、结果和重试状态由根导航显式承载。
- 登录后 Overlay 新增 `CourseJoinResult`，并记录邀请码页是否从扫码进入，保持符合 Android 的返回行为。
- 课程预览和结果 UI 使用受控 Saver 恢复；结果恢复仍保持原结果种类，缺失/损坏的保存数据按空或未知处理，不推断成功。

## 3. 本步修改文件

生产 UI：

```text
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/courses/ScanJoinScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/courses/EnterInviteCodeScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/courses/CourseJoinConfirmScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/courses/CourseJoinResultScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/courses/CourseJoinUiModel.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/shell/AppRootScreen.kt
```

直接相关测试：

```text
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/courses/DirectCourseJoinTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/courses/ScanJoinScreenTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/courses/CourseJoinUiStaticPolicyTest.kt
```

本文件：

```text
docs/rebuild/handoffs/phase-2-p2a-android-student-ui-course-join.md
```

## 4. 执行测试与真实结果

执行环境只在当前 PowerShell 命令内设置 Android Studio 自带 JDK 与本机 Android SDK，没有修改系统或项目持久配置。

| 检查 | 真实结果 |
|---|---|
| `feature.courses.*` 定向单测 | 23/23 通过 |
| `:app:testDebugUnitTest` | 353/353 通过，0 failure，0 error，0 skipped |
| `:app:lintDebug` | 成功；0 error，5 warning |
| `:app:assembleDebug` | 成功 |
| `git diff --check` | 通过 |
| 正式入班运行路径伪成功关键词扫描 | 0 命中 |

Lint 的 5 个警告仍是此前已有类别：两个长矢量路径、一个反射资源 API、一个可变集合状态和一个排版连字符；第五步没有新增 Lint error 或 warning。

构建产物：

```text
Path: BNBU-ANDROID/app/build/outputs/apk/debug/app-debug.apk
Size: 26719092 bytes
SHA-256: fe2838509696ea4688aa7bdffa58b85c17f25d44d53b496d2ff45aa242b81b90
```

## 5. 未执行测试及原因

- 未运行模拟器、真机、TalkBack、相机授权/永久拒绝、旋转/杀进程、深色主题、字体缩放和逐状态截图：按分工由用户和 Reviewer 人工完成。
- 未连接真实 Backend 验证扫码、邀请预览、邮箱验证、宽限、原子入班或幂等恢复：当前没有新 Backend。
- 未进行完整业务功能验收：本步结果只证明 UI 编译、自动测试、静态边界和 Debug 构建通过，不等于真实入班流程通过。
- 未 push、未创建 PR、未合并：均由用户手动执行，且应等待 UI 人工评审和跨端核对。

## 6. 业务规则与 Contract 边界

```text
是否修改业务规则：否
是否修改四份 v8.0 业务正文：否
是否修改 Contract：否
是否修改 Backend / Web / infra / tests/e2e：否
是否修改 STATUS.md：否（指定汇总人专属）
```

构建只读取固定 Contract 并在 `build/` 下生成临时源码。Git 工作区中的 `contracts/openapi.yaml` 未变化，SHA-256 仍为固定值。

## 7. 旧 API、Mock、TODO、空接口与差异证据

### 7.1 Android 当前仍引用旧入班快照

固定聚合 Contract `contracts/openapi.yaml` 当前定义：

- `previewCourseInvitation`，返回带 `ACTIVE / EXPIRED / REVOKED / COURSE_CLOSED / NOT_CURRENT` 的 `CourseInvitationPreview`；
- 已登录学生 `joinCourseByInvitation`；
- 新学生使用邮箱 OTP proof 的 `registerStudentAndJoinCourse`；
- 聚合错误码包括 `INVITATION_INVALID`、`COURSE_ALREADY_JOINED` 等。

Android 当前冻结的 `BNBU-ANDROID/app/openapi/openapi.snapshot.yaml` 和 `V1CourseJoinCoordinator` 仍使用：

- `/course-invites/{inviteToken}` 与 `CourseInvitePreview(enrollmentOpen, expiresAt)`；
- `issueJoinCapability → joinClassSectionWithInvite` 两步预认证流程；
- `COURSE_INVITE_*`、`AUTH_JOIN_CAPABILITY_*`、`ENROLLMENT_*` 等旧错误码。

第五步没有修改 Contract、Snapshot、Generated Client、Coordinator、Repository 或网络请求。结果 UI 对当前 Android 可证明的旧错误作保守映射；未知或新 Contract 返回一律进入“结果待核对”，不能长期视为正式接口接入完成。

### 7.2 v8.0 宽限信息仍缺少正式接口

当前聚合 Contract 没有完整表达“自然到期前已登记的同一次流程、一次不可刷新 10 分钟宽限、宽限截止/消耗状态及撤销/关闭立即终止”的学生端字段。第五步只完成状态页面和规则说明：

- 不根据设备时钟生成宽限；
- 不本地刷新或延长；
- 不把 Preview 样例写入正式业务模型；
- 待 Contract/Backend 定稿后再把状态绑定到正式字段。

### 7.3 登录前邮箱验证顺序仍待正式接入

v8.0/P2A 目标顺序是“邀请事实 → 身份与学校邮箱验证 → 最终确认 → 原子入班结果”。现有 Android Coordinator 仍是旧的“身份 → Join Capability → 入班后进入待邮箱绑定”流程。第五步没有越权改认证、状态层或网络层；因此 UI 页面已经拆分，但正式邮箱 proof 与最终确认的串联仍未完成。

### 7.4 Mock、TODO 与空接口

- 新增的多状态 Compose Preview 使用虚构、明确标识的本地设计样例，只用于 Android Studio 设计评审。
- 正式运行路径没有模拟扫码、延时成功、假成员、假 Toast 成功或本地写入。
- 没有新增 TODO、空 Repository、空 Gateway 或空 Backend 调用。
- 项目整体仍没有新 Backend；旧 Coordinator 引用属于待迁移旧 API，不代表接口可用。

## 8. 风险与待确认

1. `PENDING-P2A-BE-01`：没有新 Backend，无法做正式入班功能验收。
2. `PENDING-P2A-JOIN-CONTRACT-01`：聚合 Contract 与 Android 冻结快照的入班路径、Schema 和错误码不一致；必须由 Contract/Backend Owner 给出迁移版本，Android 不自行改 Contract。
3. `PENDING-P2A-INVITE-GRACE-01`：v8.0 的流程登记与一次宽限缺少完整 Contract 字段/状态，结果页目前只能完成设计状态。
4. `PENDING-P2A-PRELOGIN-EMAIL-01`：登录前邮箱 proof 在最终确认前的正式导航和接口组合待 Contract/Backend 明确。
5. `PENDING-P2A-OWNER-01`：Android Owner、Android Reviewer 和 Web 跨端 Reviewer 的真实姓名仍未填写，阻塞正式签字。
6. 维护状态当前仍由根级系统模式门控；没有 Backend 时不能验证“提交过程中切入维护并恢复后重新查询”的端到端行为。

阶段结束时只读保护核对：

```text
旧 Week 9：fix/android-contract-4.0.1-alignment-20260827
HEAD: 9506a8a491d091ff9be4936995b92184c007fc11
status items: 35

聚合 main 克隆：main
HEAD: 49d992a1333294ea561923cfea0b7d25864a4d91
status items: 0

Web 离线交付：codex/web-ui-local-preview
HEAD: 74b616653cbae36670c8c9b284c240be7438d480
status items: 635
```

没有对这些目录执行 reset、clean、stash、删除、回退或覆盖。

## 9. 下一阶段前置条件

在用户说“开始下一步”前不继续修改代码。

原 15 步计划的第六步开始前：

1. 重新核对任务分支、固定 HEAD、未提交修改和精确允许路径。
2. 继续保留本步入班 UI 与前四步全部未提交修改，不做 reset/clean/stash。
3. 若第六步涉及运动/证据/上传 UI，只改 Compose UI 和直接相关测试，不修改核心计时、媒体、Gateway、Contract 或 Backend。
4. 入班 Contract/Backend 缺口单独保留，待 Owner 回答后再安排接口迁移阶段，不能夹带进后续 UI 批次。
5. Phase 2 UI 批次完成后，由用户在 Android Studio 模拟器/真机执行人工验收，Web 负责人核对跨端含义，Reviewer 确认后由用户手动 push 和创建 PR。
