# 原计划第 12 步：全局七态与无障碍源码核查

日期：2026-09-05。Phase 2 / Android 学生端 UI。
结论：**原第 12 步核查与当时范围内的 UI 修正已完成；领导复审后七态、维护补证计时和无障碍修正重新进入进行中，覆盖仍为 PARTIAL。**

本报告不代表 41 页七态全部实现或测试通过。下列证据是源码分支、展示模型和布局声明，不是运行截图、服务端事实或 TalkBack 实测。现有 [状态矩阵](state-matrix.md) 是目标；本文件记录实际差距，不降低目标。

## 1. 固定基线与边界

- 工作目录：`D:\DT\soprts\start3\worktrees\phase2-android-student-ui`。
- 分支：`codex/phase2-android-student-ui`。
- 原核查基线：`49d992a1333294ea561923cfea0b7d25864a4d91`；这是 V8.0 初版历史起点，不是当前业务权威。
- 当前业务权威：`main@8c9826822f35876f8d01480f8baf184027711dfe`（V8.1）；R1 已以普通 merge 同步到 Android 分支。
- Web：只读 Mac 离线交付，分支 `codex/web-ui-local-preview`，HEAD `74b616653cbae36670c8c9b284c240be7438d480`；不是已上传 GitHub 的 Web 交付。
- Contract：`1.2.0-contract` / RC。OpenAPI SHA-256：`667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`。
- 业务权威是当前固定 Commit 下四份 V8.1 正文；没有 Backend，不依据旧实现补业务决定。
- 本轮只写 Compose UI、P2A 设计包和对应 handoff；未改 STATUS、业务正文、Contract、Backend、网络/领域模型或上传协议。

原 15 步顺序不变：**12 源码七态/无障碍核查 → 13 自动测试与构建 → 14 用户模拟器/真机评审 → 15 交接与 PR 准备**。此前误标为第 12 步的人工指南已更名为第 14 步准备材料；没有执行设备测试。

## 2. 七态源码台账：41 页

符号只表达证据强度，均不等于测试 PASS：

- **有**：存在对应可见分支/组件；本地评审是否可触发仍看最后一列。
- **局**：局部提示、父级横幅、输入校验或门控；不等于页面级完整状态。
- **全**：由 AppRoot 的系统维护分支覆盖。维护事实和恢复查询未验收，本地模式缺切换入口。
- **恢**：只找到本地选择/滚动/输入或旧会话恢复机制；不等于进程死亡后事务恢复。
- **静**：当前是同步静态页/静态说明，未独立建模该态；不是豁免状态矩阵，须补设计映射或由 Reviewer 确认适用表达。
- **缺**：未找到足够的目标表达、状态投影或可安全触发的证据，保留缺口。

| PAGE-ID | 页面 | 正常 | 加载 | 空数据 | 错误 | 无权限 | 维护 | 中断恢复 | 关键源码证据/限制 |
|---|---|---|---|---|---|---|---|---|---|
| PAGE-STU-001 | 启动/恢复 | 有 | 局 | 局 | 局 | 局 | 全 | 恢 | AppRoot/旧 StudentAppState 门控；认证与会话事实恢复未验收 |
| PAGE-STU-002 | 维护 | 局 | 缺 | 局 | 缺 | 局 | 有 | 缺 | MaintenancePage 只有维护说明/预计恢复时间，尚缺未结束补证“计时已暂停”、剩余时间和恢复后重算截止；本地模式没有维护场景开关 |
| PAGE-STU-003 | 隐私同意 | 有 | 静 | 静 | 静 | 局 | 全 | 恢 | PrivacyConsentScreen 门控；拒绝不能跳入业务页 |
| PAGE-STU-004 | 登录前引导 | 有 | 静 | 静 | 静 | 局 | 全 | 恢 | PreLoginCourseGuideScreen；静态正文/分页 |
| PAGE-STU-005 | 登录方式 | 有 | 静 | 静 | 局 | 局 | 全 | 恢 | LoginScreen 与 AppRoot 路由；本轮补邮箱页系统返回 |
| PAGE-STU-006 | 邮箱登录 | 有 | 有 | 局 | 有 | 局 | 全 | 恢 | EmailLoginScreen；输入/发送/验证，验证码恢复边界待处理 |
| PAGE-STU-007 | 登录前隐私 | 有 | 静 | 静 | 静 | 局 | 全 | 恢 | PreLoginPrivacyScreen/PrivacyPolicyScreen；正文不可用表达未覆盖 |
| PAGE-STU-008 | 身份恢复 | 有 | 缺 | 局 | 缺 | 局 | 全 | 缺 | RecoveryRequestScreen 当前仅说明/未接入，不是申请处理全流程 |
| PAGE-STU-009 | 强制邮箱绑定 | 有 | 有 | 局 | 有 | 局 | 全 | 恢 | ContactBindingScreen.RequiredActivation；缺可切换身份评审样例 |
| PAGE-STU-010 | 入班后引导 | 有 | 静 | 静 | 静 | 局 | 全 | 恢 | PostEnrollmentGuideScreen；静态分页不能代替身份查询 |
| PAGE-STU-020 | 首页 | 有 | 局 | 有 | 局 | 局 | 全 | 恢 | DashboardScreen + 根同步横幅；缺页面级全态投影 |
| PAGE-STU-021 | 课程 | 有 | 局 | 有 | 局 | 局 | 全 | 恢 | CoursesScreen 空列表/成员入口；加载、错误主要依赖父级 |
| PAGE-STU-022 | 打卡准备 | 有 | 局 | 局 | 局 | 局 | 全 | 恢 | ExercisePreparationContent/旧会话控制；不是服务器时间验收 |
| PAGE-STU-023 | 记录与进度 | 有 | 局 | 有 | 局 | 局 | 全 | 恢 | GradesScreen 三种分钟/空记录；汇总与明细状态仍需细分 |
| PAGE-STU-024 | 我的 | 有 | 局 | 局 | 局 | 局 | 全 | 恢 | ProfileScreen/根路由；安全子页和账户状态恢复未实测 |
| PAGE-STU-025 | 通知 | 有 | 缺 | 有 | 缺 | 局 | 全 | 恢 | NotificationSheet 白名单/筛选/详情返回；无独立分页加载/失败投影 |
| PAGE-STU-030 | 登录前扫码 | 有 | 有 | 局 | 有 | 有 | 全 | 恢 | ScanJoinScreen 相机权限、替代输入、生命周期；真实解析缺服务 |
| PAGE-STU-031 | 登录前邀请确认 | 有 | 有 | 缺 | 有 | 局 | 全 | 恢 | CourseJoinConfirmScreen；预览依赖服务；提交中返回不穿透根路由 |
| PAGE-STU-032 | 登录后扫码 | 有 | 有 | 局 | 有 | 有 | 全 | 恢 | 复用 ScanJoinScreen；已有班样例可能隐藏入口 |
| PAGE-STU-033 | 邀请码 | 有 | 有 | 局 | 有 | 局 | 全 | 恢 | EnterInviteCodeScreen 空值/格式/解析反馈；超期撤销事实未接入 |
| PAGE-STU-034 | 入班确认 | 有 | 有 | 缺 | 有 | 局 | 全 | 恢 | 确认后提交；进程重建时 busy 标志与未知请求结果仍有缺口 |
| PAGE-STU-035 | 入班结果 | 有 | 缺 | 缺 | 有 | 有 | 全 | 缺 | CourseJoinResultScreen 多种结果展示；缺完整离线场景选择入口 |
| PAGE-STU-040 | 运动会话 | 有 | 局 | 局 | 局 | 局 | 全 | 恢 | Active/Paused/Finished；新返回确认不结束或提交会话 |
| PAGE-STU-041 | 证据采集 | 有 | 局 | 有 | 局 | 局 | 全 | 恢 | Finished/EvidenceColumn/媒体槽位；前后照与材料版本缺正式投影 |
| PAGE-STU-042 | 提交/恢复 | 有 | 有 | 局 | 有 | 局 | 全 | 有 | SubmissionProgress 的上传/受理/中断展示；同批次续传不等于协议已实现 |
| PAGE-STU-043 | 游泳延迟说明 | 有 | 缺 | 缺 | 缺 | 局 | 全 | 恢 | SwimmingDelayExplanationScreen；canSubmit 禁用，24 小时事实缺服务 |
| PAGE-STU-050 | 记录列表 | 有 | 局 | 有 | 局 | 局 | 全 | 恢 | GradesScreen/CheckInRecords；列表空态与摘要，不代表数据源已同步 |
| PAGE-STU-051 | 记录详情 | 有 | 缺 | 局 | 局 | 局 | 全 | 恢 | CheckInRecordDetail；本轮补系统返回，完整判断链/版本仍有缺失 |
| PAGE-STU-052 | 原始耐力 | 有 | 缺 | 有 | 缺 | 局 | 全 | 恢 | RawEnduranceResultCard Measured/Exempt/Unconfirmed；确认事实仍需接口 |
| PAGE-STU-060 | 一次补充 | 有 | 有 | 缺 | 有 | 有 | 全 | 有 | SupplementTaskState 展示多个状态；根入口固定样例，正式动作禁用 |
| PAGE-STU-061 | 补充已接收 | 有 | 静 | 缺 | 静 | 局 | 全 | 缺 | SupplementResultScreen；明确评审预览，不是实际受理结果 |
| PAGE-STU-070 | 免测/认证 | 有 | 有 | 有 | 有 | 局 | 全 | 恢 | ExemptionScreen；401 回身份门控，完整图片草稿/事务恢复未证实 |
| PAGE-STU-080 | 账户信息 | 有 | 局 | 局 | 局 | 局 | 全 | 恢 | AccountDetailsScreen；只读本人事实，使用父级工作区 |
| PAGE-STU-081 | 设置 | 有 | 静 | 静 | 静 | 局 | 全 | 恢 | ProfileSettingsScreen；语言/主题是客户端设置 |
| PAGE-STU-082 | 注销 | 有 | 有 | 局 | 有 | 有 | 全 | 缺 | AccountDeletionScreen；成员阻断，危险请求结果未知恢复未验收 |
| PAGE-STU-083 | 已验证邮箱 | 有 | 有 | 有 | 有 | 局 | 全 | 恢 | ContactBindingScreen.ManageContacts；验证码不应当作安全草稿保留 |
| PAGE-STU-084 | 帮助 | 有 | 静 | 有 | 静 | 局 | 全 | 恢 | HelpCenterScreen；本轮保存搜索词和展开项，文章仍为本地内容 |
| PAGE-STU-085 | 反馈 | 有 | 有 | 有 | 有 | 局 | 全 | 局 | FeedbackScreen；无服务禁用，description/tab 仍 remember 而非完整草稿恢复 |
| PAGE-STU-086 | 关于 | 有 | 静 | 静 | 静 | 局 | 全 | 恢 | AboutScreen；版本/边界静态说明，不宣称服务已上线 |
| PAGE-STU-087 | 更新日志 | 有 | 静 | 静 | 静 | 局 | 全 | 恢 | ChangelogScreen；同步静态内容，异常正文状态未单独建模 |
| PAGE-STU-088 | 隐私政策 | 有 | 静 | 静 | 静 | 局 | 全 | 恢 | PrivacyPolicyScreen；文字与布局核对不能代替政策审核 |

重点：相机无权限不等于业务无权限；已退班入口禁用不等于完整 403 页面；空输入校验不等于成功请求后的空数据；rememberSaveable 不等于请求/材料事务恢复。以上不能相互替代。

## 3. 本轮实际 UI 修正

以下路径均相对 `BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/`，没有修改对应业务数据层。

| 文件 | 修正 |
|---|---|
| core/designsystem/Components.kt | 分段控件最小高度从 44dp 改为公共 48dp 目标；允许标签换行并增加内边距 |
| core/designsystem/BNBUErrorPanel.kt | 错误面板增加 Polite live region；没有给每秒计时器增加播报 |
| feature/shell/AppRootScreen.kt | 根内容 safeDrawingPadding + imePadding；维护正文可滚动、适度播报；邮箱登录系统返回；底部栏最小 72dp 而非固定高度 |
| feature/checkin/ExerciseCheckInScreen.kt | 进行中/暂停会话系统返回先确认，返回首页不调用结束/提交；运动类别增加单选分组与选中语义 |
| feature/checkin/CheckInRecords.kt | 记录详情注册系统返回，返回来源列表 |
| feature/checkin/SwimmingDelayExplanationScreen.kt | 延迟说明注册系统返回，回到来源材料页 |
| feature/checkin/SupplementTaskScreen.kt | 材料与备注控件只在 Open 且已有写入/服务许可时启用；禁止态不保留可编辑控件 |
| feature/courses/ScanJoinScreen.kt | 解析中消耗系统返回，避免禁用局部 BackHandler 后穿透根路由 |
| feature/courses/EnterInviteCodeScreen.kt | 同上；不重复发请求，不修改邀请码规则 |
| feature/courses/CourseJoinConfirmScreen.kt | 提交中消耗系统返回，非提交中正常返回 |
| feature/help/HelpCenterScreen.kt | 搜索词与展开文章 ID 使用 rememberSaveable；不缓存凭证/远程正文 |
| feature/login/EmailLoginScreen.kt | 返回图标补中英文内容描述；没有改登录或验证码逻辑 |
| feature/login/RecoveryRequestScreen.kt | 返回图标补中英文内容描述；没有新增恢复申请接口 |

这些是 13 个 UI 源文件的本轮变化，不是累计所有变化。返回、安全区、底部栏 intrinsic 测量必须在第 14 步实际布局中验证；源码通过不等于测量/焦点顺序已通过。

## 4. Android 专项核查结果

| 核查项 | 源码结论 | 第 14 步所需证据 |
|---|---|---|
| 系统返回 | 已补上述缺失处理；维护由根分支隔离；提交中不穿透到首页 | 手势/三键返回、弹窗关闭、扫码退出释放相机、嵌套详情返回 |
| 状态栏/导航栏/IME | 根 safeDrawing/IME padding；子级 Insets 消费由 Compose 处理 | 横屏挖孔、三键导航、键盘弹出后末项可见；检查无双重留白 |
| 深色模式 | 共用 MaterialTheme；R7 已将打卡、证据、提交、补证、游泳说明及耐力结果的固定强调色迁移为语义色 | 深色下正文、禁用、警示和图标仍需真机实测 |
| 横竖屏/常见宽度 | 多数页面 LazyColumn/滚动容器；维护可滚动；底栏自适应高度 | 320/360/412dp 或可用等效宽度、横屏；不要求更换/清理历史设备 |
| 字体放大 | 分段不再强制单行；底栏不再固定高度 | 1.0/1.3/2.0 字体，检查按钮、时间/截止、英文长标签，无裁切重叠 |
| TalkBack | 图标描述、selectableGroup/RadioButton/selected、共享表单错误语义与 liveRegion 已查 | 逐个可点击目标朗读、没有重复/无名控件、状态改变适度播报 |
| 焦点顺序 | 以源码布局顺序和已有 FocusRequester 为主；不能静态证明实际顺序 | 从标题到正文到主操作；弹窗焦点约束、错误定位、返回后焦点恢复 |
| 48dp | 公共分段已修 44dp；常用按钮/运动类别已有最小高度或 Material 扩展目标 | 检查实际可点区域、相邻目标是否重叠；不能把视觉图标尺寸当点击区 |
| 中英文 | 新标签均双语；已存在界面语言选择；本地业务样例部分正文固定中文 | 两种语言长标题/原因/时间/错误换行；固定样例文本与界面翻译分别记录 |
| 动效 | 本轮未改变动画框架，没有运行系统减少动态效果场景 | 系统移除动画后的导航/状态仍清楚，无必须依靠动画才能理解的结果 |

实现依据：[Compose Insets](https://developer.android.com/develop/ui/compose/system/insets-ui)、[Intrinsic measurements](https://developer.android.com/develop/ui/compose/layouts/intrinsic-measurements)、[Compose semantics](https://developer.android.com/develop/ui/compose/accessibility/semantics)。这些资料说明 API 行为，不是本项目运行验收证据。

## 5. 未关闭问题与归属

| 编号 | 证据与影响 | 后续归属 / 关闭条件 |
|---|---|---|
| S12-UI-01 | 首页/课程/进度多依赖父级同步横幅；通知缺独立加载/错误投影。状态矩阵目标不能仅凭组件存在关闭 | Phase 2 UI：补页面级展示模型、异常场景及评审入口；不要求先有真实 Backend |
| S12-UI-02 | 本地模式固定 NORMAL，绑定、邀请结果、Finished/材料/延迟说明缺快速评审入口 | Phase 2 UI：经确认补明确标识且不调用服务的场景入口；第 14 步不可达项保持未测 |
| S12-UI-03 | FeedbackScreen 的 description/tab 为 remember；部分静态页没有正文缺失态；补充入口只是固定只读样例 | Phase 2 UI：补安全草稿/静态正文状态，不能把声明的“保留草稿”当已有验收 |
| S12-V81-01 | 维护页缺补证计时暂停/剩余时间，补证原因仍为自由字符串，审核状态过度压缩，英文通知关键词过滤会误删合法通知 | Phase 2 UI：R3—R9 按 V8.1 修正展示模型、页面和回归测试；生产数据来源仍由 Contract/Backend 提供 |
| S12-SEC-01 | EmailLoginScreen / ContactBindingScreen 保存验证码或验证流程状态使用 rememberSaveable；与设计“不恢复验证码秘密”有差距 | Android 身份/安全负责人确认敏感字段生命周期；本轮未扩大到登录核心；不得打印实际值 |
| S12-RESUME-01 | CourseJoinConfirmScreen 的 submitting/submitted 为可保存状态，进程结束后可能恢复 busy 而没有存活请求 | 接口/身份流程阶段明确未知结果查询与幂等；不能简单改成重新提交，也不能只加假成功 |
| S12-DOMAIN-01 | 旧运动核心不足 60 分钟结束会清理，与新 UI 实际运动事实保留表述冲突；材料页还依赖 Finished | 后续领域/Backend 阶段修订；本轮不改会话核心，不要求改设备时钟或等待一小时验收 |
| S12-CONTRACT-01 | 游泳前后照版本、受理后锁定同批次续传、24/72 小时截止与权限缺正式数据来源 | 后续 Contract/Backend 负责人提供，Android 不改 OpenAPI，不以本地时间或样例判定成功 |
| S12-MEDIA-01 | 免测 UI 为 10MB，旧媒体核心仍有 8MB 约束；UI 文案不证明校验已一致 | 后续接口/媒体适配阶段；本轮保留已登记差异，不调整核心上限 |
| S12-COLOR-01 | R7 已修正共享主题普通文字色对，并移除相关学生运动页面的固定蓝/绿/橙强调色；40 组语义色对及实际使用的半透明强调底组合均不低于 4.5:1 | **源码门禁已关闭；设备视觉签认未关闭。** Reviewer 仍需在浅/深色、字体放大和真实控件状态下复验；不是 Backend 待办 |
| S12-EVIDENCE-01 | 大字体/横屏/焦点/TalkBack/实际点击区域缺运行证据；Owner/Reviewer 尚未具名 | 第 14 步由用户操作，Reviewer 签认；不能转给后续 Backend 作为已通过项 |

R9 已补 PAGE-STU-001 的可见启动状态：系统 Splash 只等待首个 Compose 画面，后续等待使用 Loading；首次系统模式请求失败显示 Error + Retry，并以 polite live region 暴露状态。失败不会自动进入 NORMAL；仅 Debug 在 source-set provider 可用时显示本地合成 UI 评审入口，Staging/Release 不显示。R10 全量 JVM、Lint 和 APK 构建已通过；真实设备的 TalkBack、2.0 字体、横屏与重试仍待 R11 使用新候选复测。

R7 配色修正：浅色 primary 改为 `#005FCC`（白字 5.985:1）、secondary 改为 `#995400`（白字 5.797:1）、tertiary 改为 `#1B6F32`（白字 6.238:1）、error 改为 `#B3261E`（白字 6.536:1）；深色 primary 改为 `#2997FF` 并使用深色前景（5.782:1），深色 error 保留明亮底色并改用深色前景（5.390:1）。自动测试覆盖全部容器、正文、反色、强调色/Surface 及当前 UI 使用的 8 组半透明强调底，共 40 组，最低实测不低于 4.5:1。按 [WCAG 对比度说明](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)，普通文字要求 4.5:1；禁用态、图片背景和实际字号仍须按真实控件人工判断，不能由 token 计算外推为整页通过。

业务与接口矛盾可交后续 Phase，但**纯 UI 状态缺口、配色、草稿体验和评审入口仍是 Phase 2 跟进项**，不能因无 Backend 直接关闭。

## 6. R7 最新验证与限制

执行：`BNBU-ANDROID\gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest`（使用现有 Android Studio JBR / 本机 SDK）。

- **BUILD SUCCESSFUL in 1m 59s**；429 项 JVM 测试通过，0 failure / error / skipped。
- `StudentUiAccessibilityStaticPolicyTest` 新增两项门禁：40 组语义色对及实际半透明强调底组合经计算不低于普通文字 4.5:1；相关运动 UI 不再写死旧 `#007AFF`、`#34C759`、`#FF9500`，填充主按钮不再直接指定白字。
- Lint：0 error / 5 warning，均为既存类型；Debug APK 与 AndroidTest APK 均构建成功。
- AndroidTest APK 只是编译，**没有在设备或模拟器运行**；没有执行 TalkBack、Switch Access、大字体、横屏、真实点击区域或视觉回归。
- 编译依赖执行了已有 Contract 绑定检查和 OpenAPI 生成；生成内容位于 build/generated，Contract `openapi.yaml` SHA-256 仍为 `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`。
- 整体 41 页七态仍为 **PARTIAL**；R7 只关闭领导复审指出的配色源码门禁，不把 token 对比度、编译或 JVM 测试外推为整页/完整业务验收。

本轮文档还更正了人工指南/记录/handoff 的步骤编号，并在第 11 步集成审计尾部恢复原 12—15 步顺序。详细变更与范围保护见本轮 handoff。

## 7. 下一步

原 15 步已完成到 PR 提交，当前进入独立的复审修正 R 系列。R2 只同步 V8.1 现行文档与历史边界；R3 起修复通知、审核、补证、维护、启动错误状态和无障碍。完成后重新执行自动测试，由用户操作设备复测，并由用户手动 Push/更新 PR。
