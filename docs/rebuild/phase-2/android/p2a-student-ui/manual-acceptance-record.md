# 第 14 步：人工验收记录

状态：**COMPLETE WITH LIMITATIONS — 本轮可达 UI 真机走查及三项缺陷复测已完成。** 这不等于 41 页七状态、接口或完整业务验收通过。

第 13 步 Debug APK 已安装到用户自有真机。用户随后安装当前三项 UI 修复候选包并确认三项均已通过复测，暂未发现其他问题。首批截图和复测文字确认只作为当前设备配置下的可见结果；包含周边环境的录像截图不复制到仓库。

关联 [操作指南](manual-acceptance-guide.md) 和 [第 11 步静态审计](../../../handoffs/phase-2-p2a-android-student-ui-integration-audit.md)。

## 运行信息

| 字段 | 当前记录 |
|---|---|
| 运行编号 / 操作者 / 时间 | `S14-RUN-PHONE-01` / 用户 / 2026-09-05；准确时间待补 |
| 设备名称 / Android 版本 / API / 分辨率 | 用户自有真机；型号、系统/API、分辨率待补。已创建的模拟器未用于本次现象 |
| 语言 / 主题 / 字体比例 / 方向 / TalkBack | 待填 |
| 实际安装包 SHA-256 | 用户确认安装第 13 步候选包；候选包 `e5cf24ad6b6ef6c1bc4d43c25e68947c4104296f2d01f03133f4763a599cc7f1`，设备端未独立计算指纹 |
| 当前三项 UI 修复后复测 APK | `app/build/outputs/apk/debug/app-debug.apk`；构建机 SHA-256 `edfd9b1c580aac1d66fc50443c676c68a3badac68534acdf78810da787688aa1`；25,824,014 bytes；用户确认已复测，设备端未独立计算指纹 |
| 基线 / 分支 | `49d992a1333294ea561923cfea0b7d25864a4d91` / `codex/phase2-android-student-ui`；UI 未提交 |
| 设计版本 | `P2A-UI-2026.09.04-draft1` |
| Android Owner / Reviewer / Web Reviewer | `PENDING-P2A-OWNER-01` |

结果值：`NOT_RUN` 未运行；`PARTIAL` 已观察页面的一部分但尚未完成该页全部检查；`PASS` 已观察且符合该项预期；`FAIL` 已观察到不符合；`BLOCKED` 因明确前提缺失无法运行。一个页面正常态 PASS 不代表七状态全部通过。

## 41 页验收台账

“入口条件”来自源码核对，实际可达性待用户验证。已知不可触发项在问题登记中保留，不伪造现场 BLOCKED 结果。

| 页面 | 名称 | 入口条件 / 当前限制 | 结果 | 已测状态、证据与问题 |
|---|---|---|---|---|
| PAGE-STU-001 | 启动与中断恢复 | 真机冷启动；没有新 Backend | FAIL | S14-DEVICE-01：用户观察到 Logo 长时间停留，或 Logo 后出现白屏/黑屏；持续时间、网络条件和截图待补 |
| PAGE-STU-002 | 系统维护 | local 模式缺维护切换入口 | NOT_RUN | S14-GAP-02 |
| PAGE-STU-003 | 首次隐私同意 | 首次安装；政策最终内容有阻塞 | NOT_RUN | 待填 |
| PAGE-STU-004 | 登录前引导 | 首次未完成引导 | NOT_RUN | 待填 |
| PAGE-STU-005 | 登录方式 | 引导→直接登录 | NOT_RUN | 待填 |
| PAGE-STU-006 | 邮箱登录 | 登录页→邮箱；只看表单 | NOT_RUN | 待填 |
| PAGE-STU-007 | 登录前隐私 | 登录页政策链接 | NOT_RUN | 待填 |
| PAGE-STU-008 | 身份恢复 | 登录页恢复入口；受理缺服务 | NOT_RUN | 待填 |
| PAGE-STU-009 | 强制绑定 | 缺对应身份和评审切换入口 | NOT_RUN | S14-GAP-02 |
| PAGE-STU-010 | 入班后引导 | 本地学生有成员资格且未完成引导时 | NOT_RUN | 待填 |
| PAGE-STU-020 | 首页 | 本地学生入口 | PARTIAL | S14-DEVICE-02：NORMAL 首页可见；进度卡正确显示 `960 / 1200 分钟`、`80%` 和“还差 240 分钟”，符合 V8 分钟口径；其余首页状态待测 |
| PAGE-STU-021 | 课程 | 底部课程→课程/历史卡片 | NOT_RUN | 待填 |
| PAGE-STU-022 | 打卡准备 | 底部打卡→自主运动 | NOT_RUN | 待填 |
| PAGE-STU-023 | 记录与进度 | 底部记录与进度 | NOT_RUN | 待填 |
| PAGE-STU-024 | 我的 | 底部我的 | NOT_RUN | 待填 |
| PAGE-STU-025 | 通知 | 首页通知入口；可能过滤为空 | NOT_RUN | 待填 |
| PAGE-STU-030 | 登录前扫码 | 退出评审→扫码；拒绝相机与返回 | NOT_RUN | 待填 |
| PAGE-STU-031 | 登录前邀请确认 | 缺邀请解析/预览事实 | NOT_RUN | S14-GAP-02 |
| PAGE-STU-032 | 登录后扫码 | 仅无有效班成员可显示入口 | NOT_RUN | S14-GAP-02 |
| PAGE-STU-033 | 手动邀请码 | 登录前扫码→手动输入；空值禁用 | NOT_RUN | 待填 |
| PAGE-STU-034 | 入班确认 | 缺正式预览和可选评审态 | NOT_RUN | S14-GAP-02 |
| PAGE-STU-035 | 入班结果 | 缺成功/拒绝等状态展示入口 | NOT_RUN | S14-GAP-02 |
| PAGE-STU-040 | 运动会话 | 本地自主运动→开始；存在旧计时规则 | NOT_RUN | S14-GAP-01 |
| PAGE-STU-041 | 证据采集 | 依赖旧 Finished，缺快速入口 | PARTIAL | S14-DEVICE-03、04 已在当前候选包复测通过；录像控制文案完整，已保留视频可直接看到首帧和控制器。其余证据采集状态仍受 S14-GAP-01 限制 |
| PAGE-STU-042 | 上传与恢复 | 材料页及真实锁定批次条件缺失 | NOT_RUN | S14-GAP-01、02 |
| PAGE-STU-043 | 游泳延迟 | 依赖游泳 Finished；提交禁用 | NOT_RUN | S14-GAP-01 |
| PAGE-STU-050 | 记录列表 | 记录与进度/打卡记录 | NOT_RUN | 待填 |
| PAGE-STU-051 | 记录详情 | 点击合成记录 | NOT_RUN | 待填 |
| PAGE-STU-052 | 原始耐力 | 记录与进度内卡片 | NOT_RUN | 待填 |
| PAGE-STU-060 | 一次补充任务 | 记录与进度→本地补充样例 | NOT_RUN | 待填 |
| PAGE-STU-061 | 补充已接收 | 任务→已接收评审样例 | NOT_RUN | 待填 |
| PAGE-STU-070 | 免测/认证 | 我的→免测/认证；只看样例/表单 | NOT_RUN | 待填 |
| PAGE-STU-080 | 账户资料 | 我的→账户信息 | NOT_RUN | 待填 |
| PAGE-STU-081 | 设置 | 我的→设置 | PARTIAL | S14-DEVICE-05 已在当前候选包复测通过：中英文在当前页面原地切换，不再因主动重建 Activity 重走启动门控；其余设置状态未逐项取证 |
| PAGE-STU-082 | 注销 | 设置→注销；只查看限制 | NOT_RUN | 待填 |
| PAGE-STU-083 | 已验证邮箱 | 设置→邮箱；只看表单/状态 | NOT_RUN | 待填 |
| PAGE-STU-084 | 帮助 | 设置→帮助；搜索空态 | NOT_RUN | 待填 |
| PAGE-STU-085 | 反馈 | 设置→反馈；提交未接入 | NOT_RUN | 待填 |
| PAGE-STU-086 | 关于 | 设置→关于 | NOT_RUN | 待填 |
| PAGE-STU-087 | 更新日志 | 关于→更新日志 | NOT_RUN | 待填 |
| PAGE-STU-088 | 隐私 | 设置→隐私；法律内容未确认 | NOT_RUN | 待填 |

## 状态与交互证据

逐项追加，每行只记录一个已执行页面/状态。七状态为 NORMAL、LOADING、EMPTY、ERROR、FORBIDDEN、MAINTENANCE、RESUME。

| 页面 / 状态或交互 | 操作 / 配置 | 预期 | 实际观察 | 结果 | 证据 |
|---|---|---|---|---|---|
| PAGE-STU-020 / NORMAL / 分钟进度 | 本地免登录评审数据；用户自有真机 | 按 V8 显示分钟总量、比例和剩余分钟，不再显示小时 | `960 / 1200 分钟`、`80%`、“距离总目标还差 240 分钟”均完整可见 | PASS | 用户截图附件；未复制进仓库 |
| PAGE-STU-041 / NORMAL / 视频录制中 | 开始录像后观察底部控制区 | 暂停、结束、重拍文字在常见真机宽度和当前字体配置下均完整显示 | “结束”被截为“结”；暂停和重拍可见 | FAIL | 用户截图附件；因包含周边屏幕内容未复制进仓库 |
| PAGE-STU-041 / NORMAL / 已保留视频预览 | 点击刚录制并已保留的视频 | 无需盲点屏幕即可看见首帧和播放控制 | 初始全黑且无控制器；点击屏幕才出现控制器，再点击播放后视频画面正常 | FAIL | 用户连续 3 张截图；包含周边屏幕内容，不复制进仓库 |
| PAGE-STU-081 / 中文↔英文 | 设置中点击另一种语言 | 当前页面内及时更新，不能因语言切换重复完整启动等待 | 长时间无响应后才切换；源码确认触发 `Activity.recreate()` 并重新运行启动门控 | FAIL | 用户文字观察；无截图 |
| PAGE-STU-041 / NORMAL / 视频录制中复测 | 安装当前三项修复候选包后重新录像 | 暂停、结束、重拍文字完整显示 | 用户确认显示问题已修复 | PASS | 用户 2026-09-05 文字确认；无新增仓库截图 |
| PAGE-STU-041 / NORMAL / 已保留视频预览复测 | 安装当前候选包后打开刚录制并保留的视频 | 进入时可见首帧和播放控制，无需盲点屏幕 | 用户确认黑屏/控制器不可发现问题已修复 | PASS | 用户 2026-09-05 文字确认；无新增仓库截图 |
| PAGE-STU-081 / 中文↔英文复测 | 安装当前候选包后切换语言 | 当前页面原地及时更新，不重启完整流程 | 用户确认卡死/长等待问题已修复 | PASS | 用户 2026-09-05 文字确认；无新增仓库截图 |

中文/英文、浅色/深色、大字体、横屏、键盘、TalkBack、返回、相机拒绝、后台恢复分别记录；不能使用“全部正常”替代可追溯结果。

## 已知问题与本次新发现

下列为准备阶段的源码证据，不是设备复现结论。已有业务/接口缺口继续以各批 handoff 为详细依据。

| 编号 | 证据 / 问题 | 影响与归属 | 当前处理 |
|---|---|---|---|
| S14-DEVICE-01 | 用户在自有真机打开第 13 步 Debug APK 时观察到 Logo 长时间停留，或出现白/黑空白画面。源码中 Splash 要等待 `isSystemModeChecked`；Compose 根内容同样等该状态。首次系统模式请求指向 Debug 默认 `10.0.2.2:13000`，共享客户端连接超时为 10 秒；真机没有该模拟器回环映射且当前没有 Backend | PAGE-STU-001 启动体验失败；现阶段与缺失 Backend/真机不可访问 Debug 地址直接相关，后续仍需在真实服务可用时复核客户端启动门控 | 按用户决定记录并交后续 Backend/联调阶段；本阶段不修改启动逻辑，不把查询失败显示成业务成功 |
| S14-DEVICE-02 | 首页进度卡在真机显示 `960 / 1200 分钟`、`80%` 和剩余 240 分钟 | 这是 V8 固定分钟口径的正确显示，不是缺陷；只能证明当前 NORMAL 样例 | 已记录 PAGE-STU-020 单项 PASS；不改代码 |
| S14-DEVICE-03 | 录像中底部“结束”按钮在用户当前真机/字体配置下只显示“结”。原布局让暂停/结束水平图标加单行文字共享窄宽，结束按钮权重还更小 | PAGE-STU-041 大字体与常见真机宽度 UI 失败；Android UI 范围内 | **CLOSED（当前设备配置）**：改为等宽、图标在上/文字在下、最多两行；用户确认当前候选包复测通过 |
| S14-DEVICE-04 | 点击已确认保留的视频后初始全黑且播放器控制器隐藏；点屏幕、再点播放后视频和进度均正常，证明本地文件可读取和解码。原预览只设置 URI/控制器，没有首帧定位或主动显示控制器 | PAGE-STU-041 预览可发现性失败；Android UI/播放器呈现范围内，不是 Backend 问题 | **CLOSED（当前设备配置）**：准备后定位首个可见帧并主动显示控制器，保持暂停；用户确认当前候选包复测通过 |
| S14-DEVICE-05 | 中英文切换后长时间无响应。原设置页显式调用 `Activity.recreate()`，重建会重新执行缺 Backend 的系统模式检查 | PAGE-STU-081 语言切换体验失败；Activity 重建是 Android 实现行为，额外等待复用了 S14-DEVICE-01 的启动门控 | **CLOSED（当前设备配置）**：改为 Compose 本地化上下文原地更新，不重建 Activity；用户确认当前候选包复测通过 |
| S14-GAP-01 | `ExerciseSessionState.kt` 最小门槛 60 分钟；`ExerciseSessionController.requestFinish()` 沿用旧清理行为；材料页依赖 Finished，UI 无快速样例入口 | 040—043 取证受限；旧核心属于后续业务阶段，可评审入口属于 UI 可评审性缺口 | 记录；不改核心，不等一小时/改时间来冒充完成 |
| S14-GAP-02 | 邀请确认/结果、强制绑定、维护、业务无权限、真实上传恢复没有统一可选评审场景；local 系统模式固定正常 | 41 页七状态不能全部人工验收；不能仅归因无 Backend 而视为设计通过 | 待单独 UI 场景补充或后续服务接入；未实现、未批准新批次 |
| S14-GAP-03 | 旧本地学生/课程/记录样例仍含旧日期与小时容器；一次补充备注由固定空值/空回调承载 | 可观察静态展示，不能据此证明全部时间逻辑或表单草稿恢复 | 标明虚构/受限样例；观察与旧核心规则分开记录 |
| BLOCK-P2A-F-01 / 02 | FCM 行为与 v8 站内通知冲突；双语隐私文本需正式确认 | 发布/法律验收阻塞 | 保留第 8 步登记，未修改政策/Push |
| PENDING-P2A-BE-01 | 无 Backend，旧 API 仍在 | 正式接口和功能不可验收 | Phase 2 只验 UI，不用样例关闭缺口 |
| PENDING-P2A-OWNER-01 | Owner/Reviewer 未提供真实姓名 | 无正式签字 | 待用户或领导填写 |
| S13-RELEASE-01 | Release 工作区入口已禁用，但补充任务样例函数仍在 main 源集；未构建/检查 Release APK | 源码入口隔离不等于样例已从包体移除；发布前需独立关闭 | 仅使用 Debug 做 UI 评审，不作为正式发布验收 |

## S14-DEVICE-03 UI 修复本地验证

- 命令：`./gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest --no-daemon --offline`
- 结果：BUILD SUCCESSFUL；JVM 406/406、0 failures、0 errors、0 skipped；Lint 0 error、5 个既有 warning。
- 新增静态策略：录像进行中/暂停态使用等权重的录像专用动作按钮，文字最多两行并居中；4/4 `ExerciseV8UiStaticPolicyTest` 通过。
- Debug APK：26,312,992 bytes；SHA-256 `21c2bb87271a8a3a40af187864d1dcfd4d9504f10c3932c1c7a0777916f0d0db`。
- AndroidTest APK 已编译但未连接设备运行；编译和静态测试不等于真机缺陷已关闭。

## S14-DEVICE-04 / 05 UI 修复本地验证

- 命令：`./gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest --no-daemon --offline`
- 结果：BUILD SUCCESSFUL；JVM 408/408、0 failures、0 errors、0 skipped；Lint 0 error、5 个既有 warning。
- 视频策略测试：预览包含准备监听、首帧定位和控制器主动显示；5/5 `ExerciseV8UiStaticPolicyTest` 通过。
- 语言策略测试：设置页不再调用 `recreate()`，根 Compose 注入随选择变化的本地化 Context/Configuration；4/4 `AccountSupportV8UiStaticPolicyTest` 通过。
- 当前 Debug APK：25,824,014 bytes；SHA-256 `edfd9b1c580aac1d66fc50443c676c68a3badac68534acdf78810da787688aa1`。
- Contract SHA-256 仍为 `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`，未修改。AndroidTest APK 只编译、未在设备运行。

用户新问题模板：编号 / 页面 / 设备与配置 / 操作 / 预期 / 实际 / 截图 / 影响 / UI或后续阶段归属 / 处理状态。

## Reviewer 记录

| 项目 | 状态 |
|---|---|
| Android Reviewer | PENDING |
| Web 跨端一致性核对 | PENDING；参考离线包，不宣称已有 Web PR |
| 已执行页面/状态数量 | 有明确逐项证据的 4 页：PAGE-STU-020 分钟显示通过；PAGE-STU-041 两项缺陷修复后通过；PAGE-STU-081 语言切换修复后通过；PAGE-STU-001 启动问题按阶段边界延期。用户完成其余可达 UI 走查并表示暂未发现其他问题，但没有逐页/七态证据，不能记为 PASS |
| 已收到截图 | 5；均为对话附件，不复制进仓库 |
| 阻塞与豁免确认 | PENDING；缺测不自动豁免 |
| 第 14 步结论 | COMPLETE WITH LIMITATIONS；本轮真机走查结束，三项 Android UI 缺陷复测通过。启动问题、不可达页面、七态/无障碍取证、设备自动化和 Reviewer 签字继续保留，不算完整业务验收 |

自动测试参考：[第 13 步](../../../handoffs/phase-2-p2a-android-student-ui-automated-validation.md) JVM 405/405、Lint 0 error/5 warning、Debug/AndroidTest APK 重新构建通过。第 14 步第二轮 UI 修复后 JVM 为 408/408，Lint 仍为 0 error/5 warning，并生成当前 Debug APK。9 项 CoreJourney（全部 instrumentation 源码合计 14 项）只编译、未连接设备执行。这些结果不得填入上面的人工 PASS 栏。
