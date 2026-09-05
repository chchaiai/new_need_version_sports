# Phase 2 P2A：Android 学生端 UI 最终交接

日期：2026-09-05
状态：**READY FOR PR RE-REVIEW WITH LIMITATIONS — V8.1 UI 复审修正与指定真机回归已完成；Backend / Contract 接入和完整业务验收不在本次完成范围**

本文是本次 Android Pull Request 的首要审核入口。它汇总权威基线、已实现 UI、测试、真机结论、禁止范围和后续问题；详细设计与逐批证据通过本文链接追溯。

## 1. 固定基线与追溯

| 项目 | 固定值 |
|---|---|
| GitHub 仓库 | `https://github.com/chchaiai/new_need_version_sports.git` |
| 当前业务权威分支 / Commit | `main` / `8c9826822f35876f8d01480f8baf184027711dfe`（V8.1） |
| 原 Android 实施基线 / tree | `49d992a1333294ea561923cfea0b7d25864a4d91` / `a5071942e2371dc288e8b9e3630080f60e344761`（V8.0 历史起点） |
| Android 任务分支 | `codex/phase2-android-student-ui` |
| Android UI 初版实施 Commit | `17bde8b81419a7ed6bdbef7d3390cbf2463d0838`；已由用户 Push 并进入 PR #4，不是 V8.1 复审最终 Commit |
| V8.1 主线同步 Commit | `f39c29dad2ddd3c2eb1d5924cff67d2ff825601d`；作为本轮复审改动的父提交，随任务分支更新进入 PR |
| Android UI 设计版本 | `P2A-UI-2026.09.04-draft1` |
| Contract | `contracts/openapi.yaml`；`1.2.0-contract` / `RC` |
| Contract SHA-256 | `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a` |
| P2W 设计交付 | 离线 Commit `9140fd3c41994b8cd7f2ad64729abeafad644267` |
| Web 学生端 UI | 离线 Commit `2ec249166d9c27404cef97a814a9dbc2f9a5adec` |
| Web 离线交付 HEAD | `codex/web-ui-local-preview` / `74b616653cbae36670c8c9b284c240be7438d480`；Mac 压缩包交付，未上传 GitHub |

业务含义只以当前 V8.1 四份正文为唯一权威：[总业务流程](../../business/00-overview.md)、[学生端](../../business/10-student-flow.md)、[教师端](../../business/20-teacher-flow.md)、[管理员端](../../business/30-admin-flow.md)。README、AGENTS、STATUS、旧代码和历史 handoff 只用于治理或迁移参考。原 15 步各批次 handoff 中固定到 `49d992a...` / V8.0 的版本、结论和待定项是当时的执行快照；与 V8.1 冲突时不得继续作为当前要求，其中“教师退回原因固定分类待定”已经被 `BD-20260904-01/02` 取代。

## 2. 本次完成内容

本次从聚合仓库的 `BNBU-ANDROID` 基线实施学生端 Compose UI，按 Web 已交付学生端的信息分组和跨角色流程对齐，但保留 Android 的导航、返回、相机/麦克风、系统权限和屏幕适配方式，不要求像素级一致。

主要交付：

1. 五个主标签：首页、课程、打卡、记录与进度、我的；移除学生可达 UI 中的最终成绩、换算分、等级和排名表达。
2. 首页和进度使用 1,200 分钟总目标、两类进度、实际/有效/计入时长区分；`PENDING` 对学生呈现“已退班”。
3. `PAGE-STU-030—035` 入班 UI：登录前/后扫码、手动邀请码、确认和独立结果呈现；不伪造正式入班成功。
4. `PAGE-STU-040—043` 运动、取证、材料提交/恢复和游泳延迟说明 UI；每版最多 6 张图片与 1 段 MP4 的文案和呈现边界。
5. `PAGE-STU-050—052` 记录、详情和原始耐力结果；学生端不进行耐力换算分披露。
6. `PAGE-STU-060—061` 一次补充任务/受理结果，以及 `PAGE-STU-070` 免测/认证入口和状态呈现。
7. `PAGE-STU-080—088` 账户、设置、注销、已验证邮箱、帮助、反馈、关于、更新日志和隐私入口审计。
8. 九类运动 Android 矢量图标；中英文资源、48dp 触控与换行、返回/安全区/IME 等静态门禁。
9. 真机发现的三项 Android UI 问题已修复并由用户复测通过：录像按钮文字截断、已保留视频首次预览黑屏/控制器隐藏、语言切换因 Activity 重建而长时间等待。
10. R9 修正启动可见状态：系统 Splash 只交接到首个 Compose 画面；耗时检查显示 Loading，首次系统模式请求失败显示 Error + Retry，且不把失败假定为 NORMAL。Debug 可从失败页进入明确标识的本地合成 UI 评审；Staging/Release 不提供该入口。R11 已在当前真机配置下验证该无服务 UI 路径。

完整页面、流程和状态追溯：

- [交付包入口](../phase-2/android/p2a-student-ui/README.md)
- [41 页清单](../phase-2/android/p2a-student-ui/page-inventory.md)
- [用户流程](../phase-2/android/p2a-student-ui/user-flows.md)
- [七状态矩阵](../phase-2/android/p2a-student-ui/state-matrix.md)
- [交互与无障碍说明](../phase-2/android/p2a-student-ui/interaction-accessibility.md)
- [实施范围](../phase-2/android/p2a-student-ui/implementation-scope.md)
- [人工验收记录](../phase-2/android/p2a-student-ui/manual-acceptance-record.md)

## 3. 变更范围

以固定 V8.1 基线 `8c982682...` 对当前待提交工作树比较，最终 PR 范围共 116 个文件；其中 103 个为已跟踪差异，13 个为待提交新增文件。按用途为：

- 63 个 Android UI/展示模型/资源及 source-set 文件；
- 29 个 JVM 或 Android UI 测试文件；
- 24 个 Phase 2 设计、审计、验证和交接文档。

生产变更集中在：

- `BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/MainActivity.kt`
- `BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/core/designsystem/**`
- `BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/{shell,dashboard,courses,checkin,grades,notifications,profile,exemption,feedback,help,guide,login,common}/**`
- `BNBU-ANDROID/app/src/main/res/{drawable,values,values-en}/**`
- 对应 `app/src/test/**` 与 `app/src/androidTest/**`
- `docs/rebuild/phase-2/android/p2a-student-ui/**` 和同名前缀 handoff

禁止范围复核为空：没有修改 `contracts/**`、Backend、Web、`infra/**`、`tests/e2e/**`、`docs/business/**`、`docs/rebuild/STATUS.md`，也没有修改被冻结的 `core/model`、`core/data`、`core/network`、`core/exercise`、`core/state`、`core/review`。历史 Web 压缩包和 Week 9 仓库未被清理、覆盖、stash、reset 或回退。

## 4. R10 复审后自动验证与候选产物

R3—R9 全部源码修正完成后，R10 最终执行：

```text
./gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest --no-daemon --offline
```

当前结果如下；初版和 R8 中间产物均不再作为本轮候选：

- Gradle：BUILD SUCCESSFUL in 2m 13s。
- JVM：437/437，78 suites；0 failures、0 errors、0 skipped。
- Lint：0 error、5 个既有 warning。
- Debug APK：27,459,431 bytes；SHA-256 `a2c6a49a5e54830cec3b123ee3ebe03a7ceb4ea28dc3b1291687f5f20c97ecdb`。
- AndroidTest APK：997,437 bytes；SHA-256 `3aac4e39ce7666836f9e25c0e9638bae031b9b41d01209b0b26dbb9db52ef62c`。
- 19 项 instrumentation 源码已编译，其中 CoreJourney 14 项；未连接设备运行，不得表述为设备自动化通过。
- Debug APK 的 v2 签名验证通过；包名 `edu.bnbu.student.mvp.debug`，版本 `0.1.0-mvp-debug`，minSdk 26、targetSdk 35、debuggable。此为 Debug 签名与磁盘元数据，不是发布批准。

详细证据见 [第 13 步自动验证](phase-2-p2a-android-student-ui-automated-validation.md) 和 [第 14 步结论](phase-2-p2a-android-student-ui-manual-acceptance.md)。构建成功、静态测试和本轮真机走查均不等于完整业务测试通过。

## 5. 真机结论

- R11 使用 R10 Debug APK 在用户自有真机全新安装后完成指定回归；有逐项文字证据的页面为 8/41，覆盖深度不一，不能外推为完整页面或业务流程通过。
- 分钟卡片 `960 / 1200 分钟`、`80%` 和剩余 240 分钟符合 V8.1，不是缺陷。
- 录像按钮、视频首次预览和中英文切换三项现场问题已修复并复测通过。
- 冷启动请求失败的根因之一是当前没有 Backend，且 Debug 默认 `10.0.2.2:13000` 对真机不可达；真实系统模式和生产地址由 Backend/部署阶段提供。R10 真机回归确认 Logo 及时交给 Loading，无服务 Error、Retry 和本地 UI 评审入口通过，未再出现长时间白/黑屏。
- 首页、课程、打卡、记录与进度、我的五个主页面的指定 NORMAL 导航/滚动/返回/布局检查通过；记录与进度页切后台约 10 秒后返回保持页面且无空白。
- 没有逐页完成 41 页 × 七状态的设备证据；设备 instrumentation、TalkBack 全量焦点、全部横竖屏/字体组合和 Reviewer 签认仍未完成。

## 6. 未在本阶段解决的问题

| 类别 | 证据 / 影响 | 后续归属 |
|---|---|---|
| Backend | 当前没有新 Backend；旧 API 仍存在，真实加载、权限、登录、入班、上传、审核、通知、注销和恢复不可验收 | Backend + Android 联调阶段 |
| Contract | 固定 Contract 未完整表达 V8.1 分钟、细分审核阶段、六类公开原因、系统逾期原因、维护暂停/续计、补充版本、邀请宽限、游泳截止、耐力日期、认证分配和通知投影 | Contract Owner 发布新版本；Android 不自行修改 OpenAPI |
| 入班 | Contract、旧 Android 快照与 V8.1 入班结果/宽限/email proof 语义不一致 | `PENDING-P2A-JOIN-CONTRACT-01`、`PENDING-P2A-INVITE-GRACE-01`、`PENDING-P2A-PRELOGIN-EMAIL-01` |
| 旧运动核心 | 不足 60 分钟结束会清理，和“保留实际运动事实”冲突；材料页依赖 Finished | 后续领域/Backend 阶段，不在 UI 阶段擅改 |
| 上传/媒体 | 游泳前后照版本、锁定批次续传、24/72 小时截止无正式数据；免测 UI 10MB 与旧媒体核心 8MB 不一致 | Contract/Backend/媒体适配阶段 |
| V8.1 UI 复审 | R3—R9 已修正通知误删、维护补证计时、六类原因、细分审核阶段、共享色对比度、样例 source-set 隔离和启动可见状态；R10 全量本地自动验证通过；R11 指定真机回归通过 | Reviewer 签认、未触发页面/七态与生产数据仍未完成；生产事实由 Contract/Backend 提供 |
| 通知 | Android FCM/系统 Push 仍启用，V8.1 只允许站内通知 | `BLOCK-P2A-PUSH-01`；这是非 Compose Android 工程任务，需领导扩大 Manifest/Gradle/core-push 写入范围 |
| 隐私 | 双语政策仍含旧 Push/成绩描述及待定公示信息，英文待法律审阅 | `BLOCK-P2A-PRIVACY-01`；运营/隐私负责人提供定稿 |
| UI 证据 | 部分页/异常态缺快速评审入口，通知独立错误/加载、草稿安全、全量无障碍与设备证据未关闭；R7 已关闭共享色 token 的 4.5:1 源码门禁，但尚未经设备视觉签认 | 后续 UI/设计 Reviewer 决定是否补批，不能全部归为 Backend |
| Release | R8 已将补证、帮助、耐力运行时样例及设计 Preview 物理隔离到 Debug source set；Release APK 仍未构建和检查 | 源码门禁已关闭；发布环境仍须用真实 HTTPS/Firebase/签名材料检查正式产物，不用 Debug 评审代替 |
| 治理 | Android Owner、Android Reviewer、Web 跨端 Reviewer 仍未具名 | 领导指定人员并完成 Reviewer 记录 |

详细接口/业务差异见 [第 11 步集成审计](phase-2-p2a-android-student-ui-integration-audit.md)；七态、恢复和无障碍差异见 [第 12 步审计](../phase-2/android/p2a-student-ui/seven-state-accessibility-audit.md)。这些问题是“已记录并延期”，不是“已解决”或“已由样例验证”。

## 7. Reviewer 建议审核顺序

1. 先读本文，核对固定基线、范围边界、自动/人工验证与未完成项。
2. 核对 41 页清单、用户流程、状态矩阵和交互/无障碍说明是否能追溯到 V8.1 四份正文。
3. 在 PR 中重点审查：学生端无分数/等级/排名；1,200 分钟与三种时长；`PENDING → 已退班`；待 AI/待教师/待补证/技术处理中；六类公开原因及系统逾期原因；维护暂停补证计时；提交只等于受理；一次补证；站内通知语义；Web/Android 信息分组一致但平台交互可适配。
4. 检查登录/入班、运动取证、记录/补充、免测/认证及账户帮助页面，以及三项真机修复。
5. 确认演示数据均有明确标识，未以本地样例宣称真实写入、审核或接口成功。
6. 检查 PR Files changed 不包含禁止目录；确认 Contract SHA-256 未变化。
7. Android Reviewer 与 Web 学生端负责人完成跨端一致性核对，并在本文或 PR 留下验收结论；正式功能验收留待 Backend/Contract 可用后。

## 8. PR 信息

- Base：`main`
- Compare：`codex/phase2-android-student-ui`
- 建议标题：`feat(android): align Phase 2 student UI with V8.1`
- PR 正文：[可复制模板](../phase-2/android/p2a-student-ui/pull-request-body.md)
- 给领导的两段话：[可直接发送模板](../phase-2/android/p2a-student-ui/leader-review-messages.md)
- `docs/rebuild/STATUS.md` 由指定汇总人更新，本提交按约定不修改。
