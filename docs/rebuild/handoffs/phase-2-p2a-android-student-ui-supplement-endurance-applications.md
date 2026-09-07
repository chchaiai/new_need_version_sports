# P2A Android 学生端 UI：一次补充、原始耐力与免测/认证

- 交付日期：2026-09-05
- 原 15 步计划：第 7 步
- 分支：`codex/phase2-android-student-ui`
- 固定基线：`49d992a1333294ea561923cfea0b7d25864a4d91`
- 设计版本：`P2A-UI-2026.09.04-draft1`
- 业务版本：v8.0（历史执行记录）
- Contract：`1.2.0-contract` / `RC`
OpenAPI SHA-256：`667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`

## 1. 完成状态

**PARTIAL（本批 UI 与静态策略完成，接口接入和业务功能未验收）。**

本步覆盖 `PAGE-STU-052`、`PAGE-STU-060`、`PAGE-STU-061` 和 `PAGE-STU-070` 的 Compose 展示与 UI 状态语义。旧 `EnduranceScoringScreen.kt` 文件仍保留，但已经从学生可达导航中移除。本步未修改成绩 DTO、Contract、Backend、Repository、数据库或部署配置。

当前没有可用 Backend；一次补充任务、截止时间、退回原因、材料版本、耐力测试日期和认证分钟分配都缺少正式数据来源。因此评审入口仅在本地 UI 评审模式显示，正式写操作保持禁用，不创建本地成功结果，也不能把本步构建或测试结果表述为业务验收通过。

## 2. 固定依据

- 唯一业务权威：固定聚合仓库 Commit `49d992a1333294ea561923cfea0b7d25864a4d91` 下 v8.0 四份业务正文：`00-overview.md`、`10-student-flow.md`、`20-teacher-flow.md`、`30-admin-flow.md`。
- Android 开发基线：同一 Commit 的 `BNBU-ANDROID`，任务分支 `codex/phase2-android-student-ui`。
- Web 视觉与信息分组参考：用户收到的 Mac 离线完整包，未上传 GitHub；本地分支 `codex/web-ui-local-preview`，固定 HEAD `74b616653cbae36670c8c9b284c240be7438d480`，其中学生耐力展示改动来源 Commit `2ec2491`。
- Web 离线交付没有完成一次补充的新规则页，因此该部分严格采用 v8.0 正文，不从旧 Web 服务页补推业务规则。

## 3. 已完成 UI

### `PAGE-STU-052` 原始耐力结果

- 新增 UI-only 原始耐力展示模型，只有教师确认的性别对应项目、原始用时、测试日期或免测事实。
- 支持已测、免测、未确认三种事实状态；缺失数据不会显示为 `0`。
- 不包含分数、等级、排名或换算字段，也不调用旧耐力评分页面。
- 当前 DTO 没有测试日期；正式数据模式明确显示日期待新接口提供，不在客户端猜测。

### `PAGE-STU-060` 唯一一次补充

- 展示服务器授权的 24 或 72 小时总窗口、服务器截止时间和公开退回原因。
- 原始事实与原材料永久只读；补充只生成一个新材料版本，不允许覆盖原材料、自助延长或发起第二轮。
- 展示每版最多 6 张 JPEG/PNG、1 段有声 MP4，图片每张 10 MB、视频 1—15 秒且不超过 100 MB、版本总量不超过 250 MB。
- UI 提交门槛分别校验照片和视频数量、至少一份材料、补充说明、服务器许可、截止状态和正式写能力。
- 无 Backend 时只提供带有“本地评审样例”标识的页面，添加材料和正式提交均禁用。

### `PAGE-STU-061` 补充受理结果

- 明确“已收到、待教师处理”不等于有效、通过或已计入分钟。
- 显示机会已使用 `1/1`，不允许第二轮补充。
- 截止前已受理的补充不会因为教师稍后处理而自动过期。
- 当前页面只作为本地评审预览，不伪造网络提交或服务端受理结果。

### `PAGE-STU-070` 耐力免测与校队/社团认证

- 页面术语统一为“耐力跑免测”和“校队/社团认证”，不再把组织认证表达为“免打卡”。
- 只有服务器明确标记“需补材料”时允许在同一申请中补充；“已驳回”不会被客户端自行变成可重提。
- 同一申请首次提交与全部补充累计最多 3 张图片；仅接受 JPEG、PNG、WebP，单张不超过 10 MB，不接受 PDF、视频或其他文件。
- 认证认可分钟及两类分配保持服务器事实；Android 不计算、不强制某一分类非零。
- 无服务器时页面不生成本地申请数据，并提示重新登录后再提交。

## 4. 状态与可达性

| 页面 | 正常/事实态 | 加载/空数据 | 错误/无权限/维护 | 中断恢复 |
|---|---|---|---|---|
| 原始耐力结果 | 已测、免测、未确认 | 由“记录与进度”页面现有加载和空态承载 | 由主页面公共状态承载 | 不保存或推算缺失事实 |
| 一次补充任务 | 开放、提交中、已收到、过期、机会已用 | 仅本地评审样例；正式任务未接入 | 禁止、维护、错误均有明确状态；正式写入禁用 | 恢复中状态不冒充已提交；待正式任务/版本接口 |
| 补充结果 | 已收到、待教师、机会 1/1 | 无正式网络结果 | 不生成 Fake Success | 返回任务页仅用于评审流程核对 |
| 免测/认证 | 现有申请状态、需补材料 | 保留现有加载与空态 | 保留错误与未登录提示 | 现有本地表单恢复；正式结果仍以服务器为准 |

## 5. 本步修改文件

```text
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/grades/RawEnduranceResult.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/grades/GradesScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/SupplementUiModel.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/SupplementTaskScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/SupplementResultScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/exemption/ExemptionScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/shell/AppRootScreen.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/grades/RawEnduranceResultTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/checkin/SupplementUiModelTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/checkin/SupplementV8UiStaticPolicyTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/checkin/session/AcceptedContractStaticPolicyTest.kt
docs/rebuild/handoffs/phase-2-p2a-android-student-ui-supplement-endurance-applications.md
```

`ProfileScreen.kt` 已核对此前完成的“免测与认证”入口及两类认可分钟文案，本步无需再次修改。`EnduranceScoringScreen.kt` 未删除、未修改，仅保持不可达。

## 6. 自动验证

```text
:app:compileDebugKotlin   PASS（由单元测试任务重新执行）
:app:testDebugUnitTest   PASS — 371 tests / 0 failures / 0 errors / 0 skipped
:app:lintDebug           PASS — 0 errors / 5 warnings
:app:assembleDebug       PASS
git diff --check         PASS
```

- APK：`BNBU-ANDROID/app/build/outputs/apk/debug/app-debug.apk`
- 大小：`26,719,092` bytes
SHA-256：`abbfe7b9228434396fadc066882020a63eb8542cb88ace8f788148ce474e9e80`

Lint 的 5 项是 1 项既有 `ExemptionScreen.kt` 可变集合状态警告、1 项设计系统资源反射警告、2 项既有矢量路径警告和 1 项字符串短横线警告；没有 error。Windows Git 同时报告既有 LF/CRLF 转换提醒，但 `git diff --check` 没有空白错误，未为此重写文件。

首次构建前置检查发现当前 PowerShell 没有配置 `JAVA_HOME` 和 `ANDROID_HOME`；本步只在构建进程中临时指向已安装的 Android Studio JBR 与 Android SDK，未写入仓库或系统配置，随后复跑成功。

## 7. 明确缺口、冲突与后续问题

| 编号 | 证据 | 影响 | 当前处理 |
|---|---|---|---|
| `GAP-P2A-E-01` | 当前成绩 DTO 没有耐力测试日期，也没有 v8 完整确认状态 | 正式页面无法完整显示测试日期或可靠区分草稿/已确认 | UI 不推算；显示待接口提供，等待未来 Contract/Backend 阶段 |
| `GAP-P2A-E-02` | 没有补充任务、服务器截止、公开原因、材料版本、机会状态和提交接口 | 无法完成真实一次补充流程、截止判断或中断恢复 | 正式入口隐藏；本地评审样例明确标识，全部写操作禁用 |
| `GAP-P2A-E-03` | 旧图片核心预检仍为 8 MB，上传 MIME 映射不能正确保留 WebP | `PAGE-STU-070` 的 v8 UI 规则与旧数据/上传层暂不一致 | 未越权修改核心；当前不能验收 WebP 或 10 MB 真实上传 |
| `GAP-P2A-E-04` | 当前认证模型没有服务器认可分钟和两类分配字段 | 不能展示正式分配详情 | Android 不计算或默认为“其他类”；等待服务端事实字段 |
| `RISK-P2A-E-01` | Web 离线包只完成原始耐力展示；一次补充仍缺新规则页面 | 补充页无法做逐屏跨端视觉核对 | 先按 v8 信息层级完成 Android 可评审稿，待 Web 页面补齐后记录平台差异 |
| `RISK-P2A-E-02` | 没有 Backend | 权限、截止、提交、受理、教师处理与计入结果均不能集成验证 | 不以 Mock 关闭缺口，不宣称业务通过 |

## 8. 人工验收待办

由用户在 Android Studio 模拟器和真机核对：

- 中英文、浅色/深色、大字体和 TalkBack；
- “记录与进度”中的已测、免测、未确认原始耐力卡；
- 原始结果不出现分数、等级、排名或换算；
- 本地评审模式的一次补充入口、返回路径、24/72 小时文案、原材料只读和机会 `1/1`；
- 无 Backend 时添加材料、提交和申请不会产生本地成功；
- 免测/认证图片格式、累计 3 张和 10 MB 文案；
- 现有申请的加载、空数据、错误、未登录和“需补材料”状态。

待 Web 一次补充页、正式 Contract/Backend、Owner/Reviewer 名单和人工验收证据到位后，再进行跨端一致性复核与功能阶段验收。

## 9. 结束项

- 是否修改业务规则：**否；只按 v8.0 业务正文调整 UI 语义与客户端展示门槛**
- 是否修改 Contract：**否；SHA-256 保持固定值**
- 是否修改 Backend / 数据库 / 部署 / Web：**否**
- 是否仍有旧 API：**是；成绩、申请、上传和现有数据模型仍是旧基线**
- 是否有 Mock / TODO / 空接口：**有明确标识的本地 UI 评审样例；无新增空接口、Fake Success 或伪造服务器结果**
- 是否更新 `docs/rebuild/STATUS.md`：**否；按领导要求由指定汇总人更新**
- 下一阶段前置条件：**用户说“开始第八步”；第 8 步只核对账户、帮助、反馈和隐私文案，不在本步提前修改**
