# PR #4 第二轮复审：Android 可执行清单与外部阻塞移交

日期：2026-09-06
状态：**PR4-R2-06 LOCAL COMPLETE / PARTIAL — 最终交接与同 Commit 验证完成，等待用户 Push、更新 PR 元数据并请求最终复审**
复审依据：`D:\DT\soprts\start3\PR4-Android学生端UI复审报告2.md`

本文把第二轮复审意见分成三类：Android 当前范围内必须修复、可由 Android 与用户共同补齐的验证/PR事项、以及缺少 Contract/Backend/授权而不能由本 UI 任务自行关闭的事项。本文不改变业务正文、Contract、Backend 或 STATUS。

## 1. 开始状态与范围

| 项目 | 固定值 |
|---|---|
| Git 根目录 | `D:\DT\soprts\start3\worktrees\phase2-android-student-ui` |
| 分支 | `codex/phase2-android-student-ui` |
| 第二轮复审前 HEAD | `6e0456c9de45188b5b5a6139ad551274fed9685d` |
| 远端 | `origin=https://github.com/chchaiai/new_need_version_sports.git`；本地与远端同步 |
| 开始时工作树 | clean |
| 当前业务权威 | `main@8c9826822f35876f8d01480f8baf184027711dfe`（V8.1 四份业务正文） |
| Contract | `1.2.0-contract` / `RC`；`contracts/openapi.yaml` SHA-256 `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a` |
| 已读取规则 | 根 `AGENTS.md`、V8.1 最终交接、PR #4 第二轮复审报告 |
| 当前定位 | `V8.1 Android UI foundation / PARTIAL`；不是学生业务流程完成 |

拟允许修改路径须在用户明确说“开始”后生效：

- `BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/MainActivity.kt`
- `BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/StartupReadiness.kt`
- `BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/shell/**`
- `BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/notifications/**`
- `BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/courses/EnterInviteCodeScreen.kt`（2026-09-05 用户针对 R2-04 唯一失败明确授权）
- 对应 `BNBU-ANDROID/app/src/test/**`、`BNBU-ANDROID/app/src/androidTest/**`
- `docs/rebuild/phase-2/android/p2a-student-ui/**`
- `docs/rebuild/handoffs/phase-2-p2a-android-student-ui-*.md`

继续禁止：`docs/business/**`、`contracts/**`、Backend、Web、`infra/**`、`tests/e2e/**`、数据库/部署配置、冻结的 Android `core/{model,data,network,exercise,state,review}/**`。`docs/rebuild/STATUS.md` 在收到负责人明确授权前继续不改。

## 2. 我们当前能完成的任务

### PR4-R2-00：固定第二轮基线与复现测试

- 保留 `6e0456c...` 作为问题基线，不改写历史提交。
- 给两个 P1 分别补失败测试，先证明当前行为错误，再修改实现。
- 完成标准：测试可稳定覆盖报告给出的风险，不依赖真实 Backend。

完成结果：

- 修改前聚焦基线：`StartupGateStaticPolicyTest` + `StudentNoticeUiModelTest` 共 8 项，`BUILD SUCCESSFUL`，8/8 通过。
- 新增安全预期后：共 10 项，稳定得到 3 项失败；这是刻意保留的缺陷复现红测，不是已修复后的最终测试结果。
- 轮询红测：`refreshFailureDoesNotReplaceTheLastConfirmedModeWithFallbackMaintenance` 失败，确认刷新失败分支仍调用 `fallbackSystemModeStatus` 并更新正式业务模式。
- 通知结果红测：期望无泄漏，实际得到 `unsafe-direct-score`、`unsafe-direct-grade`、`unsafe-direct-ranking`、`unsafe-numeric-points`。
- 通知类型红测：精确允许列表期望拒绝，实际 `exercise_record_backup` 通过子串匹配，得到 `unknown-target`。
- 生产代码在本步保持 `6e0456c...` 行为，等待 PR4-R2-01/02 修改；本步没有用删除断言或放宽期望制造通过。

### PR4-R2-01：修复轮询失败伪造维护模式

当前证据：`MainActivity.kt` 在首次取得服务端模式后每 15 秒轮询；后续失败会调用 `fallbackSystemModeStatus()`，Staging/Production 被写成 `MAINTENANCE`。现有 `SystemModeFallbackTest` 还把该行为固定成预期。

修改目标：

- 初次请求失败继续显示独立 Loading/Error/Retry，不进入 NORMAL 或 MAINTENANCE。
- 首次已确认 NORMAL 后，单次或连续网络失败不得创建 MAINTENANCE，不得显示“补证计时暂停”。
- 保留最后一次服务器确认的业务模式，并另外表达连接/技术状态；写操作是否临时限制必须使用中性连接文案，不能伪造维护事实。
- 请求恢复后清除连接异常并使用最新服务器模式。
- 只有服务器明确返回 `MAINTENANCE` 才进入维护页面。
- 若最后一次服务器确认本来就是 MAINTENANCE，轮询失败只能保留该已确认事实，不能生成新的暂停期限或本地剩余时间。

必须覆盖：初次失败、NORMAL 后单次失败、连续失败、失败后恢复、服务器真实切换 MAINTENANCE、已确认 MAINTENANCE 后暂时断线。

范围判断：这是 Android 客户端状态协调/呈现错误，可在当前 Android 层修复；不需要修改 Contract 才能停止制造假维护事实。真实剩余时间仍必须来自后端。

完成结果（2026-09-05）：

- 删除环境 fallback：周期刷新失败不再把 staging/production 写成 `MAINTENANCE`，也不再调用 `updateSystemMode`。
- 新增独立 `SystemModeConnectionState` 与纯状态解析函数。失败保留最后一次服务器确认的完整 `SystemModeStatus`；恢复后采纳最新服务器响应并清除连接异常。
- 最后确认是 NORMAL 时，刷新失败显示全屏中性连接状态并临时封住业务入口，明确“未认定为维护、不会据此承诺补证计时暂停”，支持手动重试并保留 15 秒自动重试。
- 最后确认是 MAINTENANCE 时，保留服务器已确认的维护事实，但隐藏可能过期的补证计时面板，提示维护结束和剩余时间需在重连后由服务器确认。
- 中英文资源、Live Region、明确图标描述、48dp 最小重试触控目标和稳定测试标签已补齐。
- `compileDebugKotlin` 成功；系统模式聚焦 JVM 测试 16/16 通过（`StartupReadinessTest` 8、`SystemModeTest` 2、`StartupGateStaticPolicyTest` 6），`BUILD SUCCESSFUL`。
- 通知聚焦测试仍按计划保留 2 个失败（5 项中 2 项失败），证明本步没有越界掩盖下一项缺陷；由 PR4-R2-02 修复。
- 本步未声称完成全量构建、instrumentation、真机测试或业务验收；未修改 Contract、业务正文、Backend 或根 `STATUS.md`。

### PR4-R2-02：关闭英文通知成绩泄漏

当前证据：英文防护只拦截 `final grade/score` 等组合，且 `targetType` 使用子串包含。`Score: 95`、`Grade: A`、`Ranking: 1`、`You passed with 90 points` 可进入学生通知。

修改目标：

- 将旧 Contract 过渡期的 `targetType` 改为精确允许列表，不使用 `contains` 接受任意相似字符串。
- 拦截独立的 `score`、`grade`、`rank/ranking` 结果表达及带数值的 `points` 成绩表达。
- 保留合法流程通知，例如 `Evidence upload failed`、`Evidence passed initial checks`、`Evidence level unavailable`、`Review points to missing evidence`。
- 中英文均不得披露最终成绩、换算分、等级、排名或同义结果。
- 记录这是旧 Contract 下的客户端防泄漏门禁；最终方案仍是 Contract 的结构化通知类型和学生安全字段。

必须覆盖上述四个泄漏例子、既有四个合法英文回归例子、未知/相似 `targetType`、允许的精确 `targetType`。

范围判断：这是 Android 通知展示模型的安全过滤，可在当前范围修复；结构化权威数据仍需 Contract/Backend。

完成结果（2026-09-05）：

- 非空 `targetType` 改为精确、大小写无关的允许表；`exercise_record_backup` 等仅包含合法名称的未知类型不再通过。
- 当前 Contract 安全路由 `COURSE`、`EXERCISE_RECORD`、`APPLICATION`、`ENDURANCE`、`FEEDBACK`、`SYSTEM_MODE` 可精确映射；`FINAL_GRADE` 即使文案不含敏感结果也整条拒绝。
- 英文内容门禁拦截独立 `score`、`grade`、`rank/ranking`、`GPA`，带数值的 `point/points/pt/pts`，以及具有结果语境或明确值的 `level/tier`。
- 合法流程通知 `Evidence upload failed`、`Evidence passed initial checks`、`Evidence level unavailable`、`Review points to missing evidence` 均保留，未恢复上一轮的关键词误杀。
- 通知聚焦 JVM 测试 7/7 通过；与 PR4-R2-01 系统模式专项合并回归共 23/23 通过，`BUILD SUCCESSFUL`。
- 本步是旧 Contract 下的客户端显示防泄漏门禁，不宣称替代结构化 Contract/Backend；未修改 Contract、业务正文、Backend 或根 `STATUS.md`。

### PR4-R2-03：聚焦与全量本地自动验证

- 先运行两组聚焦 JVM 测试，确认 P1 回归。
- 再运行 `:app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest --no-daemon --offline`。
- 重新记录测试总数、Lint、APK 大小/SHA-256、Contract SHA-256 和 `git diff --check`。
- 只报告真实结果；构建成功不等于设备测试或业务验收。

完成结果（2026-09-05）：

- 实际命令：`./gradlew :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest --no-daemon --offline`。
- Gradle：`BUILD SUCCESSFUL in 2m 21s`；88 个 task 中 23 个执行、65 个 up-to-date。
- JVM：78 个测试套件、445 项测试，445/445 通过，0 failure、0 error、0 skipped。旧 PR 的 408 项数字不再适用。
- Lint：任务通过，0 Error、5 Warning。5 条 Warning 均位于本次两个 P1 修复前已有的代码/资源：`MutableCollectionMutableState`、`DiscouragedApi`、2 条 `VectorPath`、1 条 `TypographyDashes`；本步如实保留，不将 Warning 写成零问题。
- Debug APK：`edu.bnbu.student.mvp.debug`，版本 `0.1.0-mvp-debug`，27,463,039 bytes（26.19 MiB），SHA-256 `87c532e7c7b1c58e1d7cdc76b0c72b1fe17d79faca4906dd73eff7102400395d`。
- AndroidTest APK：`edu.bnbu.student.mvp.debug.test`，997,479 bytes（0.95 MiB），SHA-256 `084857092babf84ee7a6b9a439d0e0029cbb38b7c1909eafdead461245c94802`。
- `app/src/androidTest` 当前有 19 个 `@Test`；本步仅确认测试 APK 编译成功，**没有在设备或模拟器执行这 19 项**。
- 两个 APK 来自以 `6e0456c9de45188b5b5a6139ad551274fed9685d` 为基线的当前未提交工作树；最终提交 Commit 将在后续交接阶段记录，不能把当前产物错误绑定为 `6e0456c...` 的原始内容。

### PR4-R2-04：实际运行 instrumentation

- 用户在 Android Studio 启动专用、可重置的模拟器；不使用保存真实资料的设备。
- Codex 负责执行 `connectedDebugAndroidTest`，优先运行全部 19 项；若测试框架/环境阻塞，保留原始失败分类并至少单独运行领导要求的启动、导航、返回、权限、维护切换和中断恢复关键场景。
- 结果必须绑定修改后的新 HEAD、设备/API 和 APK，不得继续写“只编译”。
- instrumentation 失败必须修复或明确归类，不能用 JVM 结果替代。

完成结果（2026-09-05）：

- 执行设备：专用可重置 AVD `BNBU_P2_UI_Review`，序列号 `emulator-5554`，Android/API 37，型号 `sdk_gphone16k_x86_64`；没有使用保存真实学生资料的设备。
- 首次 `--offline` 调用因本机未缓存 UTP 依赖而在测试启动前失败；允许 Gradle 获取缺失测试运行依赖后，instrumentation 已实际进入设备执行。该次启动前失败不计为测试失败或通过。
- 在原有 19 项基础上新增两项连接/维护回归设备测试：NORMAL 后刷新失败必须显示中性连接阻断且不得伪造维护；已确认维护后断线必须隐藏可能过期的补证剩余时间。两项均已在 AVD 通过。
- 修正 AndroidTest 的两类测试装置问题：主导航标签不再硬编码中文；对记录页、补证页的屏外 `LazyColumn` 节点先由滚动容器定位。相关导航、审核阶段矩阵和补证预览用例均已实际通过，未通过放宽业务断言制造绿测。
- 第一轮清理测试装置问题后的完整命令实际执行 21 项，20 项通过、1 项失败、0 error、0 skipped，设备执行时间 58.033 秒；Gradle 任务如实为 `BUILD FAILED`。
- 当时唯一失败：`CoreJourneyUiTest#scanEntry_hasNoSimulatedSuccessAndOpensDedicatedManualInput`。测试要求 `courseJoin.enterCode.submit` 在邀请码为空时禁用，但生产 `EnterInviteCodeScreen.kt` 使用 `enabled = !isResolving`，按钮实际可点击。`manual-acceptance-record.md` 的 `PAGE-STU-033` 也明确记录“空值禁用”，故确认为 Android UI 实际缺陷，不是 Backend/Contract 缺失或测试误报。
- 该生产文件起初不在本轮狭义写入清单内，因此先停止并请求确认；用户随后明确授权把该文件纳入 R2-04。实现仅将提交按钮条件收紧为“未请求中且去除首尾空白后非空”，没有修改邀请码格式规则、请求逻辑、Contract 或 Backend。
- 原失败用例修复后单独执行 1/1 通过。随后再次完整执行 `./gradlew :app:connectedDebugAndroidTest --no-daemon --offline`：21/21 通过、0 failure、0 error、0 skipped，设备执行时间 58.834 秒，`BUILD SUCCESSFUL in 1m 55s`。
- XML 证据：`BNBU-ANDROID/app/build/outputs/androidTest-results/connected/debug/TEST-BNBU_P2_UI_Review(AVD) - 17-_app-.xml`；HTML 证据：`BNBU-ANDROID/app/build/reports/androidTests/connected/debug/index.html`。

### PR4-R2-05：修改后人工回归

用户在新 Debug APK 上复测：

- 无 Backend 冷启动 Loading/Error/Retry 和本地评审入口。
- 五个主页面与普通后台恢复。
- 中英文通知安全样例的可见结果。
- 中英文切换、录像按钮和已保留视频预览不回归。
- 若可控测试场景提供连接状态，确认网络失败不显示维护/暂停承诺；真实维护只能由服务器响应或明确测试夹具触发。

人工结果只覆盖实际执行的设备/页面/状态。

准备结果（2026-09-05）：

- 最新候选包：`BNBU-ANDROID/app/build/outputs/apk/debug/app-debug.apk`，27,463,039 bytes（26.19 MiB），SHA-256 `c98e30158d687056292c790fe85bd30cb6606cb673ef92a74ed8aa7d9b51183f`。
- 该包包含 PR4-R2-01/02 的系统模式和通知修复、R2-04 测试装置修正，以及用户明确授权的 `PAGE-STU-033` 空邀请码按钮禁用修复。
- 用户在上一候选包上新增发现三项 UI 问题：应用内切换英文后通知面板的客户端固定文案仍为中文；英文已保留视频页底部说明被系统导航栏裁切；系统启动页必须继续使用既有 BNBU SPORT / VERITY AI 品牌资源，后续可见 Loading 不应造成被替换的观感。
- 第一版候选让通知面板固定文案从应用所选语言的本地化 Context 读取；系统 Splash 的 Manifest/Theme/资源引用保持不变，可见 Loading 继续复用同一主品牌图和合作方图。用户已在真机确认这两项通过。
- 第一版视频修复增加系统导航栏安全区后，用户真机确认英文底部说明仍显示不全。按用户决定，当前候选已从中英文已保留视频预览统一删除该非业务说明；播放器首帧、控制器、删除能力和导航栏安全区均保留。没有修改媒体或 Backend 业务逻辑。
- 本轮全量 JVM 为 447/447 通过（78 suites）；Lint 0 Error、5 Warning；Debug 与 AndroidTest APK 均构建成功；`git diff --check` 为 0。
- 同一候选源码已在专用 AVD `BNBU_P2_UI_Review` / API 37 完整执行 22/22 instrumentation 通过、0 skipped/failed；新增用例覆盖应用选择英文后通知面板固定文案。这不能替代以下真机人工观察。
- AndroidTest APK：1,000,761 bytes；SHA-256 `517828c30cf54e5d130f6715516f650a1def669537c62021aaab15d8fe7d365d`。
- 当前真机未连接构建电脑，候选包不会自动出现在手机上；需用户手动传输并全新安装后再开始记录。
- 冷启动原有 BNBU SPORT / VERITY AI 系统启动页及英文通知固定文案已由用户真机确认通过。2026-09-06，用户进一步确认当前候选中的中英文已保留视频预览不再显示底部辅助说明，视频首帧、播放控制和删除按钮保持正常；R2-DEVICE-01—03 均已关闭。
- 服务器下发的通知正文不由客户端擅自翻译；本项只修复 Android 自有的通知面板固定文案。通知成绩/等级/排名防泄漏仍由既有结构化/文本安全门禁验证。
- “已确认 NORMAL 后轮询失败”和“已确认 MAINTENANCE 后断线”的真机条件当前缺真实可控服务，不要求伪造；两项只记录为 AVD 自动化通过，生产联调继续等待 Backend。

### PR4-R2-06：交接、PR 元数据与重新审核

- 将最终交接统一定位为 `V8.1 Android UI foundation / PARTIAL`。
- 更新测试总数、新 APK SHA、instrumentation 实际结果和真机结果。
- 用户在 GitHub 手动把旧 V8.0 重复标题改为建议标题：`feat(android): add V8.1 student UI foundation (partial)`。
- 用户手动用最新 PR 正文替换当前 V8.0、408/408 和旧 APK 内容；Git Push 或 Comment 不会自动改 Description。
- 用户手动 Push、新增复审 Comment、请求 Reviewer；不自行合并。

完成标准：两个 P1 有代码与测试证据；设备测试结果真实；PR 元数据与分支一致；未完成项继续明确阻断 Release。

## 3. 当前不能由本 UI 任务独立关闭的事项

| 编号 | 事项 | 为什么不能由当前任务完成 | 需要的负责人/前置条件 | 当前处理 |
|---|---|---|---|---|
| EXT-R2-01 | 维护剩余时间和暂停/恢复生产投影 | UI 模型存在，但 Contract/Backend 没有服务器确认的剩余时间和维护续计事实 | Contract Owner + Backend + Android 联调 | 保持 `Unavailable`/中性说明，不生成本地时间 |
| EXT-R2-02 | 六类正式原因代码、动作来源、公开说明生产投影 | 旧 Contract 不能提供 V8.1 结构化字段 | Contract Owner 发布新版本；Backend 实现；Android 重新生成/适配 | 仅保留 UI 承载和旧记录降级显示 |
| EXT-R2-03 | 待 AI、待教师、待补证、技术处理中生产状态 | 旧正式记录只有有限最终状态 | Contract/Backend 提供结构化阶段 | UI 模型不能冒充生产已接入 |
| EXT-R2-04 | 正式补证、课程关闭后的既有链、锁定批次续传 | 缺服务端状态、锁定批次、受理事实和恢复接口 | Domain/Contract/Backend/Android 联调 | 记录为后续功能与 Release 阻塞 |
| EXT-R2-05 | 真实登录、入班、上传、审核、通知、注销与会话/上传恢复 | 当前没有可运行的新 Backend | Backend 和联调环境 | 不以 Debug 合成数据关闭 |
| EXT-R2-06 | FCM/系统 Push 与仅站内通知冲突 | 涉及 Manifest、Gradle、`core-push` 等非 Compose UI 范围 | 领导已确认另建 Android 平台任务 | 不扩大 PR #4；正式 Release 前必须关闭 |
| EXT-R2-07 | 隐私政策中英文定稿 | 属于业务/运营/法律内容 | 隐私/法律/业务负责人提供正式文本 | 不由 Android 编写政策 |
| EXT-R2-08 | Release APK 正式验收 | 需要 HTTPS、Firebase、签名、生产配置和发布权限 | Release/DevOps/Android 发布负责人 | Debug 验收不能替代 Release |
| EXT-R2-09 | GitHub CI | 当前仓库没有 workflow，且 `.github/**` 不在本 UI 写入授权 | 领导已确认另建仓库治理任务 | 不扩大 PR #4；下一次大型功能 PR 或 Release 前启用 |
| EXT-R2-10 | 根 `STATUS.md` 更新 | 根 AGENTS 要求 Phase 结束更新，但 Android 任务禁止直接修改 | 领导已确认由主线汇总人更新；未指定时由项目负责人承担 | Android 仅在最终 handoff 提供可直接采用的准确文字 |
| EXT-R2-11 | 完整 TalkBack/字体/横竖屏/七态证据 | 需要真实设备人工操作；部分业务态又缺入口/服务事实 | 用户 + Android/Web Reviewer；必要时另批 UI 评审夹具 | 可继续补实际可达项，未触发项不能填 PASS |
| EXT-R2-12 | 学生端完整业务流程验收 | 上述 Contract、Backend、Release、设备与跨端证据均未完成 | 各 Phase Owner + Reviewer | 本 PR 固定为 PARTIAL foundation |

## 4. 领导确认（2026-09-06）

1. 两个 Android P1 通过复审后，允许 PR #4 以 `V8.1 Android UI foundation / PARTIAL` 定位合并；不代表完整业务、Backend、Contract 或 Release 通过。
2. 合并前须在同一最新 Commit 上给出 P1 修复、关键 instrumentation 实际运行、JVM/Lint/两个 APK、APK SHA、`git diff --check`、PR 标题/正文和新 Commit SHA。
3. FCM/系统 Push 清理单独建立 Android 平台任务，不扩大本 Compose UI PR；GitHub CI 单独建立仓库治理任务，不扩大 PR #4。
4. 根 `docs/rebuild/STATUS.md` 由主线汇总人更新；Android 不得越界，须在最终 handoff 提供准确更新内容。
5. Android Owner 为 `Exwind259`；Android Reviewer 为当前已获 PR 审核权限的审核账号；学生 Web及 Contract/Backend/Release/隐私 Owner 由负责人正式指定，不由 Android 作者猜测或兼任。

## 5. 可直接发送给领导的初始回复（历史）

以下文本是收到第二份审核报告、尚未取得 2026-09-06 确认前的回复快照。最终 Push 后应使用 `docs/rebuild/phase-2/android/p2a-student-ui/leader-review-messages.md`，不得再次发送本节的待确认问题。

```text
领导您好，我们已完整复核第二份 PR #4 审核报告，当前分支为 codex/phase2-android-student-ui，问题基线 Commit 为 6e0456c9de45188b5b5a6139ad551274fed9685d，业务权威仍固定为 main@8c9826822f35876f8d01480f8baf184027711dfe。

我们确认两个直接阻断均成立，并且不能全部归因于没有 Backend：

1. MainActivity 在首次取得服务器模式后，后续轮询失败会把 Staging/Production 写成 MAINTENANCE。这会制造未经服务器确认的维护事实及补证暂停承诺，属于 Android 客户端状态协调错误。我们会改为保留最后一次服务器确认的业务模式，并独立表达连接/技术状态；只有服务器明确返回 MAINTENANCE 才进入维护页。测试覆盖初次失败、NORMAL 后单次/连续失败、恢复、真实切换维护以及维护后断线。
2. 英文通知目前没有拦截 Score: 95、Grade: A、Ranking: 1 和 You passed with 90 points，且 targetType 使用子串包含。我们会使用精确允许列表并补齐结果泄漏门禁，同时保留 Evidence upload failed、Evidence passed initial checks、Evidence level unavailable 和 Review points to missing evidence 等合法流程通知。

我们还会在专用模拟器实际运行 instrumentation，将结果绑定新的 Commit/设备/API；随后重跑 JVM、Lint、Debug/AndroidTest 构建，重新生成 APK SHA，并把 PR 标题、正文、测试数字和版本全部更新为当前事实。PR 定位会明确改为 V8.1 Android UI foundation / PARTIAL，不宣称完整业务流程通过。

以下事项无法由当前 Compose UI 任务自行关闭，已登记为后续/Release 阻塞：维护剩余时间、正式原因代码和细分审核阶段的 Contract/Backend 投影；正式补证和锁定批次续传；真实登录、上传、审核、通知及恢复；FCM/系统 Push 清理；隐私政策定稿；Release APK；GitHub CI；完整七态与无障碍证据。Android 不会自行修改 Contract/OpenAPI 或伪造服务器事实。

另有一项执行约束需要确认：根 AGENTS.md 要求 Phase 结束更新 docs/rebuild/STATUS.md，但此前本任务收到的范围要求是 STATUS 由指定汇总人更新、Android 禁止修改。请确认由哪位汇总人更新；如果现在授权 Android 修改，请明确可写章节。也请确认两个 P1 和设备测试关闭后，是否允许本 PR 以 PARTIAL UI foundation 合并，并为上述外部问题指定 Owner 和 Release 门禁。
```

## 6. 执行停点

PR4-R2-06 本地工作完成后停在用户外部操作前：最终 handoff、PR 模板、领导消息和 STATUS 汇总建议均已更新；根 `STATUS.md` 未修改。最终本地 Commit 上须确认 JVM 447/447、Lint 0 error/5 warning、两个 APK 构建、专用 AVD/API 37 instrumentation 22/22、APK SHA 和 `git diff --check` 与文档一致。之后由用户 Push，手动将 PR #4 标题改为 `feat(android): add V8.1 student UI foundation (partial)`，用模板替换正文中的 `[FINAL_COMMIT_SHA]`，并把新的远端 HEAD 回复 Reviewer。Android 不自行合并。
