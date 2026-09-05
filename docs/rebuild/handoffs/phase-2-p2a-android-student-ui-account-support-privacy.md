# P2A Android 学生端 UI：账户、帮助、反馈与隐私审计

交付日期：2026-09-05  
原 15 步计划：第 8 步  
分支：`codex/phase2-android-student-ui`  
固定基线：`49d992a1333294ea561923cfea0b7d25864a4d91`  
设计版本：`P2A-UI-2026.09.04-draft1`  
业务版本：v8.0  
Contract：`1.2.0-contract` / `RC`  
OpenAPI SHA-256：`667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`

## 1. 完成状态

**PARTIAL（账户/帮助/反馈 UI 审计与修正完成；隐私/Push 和真实接口验收阻塞）。**

本步完整核对 `RecoveryRequestScreen.kt`、`ContactBindingScreen.kt`、`OnboardingGuideScreen.kt`、`AccountDetailsScreen.kt`、`AccountDeletionScreen.kt`、`PrivacyPolicyScreen.kt`、中英文隐私政策资源、`HelpCenterScreen.kt`、`HelpArticlePresentation.kt`、`FeedbackScreen.kt`、`AboutScreen.kt` 和 `ChangelogScreen.kt`。确定存在冲突的 Compose 文案、状态映射和对应测试已修改；确认无冲突的页面保持不动。

本步没有修改登录核心、安全存储、Push 核心、Contract、Backend、Web、数据库、部署或业务正文。当前没有 Backend，因此邮箱绑定、账户注销、帮助文章和反馈都不能进行真实接口验收。

隐私政策正文没有直接修改。其 FCM/系统通知描述与当前 Android 实现一致，却与 v8.0“只使用站内通知，不发送 Android/iOS 系统 Push”冲突；只改法律文案会让政策与实际 App 行为不一致。移除 FCM 涉及本步禁止的 Manifest、依赖、应用生命周期、Push 模块和旧 API，需要独立任务及正式隐私负责人审阅新版本和生效日期。

## 2. 固定依据

- 唯一业务权威：固定聚合仓库 Commit `49d992a1333294ea561923cfea0b7d25864a4d91` 下 v8.0 四份正文。
- Android 开发基线：同一 Commit 的 `BNBU-ANDROID`；任务分支 `codex/phase2-android-student-ui`。
- Web 参考：Mac 离线交付，未上传 GitHub；本地分支 `codex/web-ui-local-preview`，固定 HEAD `74b616653cbae36670c8c9b284c240be7438d480`。
- 冲突优先级：v8.0 正文高于 Web 旧文案、旧 Android 代码、历史 README 和历史 handoff。

## 3. 已完成修改

### 邮箱登录、绑定与恢复

- 恢复页明确学生端没有手机号、短信验证码或自助账户恢复入口。
- 无法使用已验证邮箱时，引导联系学校体育教学部门或账户管理员完成身份核验，并按学校流程处理；页面本身不直接改绑。
- 首次邮箱绑定用途改为身份验证和邮箱验证码登录；业务提醒只在站内通知中心查看，不再宣称邮箱用于“重要通知”。
- 保留现有换绑时当前邮箱与新邮箱双重验证 UI；未修改旧接口调用。

### 新手引导

- 导航名称统一为“打卡”和“记录与进度”。
- 历史记录说明改为实际分钟与只读材料。
- 申请说明统一为性别对应耐力跑免测、校队/社团认证。
- 删除“驳回后重新提交”的旧表述；只有服务器标记“需补材料”时才能补充。

### 账户资料与注销

- 账户资料页增加学生成员状态，复用 `ACTIVE → 已进班`、`PENDING → 已退班` 的统一投影。
- 英文 `Current grade` 改为 `Current year level`，避免与对学生隐藏的成绩分数混淆。
- 注销阻塞文案不再自行规定“待审核记录必然阻塞”，改为进行中运动或服务器确认的其他阻塞事项。
- 注销仍须当前已验证邮箱验证码和最终确认；未修改旧 Gateway。

### 帮助中心

- 分类名称改为“打卡与分钟”“课程与进度”“校队/社团认证”“站内通知”。
- 本地评审文章不再私自规定“连续错误 5 次、锁定 15 分钟、管理员提前解锁”。
- 登录帮助只表达 v8 已确认的“连续错误或频繁申请时可能暂时限制”，具体期限以服务端页面事实为准。
- 打卡帮助样例强调 30/45/60 分钟教师配置、已受理不等于有效或已计入。
- `HelpCenterScreen.kt` 已符合只取当前语言投影、缓存明确标识、加载/空数据/错误/重试要求，因此未修改。

### 服务反馈

- 学生显示状态统一为：待受理、受理中、待技术团队处理、处理完成、已关闭。
- 旧 wire 同义值只做显示映射；未知非空值保留原值，缺失值显示“状态待确认”，不伪造为待受理或已完成。
- 单条回复明确标记为“管理员公开回复”，不暗示教师或内部备注。
- 输入提醒增加不得填写完整身份资料或媒体内容；页面仍没有附件、优先级和指定处理人控件。
- 成功页仍只在 Repository 返回真实工单后出现；无 Repository 或维护模式下提交禁用。

### 关于与更新日志

- 更新日志不再宣称学生成绩功能可用，也不再宣传离线缓存和系统 Push。
- 当前版本说明改为学生端 UI 更新，并明确缓存帮助内容的标识与站内通知边界。
- `AboutScreen.kt` 和 `ChangelogScreen.kt` 的页面结构、返回和版本号展示无需修改。

## 4. 本步修改文件

```text
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/login/RecoveryRequestScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/login/ContactBindingScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/guide/OnboardingGuideScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/profile/AccountDetailsScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/profile/AccountDeletionScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/help/HelpArticlePresentation.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/feedback/FeedbackScreen.kt
BNBU-ANDROID/app/src/main/res/values/strings.xml
BNBU-ANDROID/app/src/main/res/values-en/strings.xml
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/help/HelpArticlePresentationTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/feedback/FeedbackStatusPresentationTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/guide/OnboardingV8UiStaticPolicyTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/profile/AccountSupportV8UiStaticPolicyTest.kt
docs/rebuild/handoffs/phase-2-p2a-android-student-ui-account-support-privacy.md
```

已完整核对但未修改：

```text
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/profile/PrivacyPolicyScreen.kt
BNBU-ANDROID/app/src/main/assets/privacy_policy_zh_cn.md
BNBU-ANDROID/app/src/main/assets/privacy_policy_en.md
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/help/HelpCenterScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/settings/AboutScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/settings/ChangelogScreen.kt
```

## 5. 自动验证

```text
:app:compileDebugKotlin   PASS（由单元测试任务执行）
:app:testDebugUnitTest   PASS — 378 tests / 0 failures / 0 errors / 0 skipped
:app:lintDebug           PASS — 0 errors / 5 warnings
:app:assembleDebug       PASS
git diff --check         PASS
```

APK：`BNBU-ANDROID/app/build/outputs/apk/debug/app-debug.apk`  
大小：`26,719,212` bytes  
SHA-256：`74119d2daaded7557b62cb19c5df95342460436ef415d8bb96fcea06b257d7c0`

编译另有 `FeedbackScreen.kt` 既有 `menuAnchor()` 与 `Icons.Filled.Send` 两项 Kotlin 弃用提醒，不影响本次构建结果。Lint 的 5 项仍是 1 项既有豁免页面可变集合状态、1 项设计系统资源反射、2 项矢量路径和 1 项字符串短横线 warning，没有 error。

## 6. 明确缺口、冲突与待确认事项

| 编号 | 证据 | 影响 | 当前处理 / 待确认 |
|---|---|---|---|
| `BLOCK-P2A-F-01` | Android Manifest、Firebase 依赖、`FcmPushRegistrar`、`BnbuFirebaseMessagingService` 和通知权限仍启用系统 Push；v8.0 明确只用站内通知 | 当前运行行为不满足 v8；隐私正文若先删除 FCM 会与实际 App 不一致 | 本步不越权修改；需领导建立“移除 Android Push”独立实现任务 |
| `BLOCK-P2A-F-02` | 中文隐私政策 v2.3 仍描述 FCM、Push、旧成绩/申诉入口，且含正式运营主体、隐私负责人、邮箱、电话和地址预留栏；英文正文明确标记待正式法律审阅 | 不能作为最终可发布法律文本验收 | 需正式运营/隐私负责人提供审核后的双语版本、版本号、生效日期和真实公示信息；Android 只负责原样展示确认稿 |
| `GAP-P2A-F-01` | 当前反馈请求仍包含旧 `currentPage`、`clientVersion`，类别由旧请求结构承载 | v8 明确客户端平台/版本不是当前管理界面业务字段，正式 wire 尚未确定 | 不改 Contract/旧请求；未来 Contract 发布后重新生成并接入稳定类别值 |
| `GAP-P2A-F-02` | 当前反馈响应只有单个 `reply`，没有追加公开回复历史 | 无法完整展示每次状态保存对应的公开回复历史 | 只如实显示现有单条公开回复；等待新 Contract/Backend 投影 |
| `GAP-P2A-F-03` | 邮箱绑定、账户注销、帮助和反馈仍调用旧 API，当前没有 Backend | 只能验证 UI、状态映射与禁用边界，不能验证成功/并发/权限/反枚举 | 保留旧 API，待 Backend/Contract 阶段接入后做功能验收 |
| `CROSS-P2A-F-01` | Web 离线引导仍写“补充材料或重新提交”，帮助分类仍有“打卡与学时”，账户注销仍写 Push 设备关联，反馈状态直接显示原始字符串 | Android 与 Web 暂时存在业务术语和状态语义差异 | Android 以 v8 修正；需 Web 负责人后续同步，不修改其离线交付 |
| `CROSS-P2A-F-02` | Web 与 Android 现有隐私政策均含旧成绩/申诉能力；Web 声明无第三方 Push，Android 声明使用 FCM | 双端法律披露与目标业务尚未统一 | 由隐私负责人结合两端实际行为统一确认，不由 Android 自行决定 |

## 7. 人工验收待办

由用户在 Android Studio 模拟器和真机核对：

- 邮箱恢复和绑定页的中文、英文、大字体、TalkBack、键盘及返回；
- 新手引导滑动、跳过、系统返回和“记录与进度/需补材料”文案；
- 账户详情的已进班/已退班与英文 `Current year level`；
- 注销两次确认、验证码错误、加载、接口错误和返回路径；
- 帮助的当前语言、搜索、分类、展开、缓存标识、空数据和加载失败；
- 反馈五类、五状态、未知状态、公开回复、维护/无服务禁用和真实成功返回边界；
- 关于及更新日志不出现学生分数或系统 Push 承诺；
- 经正式负责人确认后的隐私政策全文渲染、滚动和双语一致性。

## 8. 结束项

- 是否修改业务规则：**否；只将 UI 与 v8.0 已确认规则对齐**
- 是否修改 Contract：**否；SHA-256 保持固定值**
- 是否修改 Backend / 数据库 / 部署 / Web：**否**
- 是否仍有旧 API：**是；绑定、注销、帮助、反馈和 Push 均保留旧接口/实现**
- 是否有 Mock / TODO / 空接口：**帮助中心有明确限定在本地评审模式的合成已发布文章；无新增 TODO、空接口或 Fake Success**
- 是否更新 `docs/rebuild/STATUS.md`：**否；按领导要求由指定汇总人维护**
- 下一阶段前置条件：**用户明确说“开始第九步”；不得在本步提前进入后续全量复核或 PR 准备**
