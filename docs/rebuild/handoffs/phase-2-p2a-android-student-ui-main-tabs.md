# Phase 2 P2A Android 学生端 UI：第四步主导航批次交接

> 历史状态说明：本文是 `49d992a...` / V8.0 初版实施记录。当前复审以 `main@8c9826822f35876f8d01480f8baf184027711dfe` / V8.1 为准；原 `PENDING-P2W2-01` 已由 `BD-20260904-01/02` 关闭。

> 日期：2026-09-05
>
> 完成状态：**DONE（第四步主导航与安全边界批次）**；Phase 2 Android 全量页面仍为 **PARTIAL**。
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

业务含义仍只以四份 v8.0 正文为权威。P2W 设计交付用于共同页面、流程和状态；Web 离线交付用于视觉层级与信息分组。没有修改业务正文、Contract、Backend、Web、数据库、部署或 `STATUS.md`。

`STATUS.md` 按领导要求由指定汇总人维护，本批没有越权更新。

## 2. 本批完成内容

### 2.1 主导航与禁止披露

- 五个底部入口保持“首页、课程、打卡、记录与进度、我的”。
- 原 `GradesScreen` 保留物理文件名以减少路由迁移，但页面含义改为“记录与进度”。
- 学生可达路由不再包含耐力换算页面；个人页不再提供换算快捷入口。
- 学生可达的首页、课程、记录与进度、个人页和通知面板不引用最终成绩、换算分、等级、排名或旧成绩投影字段。
- 旧 `EnduranceScoringScreen.kt` 文件未删除，只是从学生路由隔离，留待后续清理批次处理。

### 2.2 首页与分钟进度

- 总目标固定展示为 1,200 分钟。
- 旧小时聚合仅通过 `StudentProgressUiModel` 转为 UI 分钟；该适配器不判断单条记录是否有效或应计入。
- 两类进度分别展示；分类目标没有可兼容数据时显示“目标待同步”，不伪造正式结果。
- 今日已有提交时仍显示继续运动入口，并明确“提交不等于有效或计入”。
- 通知角标只统计通过学生通知白名单的未读项。

### 2.3 课程、本人核验与规则

- 历史课程删除最终成绩和及格结论。
- 课程详情增加注册/入班、原始体测、本人运动记录三项核验。
- `PENDING` 等非有效成员状态按学生语义显示“已退班”。
- 展示总目标、两类目标、起算门槛、单次上限和每周计入数；缺少正式接口时显示“待课程规则同步”。
- 30 分钟门槛、单次 60 分钟、每周 3 条只在本地评审模式中标识为样例，不写入 Repository 或领域模型。

### 2.4 记录、原始耐力与通知

- “记录与进度”展示总分钟、分类分钟、本人最近记录、审核阶段和原始耐力事实。
- 正式模式下“可计/计入分钟”显示“待新接口”；本地评审模式可展示明确标识的评审投影。
- 原始耐力只读取教师确认的原始用时或免测/未完成/未确认事实，不读取 `enduranceRunScore`。
- 站内通知先执行“结果数据拒绝规则”，再执行成员、审核、期限、进度、反馈、维护白名单；整条不安全通知被隐藏，不做可能误导的局部涂抹。
- 仅免测/认证类通知可以打开申请页；其他白名单通知打开只读详情。
- 不再主动请求 Android 系统通知权限，保留现有宿主回调签名等待后续主入口清理。

### 2.5 打卡入口的最小安全调整

- 自主运动选择网格按已评审 Web 视觉改为三列，并保留 Android 组件适配。
- 准备页不再因“今日已有提交”隐藏或禁用开始入口；明确后续记录可能不计入。
- 本批没有修改运动会话、服务器时间、媒体、上传、Gateway 或提交算法。

## 3. 修改文件

生产 UI：

```text
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/shell/AppRootScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/dashboard/DashboardScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/courses/CoursesScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseCheckInScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/grades/GradesScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/grades/GradeDisplayPolicy.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/profile/ProfileScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/notifications/NotificationSheet.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/common/StudentProgressUiModel.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/notifications/StudentNoticeUiModel.kt
BNBU-ANDROID/app/src/main/res/values/strings.xml
BNBU-ANDROID/app/src/main/res/values-en/strings.xml
```

直接相关测试：

```text
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/checkin/ExerciseSportGridLayoutTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/checkin/session/AcceptedContractStaticPolicyTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/grades/CheckInHoursPresentationPolicyTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/grades/GradeDisplayPolicyTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/profile/OrganizationRecognitionCopyTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/common/StudentProgressUiModelTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/notifications/StudentNoticeUiModelTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/shell/StudentUiDisclosureBoundaryTest.kt
```

## 4. 测试与构建证据

执行环境只在当前 PowerShell 命令中设置 Android Studio 自带 JDK 与本机 Android SDK；没有修改系统或项目持久配置。

| 检查 | 真实结果 |
|---|---|
| 定向 UI/策略单测 | 14/14 通过 |
| `:app:testDebugUnitTest` | 347/347 通过，0 failure，0 error，0 skipped |
| `:app:lintDebug` | 成功；0 error，5 warning |
| `:app:assembleDebug` | 成功 |
| `git diff --check` | 通过 |
| 学生可达入口禁用词/旧投影静态扫描 | 0 命中 |

Lint 的 5 个警告对应的代码或资源行均为既有内容：`ExemptionScreen.kt` 的可变集合状态、`InterfaceText.kt` 的资源反射、两个既有长矢量路径，以及旧耐力资源中的连字符排版。本批首轮产生的 10 个未使用资源/复数警告已经清除。

构建产物：

```text
Path: BNBU-ANDROID/app/build/outputs/apk/debug/app-debug.apk
Size: 26719092 bytes
SHA-256: 455390f91b317b8df7591ca158c5fb574bf1b0892f02b3d366eeb4d7835b1e7a
```

编译器仍报告两个低风险弃用提示：既有设计系统图标使用旧 `DirectionsRun`，以及通知列表使用 `animateItemPlacement`。它们不阻止构建，且前者不在本批允许路径。

## 5. 未执行测试及原因

- 未运行模拟器、真机、TalkBack、相机/麦克风、主题/字体缩放和逐页截图验收：按分工由用户和 Reviewer 人工完成。
- 未运行连接真实 Backend 的接口、上传、恢复、并发或端到端测试：当前没有新 Backend，也没有与 v8.0 对齐的完整 Contract。
- 未进行功能验收：本批成功仅代表代码可编译、自动测试和静态检查通过，不代表业务流程已接通。
- 未 push、未创建 PR、未合并：均由用户手动执行，且应在 Reviewer 确认后进行。

## 6. 业务规则与 Contract 边界

```text
是否修改业务规则：否
是否修改四份 v8.0 业务正文：否
是否修改 Contract：否
是否修改 Backend / Web / infra / tests/e2e：否
是否修改 STATUS.md：否（指定汇总人专属）
```

构建过程读取了固定 Contract 并生成 `build/` 下临时产物，但 Git 工作区中的 Contract 未变化；最终 SHA-256 仍为固定值。

## 7. 旧 API、Mock、TODO 与已知缺口

### 7.1 仍存在旧 API/模型引用

- `StudentProgressUiModel` 仍需从旧小时聚合读取数据并只在 UI 层换算分钟。
- 原始耐力事实暂时来自旧 `workspace.grades` 容器；学生 UI 不读取其中的分数字段。
- 旧 `GradeRow`、成绩 DTO、`EnduranceScoringScreen.kt` 及相关资源仍在源码树中，但本批已从学生可达路由隔离。
- `CheckInScreen.kt`、`CheckInRecords.kt`、运动会话和完成/提交页面仍含旧小时制、1/2 小时限制及旧计入提示，属于后续运动批次。
- 核心状态层仍可能按旧规则阻止当天第二次正式提交；本批只保证入口 UI 不因上限或目标被隐藏，不能声称第二次提交功能已打通。

### 7.2 Mock、样例与空接口

- 新 Backend 不存在，正式的实际分钟、可计分钟、实际计入分钟、未计入原因、分类目标、审核阶段和通知类型接口均未接入。
- 本地评审模式继续使用虚构工作区；新增规则样例均带“本地评审样例”或全局评审横幅。
- 正式模式不根据本地数据假装计算可计/计入分钟，缺失项显示“待新接口”或“待同步”。
- 本批没有新增空 Repository、空 Gateway、Contract TODO 或伪成功写入。

## 8. 风险与待确认

1. `PENDING-P2A-BE-01`：没有新 Backend/Contract，页面尚不能完成正式数据接入或功能验收。
2. `PENDING-P2A-OWNER-01`：Android Owner、Android Reviewer 和 Web 跨端 Reviewer 的真实姓名仍未提供，阻塞正式签字。
3. `PENDING-P2W2-01`（历史，V8.1 已关闭）：本批当时没有创建客户端枚举；当前六类中英公开原因、动作适用范围、公开补充说明和系统逾期原因已经确定，须在复审修正中实施。
4. 通知白名单当前是 UI 层保守适配；正式 Contract 应提供稳定的学生通知类型和安全字段，不能长期只靠文本识别。
5. 旧会话/记录页仍会暴露小时制语义；在后续运动 UI 批次完成前，不应将本 APK 作为完整 v8.0 评审包。
6. Web 离线交付来自 macOS 压缩包且包含 AppleDouble 文件；本批只读参考，没有清理或改写该目录。

阶段结束时的只读保护核对：旧 Week 9 仓库仍为原分支/原 HEAD、35 个状态项；Web 离线仓库仍为 `codex/web-ui-local-preview` / `74b616653cbae36670c8c9b284c240be7438d480`、635 个状态项；聚合仓库 `main` 克隆仍为固定 HEAD 且干净。没有对三者执行 reset、clean、stash、删除或覆盖。

## 9. 下一阶段前置条件与建议顺序

在用户说“开始下一步”前不继续修改代码。

建议下一批按设计基线进入“扫码、邀请码、入班确认与独立结果页”（`PAGE-STU-030`—`035`）：

1. 开始前重新核对任务分支、HEAD、工作区和精确允许路径。
2. 只改扫码/邀请码/入班 Compose UI 和直接相关测试，不修改 Contract/Repository。
3. 覆盖正常、加载、空、错误、无权限、维护和中断恢复，正式路径隔离“模拟扫码成功”。
4. 完成后再单独进入运动会话、证据、上传恢复和游泳异常批次。
5. 全部 UI 批次完成后，由用户在 Android Studio 模拟器/真机上执行人工验收，Web 负责人做跨端一致性核对，Reviewer 签字后用户手动 push 和创建 PR。
