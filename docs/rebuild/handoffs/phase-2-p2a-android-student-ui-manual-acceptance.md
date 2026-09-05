# 第 14 步交接：Android 人工验收记录与结论

日期：2026-09-05。Phase 2 / P2A。完成状态：**COMPLETE WITH LIMITATIONS**。

本轮指定真机回归已结束。用户确认启动门禁、五个主页面、普通后台返回以及三项现场 UI 缺陷在 R10 候选包中通过，暂未发现其他问题。该结论只覆盖本次实际走查和明确记录的复测项，不表示 41 页七状态、接口或完整业务流程通过。

## 1. 基线与候选包

- 仓库：`chchaiai/new_need_version_sports`。
- 当前业务权威：`main` 固定 Commit `8c9826822f35876f8d01480f8baf184027711dfe`（V8.1）；原 Android 实施基线为 `49d992a1333294ea561923cfea0b7d25864a4d91`。
- 分支：`codex/phase2-android-student-ui`；PR #4 已存在，V8.1 复审最终 Commit/Push 由用户手动完成。
- 设计版本：`P2A-UI-2026.09.04-draft1`。
- Contract：`1.2.0-contract` / `RC` / SHA-256 `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`，只读且未修改。
- R10 当前 Debug 候选 APK：`BNBU-ANDROID/app/build/outputs/apk/debug/app-debug.apk`，27,459,431 bytes，构建机 SHA-256 `a2c6a49a5e54830cec3b123ee3ebe03a7ceb4ea28dc3b1291687f5f20c97ecdb`；用户已传至自有真机并全新安装，设备端未独立计算指纹。
- 真机、模拟器与人工操作由用户负责；本轮使用用户自有真机，设备端未独立计算 APK 指纹。

## 2. 实际观察与复测

| 编号 | 页面 / 现象 | 初次结果 | 当前结果 |
|---|---|---|---|
| `S14-DEVICE-01` | PAGE-STU-001 冷启动 Logo 停留较久，或短暂白屏/黑屏 | FAIL | **PASS（当前真机配置）**。R10 全新安装后 Logo 及时交接，Loading、无服务 Error、Retry 和 Debug 本地 UI 评审入口均通过；真实服务成功路径未测 |
| `S14-DEVICE-02` | PAGE-STU-020 显示 `960 / 1200 分钟`、`80%`、剩余 240 分钟 | PASS | V8 分钟口径正确，不是缺陷 |
| `S14-DEVICE-03` | PAGE-STU-041 录像底部“结束”只显示“结” | FAIL | **PASS**。录像动作改为等宽、图标在上、文字在下并支持两行；用户确认真机复测通过 |
| `S14-DEVICE-04` | PAGE-STU-041 已保留视频初始黑屏且控制器隐藏 | FAIL | **PASS**。播放器准备后显示首帧与控制器，保持暂停、不自动播放；用户确认真机复测通过 |
| `S14-DEVICE-05` | PAGE-STU-081 切换中英文长时间卡住 | FAIL | **PASS**。语言通过 Compose 本地化上下文原地更新，不再主动重建 Activity；用户确认真机复测通过 |
| `S14-DEVICE-06` | PAGE-STU-020—024 五个主页面及普通后台返回 | NOT_RUN | **PASS（指定正常态检查）**。用户确认导航、滚动、返回、底栏遮挡、主要文案/信息分组均通过；PAGE-STU-023 切后台约 10 秒后返回保持页面且无空白 |

详细逐页状态、首轮截图说明及复测证据见 [人工验收记录](../phase-2/android/p2a-student-ui/manual-acceptance-record.md)。对话截图包含现场环境，不复制进仓库；复测结论来自用户 2026-09-05 的文字确认。

## 3. 验证边界

- R10 命令：`./gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest --no-daemon --offline`。
- 结果：BUILD SUCCESSFUL in 2m 13s；JVM 437/437、78 suites，0 failures、0 errors、0 skipped；Lint 0 error、5 个既有 warning、0 informational。
- Debug APK 和 AndroidTest APK 均构建通过；19 项 instrumentation 源码中 CoreJourney 14 项，未连接设备执行，不能写成设备自动化通过。
- R9 启动纯逻辑/源码门禁包含在全量 437 项中；PAGE-STU-001 的新包真机指定回归另由用户确认通过。
- 本轮没有 Backend，没有执行真实登录、入班、上传、审核、通知、注销或上传/会话中断恢复验收；普通页面切后台返回通过不能替代这些流程。
- 41 页的全部 NORMAL/LOADING/EMPTY/ERROR/FORBIDDEN/MAINTENANCE/RESUME 状态没有逐项设备证据；用户“暂未发现其他问题”不能替代这些 PASS 记录。

## 4. 继续保留的问题

- `S14-GAP-01—03`：旧 60 分钟会话门槛、部分页面/异常态缺快速评审入口、旧样例和草稿恢复边界。
- `S12-UI-01—03`、`S12-SEC-01`、`S12-RESUME-01`、`S12-DOMAIN-01`、`S12-CONTRACT-01`、`S12-MEDIA-01`、`S12-COLOR-01`、`S12-EVIDENCE-01`：详见七态与无障碍审计。
- 无新 Backend、Contract 尚未完整表达 V8、旧 API 仍存在；这些均未在 UI 阶段解决或验收。
- Android FCM/系统 Push 与 V8 仅站内通知冲突；双语隐私政策仍需正式运营/法律文本。
- R8 已完成运行时评审数据与设计 Preview 的 Debug source-set 物理隔离；Release APK 产物检查、设备 instrumentation、Owner/Reviewer 具名与正式签字尚未完成。

## 5. 范围声明

- 未修改四份 V8.1 业务正文、Contract、Backend、Web、数据库、部署配置和 `docs/rebuild/STATUS.md`。
- 未执行 reset、clean、stash、删除、回退或覆盖历史仓库；Week 9 目录保持原状。
- 第 14 步到此完成，但结论是“指定 UI 真机回归及已知 UI 缺陷复测通过”，不是“完整业务测试通过”。
- 下一步为最终交接、用户手动 Commit/Push 更新现有 PR #4，随后由指定 Reviewer 复审。
