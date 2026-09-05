# 第 14 步：人工验收记录

状态：**COMPLETE WITH LIMITATIONS — R2-05 指定真机回归通过，未覆盖项逐项保留。** 这不等于 41 页七状态、接口或完整业务验收通过。

R10 Debug APK 已由用户传至自有真机并全新安装。用户确认启动门禁、五个主页面、后台返回以及既有三项 UI 缺陷通过指定复测；随后发现英文通知固定文案未切换、英文视频预览底部说明被裁切，并明确要求继续使用原有系统启动页。第一版修复候选中，英文通知和原启动页已通过；视频安全区修复仍失败，因此当前候选改为中英文统一删除该非业务说明。2026-09-06，用户确认最终视频复测通过。截图和复测文字只作为当前设备配置下的可见结果；包含周边环境的录像截图不复制到仓库。

关联 [操作指南](manual-acceptance-guide.md) 和 [第 11 步静态审计](../../../handoffs/phase-2-p2a-android-student-ui-integration-audit.md)。

## 运行信息

| 字段 | 当前记录 |
|---|---|
| 运行编号 / 操作者 / 时间 | `S14-RUN-PHONE-01` / 用户 / 2026-09-05；准确时间待补 |
| 设备名称 / Android 版本 / API / 分辨率 | 用户自有真机；型号、系统/API、分辨率待补。已创建的模拟器未用于本次现象 |
| 语言 / 主题 / 字体比例 / 方向 / TalkBack | 待填 |
| 实际安装包 SHA-256 | 用户确认安装第 13 步候选包；候选包 `e5cf24ad6b6ef6c1bc4d43c25e68947c4104296f2d01f03133f4763a599cc7f1`，设备端未独立计算指纹 |
| 当前三项 UI 修复后复测 APK | `app/build/outputs/apk/debug/app-debug.apk`；构建机 SHA-256 `edfd9b1c580aac1d66fc50443c676c68a3badac68534acdf78810da787688aa1`；25,824,014 bytes；用户确认已复测，设备端未独立计算指纹 |
| R10 V8.1 复审候选 APK | `app/build/outputs/apk/debug/app-debug.apk`；27,459,431 bytes；SHA-256 `a2c6a49a5e54830cec3b123ee3ebe03a7ceb4ea28dc3b1291687f5f20c97ecdb`；用户已传至未连接电脑的自有真机并全新安装，设备端未独立计算指纹 |
| R2-05 最终视频复测 APK | `app/build/outputs/apk/debug/app-debug.apk`；27,463,039 bytes；SHA-256 `c98e30158d687056292c790fe85bd30cb6606cb673ef92a74ed8aa7d9b51183f`；447/447 JVM、22/22 AVD instrumentation 通过；用户于 2026-09-06 确认真机复测通过，设备端未独立计算指纹 |
| R2-06 最终 Commit 强制重建 APK | `app/build/outputs/apk/debug/app-debug.apk`；25,853,071 bytes；SHA-256 `216561a78dc570dbb400d9789ff83b1184f9614cf3c1341ef753d30400b56ebc`；与 R2-05 源码相同，已由专用 AVD instrumentation 运行，未在用户真机单独重装 |
| 基线 / 分支 | `49d992a1333294ea561923cfea0b7d25864a4d91` / `codex/phase2-android-student-ui`；初版已提交并进入 PR #4，R2-06 最终候选待 Push |
| 设计版本 | `P2A-UI-2026.09.04-draft1` |
| Android Owner / Reviewer / Web Reviewer | Android Owner：`Exwind259`；Android Reviewer：当前已获 PR 审核权限的审核账号；Web Reviewer：待负责人正式指定 |

结果值：`NOT_RUN` 未运行；`PARTIAL` 已观察页面的一部分但尚未完成该页全部检查；`PASS` 已观察且符合该项预期；`FAIL` 已观察到不符合；`BLOCKED` 因明确前提缺失无法运行。一个页面正常态 PASS 不代表七状态全部通过。

## 41 页验收台账

“入口条件”来自源码核对，实际可达性待用户验证。已知不可触发项在问题登记中保留，不伪造现场 BLOCKED 结果。

| 页面 | 名称 | 入口条件 / 当前限制 | 结果 | 已测状态、证据与问题 |
|---|---|---|---|---|
| PAGE-STU-001 | 启动与中断恢复 | 真机冷启动；没有新 Backend | PASS | S14-DEVICE-01 的 Loading/Error/Retry 路径已通过；R2-DEVICE-03 原有系统启动页及品牌连续性也已由用户真机确认。真实服务成功路径未测，不由本项关闭 |
| PAGE-STU-002 | 系统维护 | local 模式缺维护切换入口 | NOT_RUN | S14-GAP-02 |
| PAGE-STU-003 | 首次隐私同意 | 首次安装；政策最终内容有阻塞 | NOT_RUN | 待填 |
| PAGE-STU-004 | 登录前引导 | 首次未完成引导 | NOT_RUN | 待填 |
| PAGE-STU-005 | 登录方式 | 引导→直接登录 | NOT_RUN | 待填 |
| PAGE-STU-006 | 邮箱登录 | 登录页→邮箱；只看表单 | NOT_RUN | 待填 |
| PAGE-STU-007 | 登录前隐私 | 登录页政策链接 | NOT_RUN | 待填 |
| PAGE-STU-008 | 身份恢复 | 登录页恢复入口；受理缺服务 | NOT_RUN | 待填 |
| PAGE-STU-009 | 强制绑定 | 缺对应身份和评审切换入口 | NOT_RUN | S14-GAP-02 |
| PAGE-STU-010 | 入班后引导 | 本地学生有成员资格且未完成引导时 | NOT_RUN | 待填 |
| PAGE-STU-020 | 首页 | 本地学生入口 | PARTIAL | S14-DEVICE-02、06：NORMAL 首页、导航、滚动和返回通过；进度卡显示 `960 / 1200 分钟`、`80%` 和“还差 240 分钟”，未出现分数/排名；其余状态待测 |
| PAGE-STU-021 | 课程 | 底部课程→课程/历史卡片 | PARTIAL | S14-DEVICE-06：用户确认当前/历史课程信息、页面进入、滚动和返回在本轮指定检查中通过；异常状态待测 |
| PAGE-STU-022 | 打卡准备 | 底部打卡→自主运动 | PARTIAL | S14-DEVICE-06：用户确认运动类型/图标可辨、页面进入、滚动和返回在本轮指定检查中通过；后续会话/异常状态不由此关闭 |
| PAGE-STU-023 | 记录与进度 | 底部记录与进度 | PARTIAL | S14-DEVICE-06：用户确认时长语义、页面进入、滚动和返回通过；停留此页切后台约 10 秒后返回，无空白且页面保持；真实中断恢复待后续阶段 |
| PAGE-STU-024 | 我的 | 底部我的 | PARTIAL | S14-DEVICE-06：用户确认页面进入、滚动、返回和可达入口/未接入提示在本轮指定检查中通过；异常状态待测 |
| PAGE-STU-025 | 通知 | 首页通知入口；可能过滤为空 | PARTIAL | R2-DEVICE-01：英文模式下 Android 自有通知面板固定文案切换已由用户真机确认；服务器通知正文不由客户端擅自翻译，其他通知状态未全部人工执行 |
| PAGE-STU-030 | 登录前扫码 | 退出评审→扫码；拒绝相机与返回 | NOT_RUN | 待填 |
| PAGE-STU-031 | 登录前邀请确认 | 缺邀请解析/预览事实 | NOT_RUN | S14-GAP-02 |
| PAGE-STU-032 | 登录后扫码 | 仅无有效班成员可显示入口 | NOT_RUN | S14-GAP-02 |
| PAGE-STU-033 | 手动邀请码 | 登录前扫码→手动输入；空值禁用 | NOT_RUN | 待填 |
| PAGE-STU-034 | 入班确认 | 缺正式预览和可选评审态 | NOT_RUN | S14-GAP-02 |
| PAGE-STU-035 | 入班结果 | 缺成功/拒绝等状态展示入口 | NOT_RUN | S14-GAP-02 |
| PAGE-STU-040 | 运动会话 | 本地自主运动→开始；存在旧计时规则 | NOT_RUN | S14-GAP-01 |
| PAGE-STU-041 | 证据采集 | 依赖旧 Finished，缺快速入口 | PARTIAL | S14-DEVICE-03、04 及 R2-DEVICE-02 最终方案均已真机复测通过；中英文视频预览统一不显示底部非业务说明，首帧、播放控制和删除操作正常。其余状态仍受 S14-GAP-01 限制 |
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
| PAGE-STU-001 / 冷启动与无服务门禁复测 | 自有真机全新安装 R10 APK 后冷启动；当前没有 Backend | Logo 及时交给可见 Loading；随后显示可理解的无服务 Error，不能长时间白屏或黑屏 | 用户确认 Logo 及时消失，出现“正在检查服务状态”，随后进入“暂时无法连接服务”，未再出现长时间白屏或黑屏 | PASS | 用户 2026-09-05 文字确认；无新增仓库截图 |
| PAGE-STU-001 / Retry 与 Debug 本地评审 | 在无服务 Error 页点击“重试”，再使用明确标识的 Debug 本地 UI 评审入口 | Retry 重新进入 Loading/错误流程；本地入口可进入合成数据评审页面 | 用户确认两项均正常 | PASS | 用户 2026-09-05 文字确认；无新增仓库截图 |
| PAGE-STU-001、041 / 首次权限门禁 | 全新安装后首次触发相机、麦克风权限请求 | 系统权限申请可出现并可正常操作，不以静默失败代替授权 | 用户确认首次相机、麦克风权限申请正常 | PASS | 用户 2026-09-05 文字确认；无新增仓库截图 |
| PAGE-STU-020 / NORMAL / 主页面回归 | 本地 UI 评审；进入首页并检查导航、滚动、返回、底栏遮挡及文案 | 页面可用；分钟口径正确；不出现学生分数或排名 | 用户确认本轮指定项目全部通过 | PASS | 用户 2026-09-05 文字确认；无新增仓库截图 |
| PAGE-STU-021 / NORMAL / 主页面回归 | 底部进入课程并检查当前/历史信息、导航、滚动、返回及底栏遮挡 | 当前与历史课程可区分，页面无空白、崩溃、截断或遮挡 | 用户确认本轮指定项目全部通过 | PASS | 用户 2026-09-05 文字确认；无新增仓库截图 |
| PAGE-STU-022 / NORMAL / 主页面回归 | 底部进入打卡并检查运动类型、图标、导航、滚动、返回及底栏遮挡 | 运动类型和图标清楚可辨，页面无空白、崩溃、截断或遮挡 | 用户确认本轮指定项目全部通过 | PASS | 用户 2026-09-05 文字确认；无新增仓库截图 |
| PAGE-STU-023 / NORMAL、RESUME / 主页面回归 | 底部进入记录与进度；检查语义和布局；切后台约 10 秒后返回 | 时长口径可区分；返回前台保持页面且不出现空白 | 用户确认本轮指定项目全部通过 | PASS | 用户 2026-09-05 文字确认；无新增仓库截图 |
| PAGE-STU-024 / NORMAL / 主页面回归 | 底部进入我的并检查入口、未接入提示、导航、滚动、返回及底栏遮挡 | 页面与入口可用，未接入能力不伪造成正式成功 | 用户确认本轮指定项目全部通过 | PASS | 用户 2026-09-05 文字确认；无新增仓库截图 |
| PAGE-STU-025 / EMPTY / 英文通知面板 | 应用内切换英文后打开通知 | Android 自有标题、筛选、空态和操作文案跟随英文；服务器正文保持服务器语言 | 顶部评审模式已为英文，但通知标题、“暂无未读”“全部标为已读”和空态仍为中文 | FAIL | 用户 2026-09-05 截图附件；不复制进仓库 |
| PAGE-STU-041 / NORMAL / 英文已保留视频底部安全区 | 英文模式打开已保留视频并观察底部说明 | 完整说明位于系统导航栏上方，不被裁切 | 说明位于屏幕最底部并被系统导航栏裁切，只能看到上半部分 | FAIL | 用户 2026-09-05 截图附件；包含现场画面，不复制进仓库 |
| PAGE-STU-001 / 冷启动品牌连续性 | 冷启动观察系统 Splash 及后续 Loading | 继续使用既有 BNBU SPORT / VERITY AI 系统启动页；Loading 使用相同品牌资源且不延长不可交互 Splash | 用户明确要求原有系统启动页必须保留使用；当前系统 Splash 资源实际仍在，但后续 Loading 使用重绘组合，形成被替换的观感 | FAIL | 用户 2026-09-05 两张对比截图；不复制进仓库 |
| PAGE-STU-025 / EMPTY / 英文通知面板复测 | 安装第一版三项修复候选，切换英文并打开通知 | Android 自有固定文案均显示英文 | 用户确认通过，未再报告中文固定文案 | PASS | 用户 2026-09-05 文字确认；无新增截图 |
| PAGE-STU-001 / 冷启动品牌连续性复测 | 安装第一版三项修复候选后冷启动 | 使用原有系统启动页，并及时交给同品牌可见 Loading/Error | 用户确认通过 | PASS | 用户 2026-09-05 文字确认；无新增截图 |
| PAGE-STU-041 / NORMAL / 英文视频安全区复测 | 安装第一版三项修复候选，打开已保留视频 | 底部说明完整且不被裁切 | 用户确认仍有显示不全；第一种安全区方案未关闭问题 | FAIL | 用户 2026-09-05 文字确认；无新增截图 |
| PAGE-STU-041 / NORMAL / 视频说明移除最终复测 | 安装 SHA-256 `c98e30158d687056292c790fe85bd30cb6606cb673ef92a74ed8aa7d9b51183f` 候选；分别检查中英文已保留视频 | 中英文均不显示底部非业务说明；首帧、播放控制和删除按钮正常 | 用户确认全部符合 | PASS | 用户 2026-09-06 文字确认；无新增截图 |

中文/英文、浅色/深色、大字体、横屏、键盘、TalkBack、返回、相机拒绝、后台恢复分别记录；不能使用“全部正常”替代可追溯结果。

## 已知问题与本次新发现

下列为准备阶段的源码证据，不是设备复现结论。已有业务/接口缺口继续以各批 handoff 为详细依据。

| 编号 | 证据 / 问题 | 影响与归属 | 当前处理 |
|---|---|---|---|
| S14-DEVICE-01 | 用户在自有真机打开旧候选包时观察到 Logo 长时间停留，或出现白/黑空白画面。旧源码让系统 Splash 和 Compose 根内容都等待系统模式请求；Debug 默认 `10.0.2.2:13000` 对真机不可达且当前没有 Backend | 缺失 Backend 解释请求失败，但不应造成不可交互空白；真实模式仍必须由服务器确认 | **CLOSED（R10 APK / 当前设备配置）**：用户确认 Logo 及时交给 Loading；无服务时显示 Error，Retry 与 Debug 本地 UI 评审入口正常，未再出现长时间白/黑屏。真实 Backend 成功路径、升级安装和其他设备仍未验收 |
| S14-DEVICE-02 | 首页进度卡在真机显示 `960 / 1200 分钟`、`80%` 和剩余 240 分钟 | 这是 V8 固定分钟口径的正确显示，不是缺陷；只能证明当前 NORMAL 样例 | 已记录 PAGE-STU-020 单项 PASS；不改代码 |
| S14-DEVICE-03 | 录像中底部“结束”按钮在用户当前真机/字体配置下只显示“结”。原布局让暂停/结束水平图标加单行文字共享窄宽，结束按钮权重还更小 | PAGE-STU-041 大字体与常见真机宽度 UI 失败；Android UI 范围内 | **CLOSED（当前设备配置）**：改为等宽、图标在上/文字在下、最多两行；用户确认当前候选包复测通过 |
| S14-DEVICE-04 | 点击已确认保留的视频后初始全黑且播放器控制器隐藏；点屏幕、再点播放后视频和进度均正常，证明本地文件可读取和解码。原预览只设置 URI/控制器，没有首帧定位或主动显示控制器 | PAGE-STU-041 预览可发现性失败；Android UI/播放器呈现范围内，不是 Backend 问题 | **CLOSED（当前设备配置）**：准备后定位首个可见帧并主动显示控制器，保持暂停；用户确认当前候选包复测通过 |
| S14-DEVICE-05 | 中英文切换后长时间无响应。原设置页显式调用 `Activity.recreate()`，重建会重新执行缺 Backend 的系统模式检查 | PAGE-STU-081 语言切换体验失败；Activity 重建是 Android 实现行为，额外等待复用了 S14-DEVICE-01 的启动门控 | **CLOSED（当前设备配置）**：改为 Compose 本地化上下文原地更新，不重建 Activity；用户确认当前候选包复测通过 |
| R2-DEVICE-01 | 应用内切换为英文后，通知面板的 Android 固定标题、筛选、操作和空态仍读取宿主中文 Resources；这不是服务器通知正文语言问题 | PAGE-STU-025 应用内本地化 UI 失败；Android UI 范围内 | **CLOSED（当前设备配置）**：固定文案改从应用所选语言的本地化 Context 读取；JVM/AVD 通过，用户真机确认英文显示通过。服务器正文不擅自翻译 |
| R2-DEVICE-02 | 英文已保留视频页底部说明落入系统导航栏区域并被裁切；增加导航栏安全区后的第一版候选仍在用户真机失败 | PAGE-STU-041 英文布局 UI 失败；该说明不是业务必需字段，中文界面也没有稳定可见表现 | **CLOSED（当前设备配置）**：按用户决定从中英文视频预览统一删除说明；保留首帧、播放器控制、删除能力和安全区；JVM 447/447、AVD 22/22 及用户真机最终复测通过 |
| R2-DEVICE-03 | 用户要求原有 BNBU SPORT / VERITY AI 系统启动页必须保留使用。Manifest/Theme 实际仍引用既有 Splash，但紧随其后的可见 Loading 使用重绘品牌组合，造成启动页被替换的观感 | PAGE-STU-001 品牌连续性要求；Android UI 范围内。不能让系统 Splash 等待网络，否则会恢复长时间 Logo/黑白屏风险 | **CLOSED（当前设备配置）**：系统 Splash 配置未删除；可见 Loading 复用同一主品牌及合作方位图；用户真机确认通过 |
| S14-GAP-01 | `ExerciseSessionState.kt` 最小门槛 60 分钟；`ExerciseSessionController.requestFinish()` 沿用旧清理行为；材料页依赖 Finished，UI 无快速样例入口 | 040—043 取证受限；旧核心属于后续业务阶段，可评审入口属于 UI 可评审性缺口 | 记录；不改核心，不等一小时/改时间来冒充完成 |
| S14-GAP-02 | 邀请确认/结果、强制绑定、维护、业务无权限、真实上传恢复没有统一可选评审场景；local 系统模式固定正常 | 41 页七状态不能全部人工验收；不能仅归因无 Backend 而视为设计通过 | 待单独 UI 场景补充或后续服务接入；未实现、未批准新批次 |
| S14-GAP-03 | 旧本地学生/课程/记录样例仍含旧日期与小时容器；一次补充备注由固定空值/空回调承载 | 可观察静态展示，不能据此证明全部时间逻辑或表单草稿恢复 | 标明虚构/受限样例；观察与旧核心规则分开记录 |
| BLOCK-P2A-F-01 / 02 | FCM 行为与 v8 站内通知冲突；双语隐私文本需正式确认 | 发布/法律验收阻塞 | 保留第 8 步登记，未修改政策/Push |
| PENDING-P2A-BE-01 | 无 Backend，旧 API 仍在 | 正式接口和功能不可验收 | Phase 2 只验 UI，不用样例关闭缺口 |
| PENDING-P2A-OWNER-01 | Android Owner 已确定为 `Exwind259`；Android Reviewer 为当前已获 PR 审核权限的账号；Web Reviewer及其他 Owner 尚未正式具名 | Android 作者不猜测或兼任；剩余正式签字仍待负责人安排 | 按领导确认更新；保留未具名部分 |
| S13-RELEASE-01 | R8 已将补证、帮助、耐力运行时样例及 Compose Preview 移入 Debug source set；Staging/Release provider 不创建样例；尚未构建/检查 Release APK | 源码隔离门禁已关闭，但不能据此声称正式包体检查通过 | 继续只使用 Debug 做 UI 评审；正式产物由具备 HTTPS/Firebase/签名材料的发布环境复核 |

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

## S14-DEVICE-01 R9 启动 UI 修复本地验证

- 系统 Splash 不再等待会话、隐私或网络结果，只等待首个 Compose 启动画面完成布局；耗时操作进入可见 Loading。
- 首次系统模式请求失败进入双语 Error，并提供至少 48dp 的 Retry；失败不调用 fallback、不自动进入 NORMAL。
- Debug 失败页可进入明确标识的本地 UI 评审并直接加载合成学生；该入口由 source-set provider 控制，Staging/Release 为 `null`。
- 聚焦命令：`./gradlew.bat :app:testDebugUnitTest --tests 'edu.bnbu.student.mvp.StartupReadinessTest' --tests 'edu.bnbu.student.mvp.feature.ui.StartupGateStaticPolicyTest' :app:compileDebugAndroidTestKotlin --no-daemon --offline`。
- 结果：BUILD SUCCESSFUL；R9 聚焦 JVM 8/8，0 failures/errors/skipped；Debug 与 AndroidTest Kotlin 编译通过。新增 2 项启动 Compose instrumentation 场景只完成编译，**没有在设备运行**。
- R11 当前真机已确认 Loading、Error、Retry、本地评审入口、首次权限申请和普通页面后台恢复通过；真实 Backend 成功路径、上传/会话中断恢复、升级安装及其他设备仍留待相应阶段验证。

## R2-DEVICE-01 / 02 / 03 新增 UI 修复候选验证

- 通知面板固定文案统一从应用所选语言的本地化 Context 读取；真实通知 title/message 仍视为服务器数据，不由 Android 擅自翻译。
- 第一版已保留视频预览增加系统导航栏安全区后，用户真机确认说明仍显示不全；当前版从中英文视频预览统一删除该非业务说明，并以静态策略测试禁止恢复。
- Manifest 和系统 Splash Theme 继续使用原有 `splash_main_system_generated`、V31 `verity_ai_generated_system`；后续可见 Loading 复用同一主品牌和合作方资源，但仍不让系统 Splash 等待网络。
- 命令：`./gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest --no-daemon --offline` 及 `./gradlew.bat :app:connectedDebugAndroidTest --no-daemon --offline`。
- 结果：BUILD SUCCESSFUL；JVM 447/447（78 suites）；Lint 0 Error、5 Warning；专用 AVD `BNBU_P2_UI_Review` / API 37 实际执行 22/22 instrumentation 通过，0 skipped/failed；`git diff --check` 为 0。
- 用户真机复测的 R2-05 Debug APK：27,463,039 bytes；SHA-256 `c98e30158d687056292c790fe85bd30cb6606cb673ef92a74ed8aa7d9b51183f`。当轮 AndroidTest APK：1,000,761 bytes；SHA-256 `517828c30cf54e5d130f6715516f650a1def669537c62021aaab15d8fe7d365d`。
- R2-06 最终 Commit 使用 `--no-build-cache --rerun-tasks` 强制重建后，Debug APK 为 25,853,071 bytes / SHA-256 `216561a78dc570dbb400d9789ff83b1184f9614cf3c1341ef753d30400b56ebc`；AndroidTest APK 为 984,688 bytes / SHA-256 `ced6c6980653c66d4b030af0dda6ea72abe0428e4564dedf29f38aca6ce31a0c`。最终 AVD 证据绑定强制重建包；真机证据仍如实绑定 R2-05 包。
- R2-DEVICE-01、03 已由用户在 2026-09-05 真机确认；R2-DEVICE-02 最终方案于 2026-09-06 获用户真机确认，三项均已关闭。未覆盖业务态、其他设备和完整无障碍组合不由此关闭。

用户新问题模板：编号 / 页面 / 设备与配置 / 操作 / 预期 / 实际 / 截图 / 影响 / UI或后续阶段归属 / 处理状态。

## Reviewer 记录

| 项目 | 状态 |
|---|---|
| Android Reviewer | PENDING |
| Web 跨端一致性核对 | PENDING；参考离线包，不宣称已有 Web PR |
| 已执行页面/状态数量 | 有明确逐项设备文字证据的 9 页：PAGE-STU-001 启动门禁/品牌连续性；PAGE-STU-020—024 五个主页面的 NORMAL 指定检查及 PAGE-STU-023 普通后台恢复；PAGE-STU-025 英文 EMPTY；PAGE-STU-041 视频；PAGE-STU-081 语言切换。其余页面和七态没有逐项设备证据，不能记为 PASS |
| 已收到截图 | 7；均为对话附件，不复制进仓库 |
| 阻塞与豁免确认 | PENDING；缺测不自动豁免 |
| 第 14 步结论 | COMPLETE WITH LIMITATIONS；既有启动门禁、五个主页面、普通后台恢复、三项旧 UI 缺陷及 R2-DEVICE-01—03 均已在当前真机配置下通过。不可达页面、未触发七态/无障碍组合和 Reviewer 签字继续保留，不算完整业务验收 |

自动测试参考：[自动验证 handoff](../../../handoffs/phase-2-p2a-android-student-ui-automated-validation.md)。当前候选为 JVM 447/447、78 suites、0 failures/errors/skipped；Lint 0 error/5 个既有 warning；Debug 与 AndroidTest APK 均构建通过；专用 AVD/API 37 实际执行 instrumentation 22/22 通过。自动结果不得填入上面的真机人工 PASS 栏，也不等于完整业务流程验收。
