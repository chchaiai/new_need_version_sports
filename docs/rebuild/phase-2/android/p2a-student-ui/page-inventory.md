# P2A Android 学生端页面清单

本清单沿用 P2W 的 `PAGE-STU-*` 标识，保证 Android、Web 和业务验收使用同一页面语言。Android 不另建一套业务页面编号。

处置类型：

- `RETAIN`：保留现有页面结构，核对文案、状态和可访问性。
- `REDESIGN`：可复用现有 Compose 外壳，但信息、状态或流程需要明显调整。
- `ADD`：当前没有可独立评审的对应页面，需要新增。

## 1. 启动、身份与首次进入

| ID | 页面 | Android 当前承载 | 处置 | 关键要求 |
|---|---|---|---|---|
| `PAGE-STU-001` | 启动与中断恢复 | `MainActivity.kt`、`StudentAppState` | RETAIN | 恢复登录、隐私、系统模式和未完成会话；不得假定本地状态就是服务器事实 |
| `PAGE-STU-002` | 系统维护 | `MaintenancePage` | REDESIGN | 全屏中英双语；未结束补证显示“计时已暂停”和服务器给出的剩余时间；预计恢复时间仅供参考；恢复后重新查询系统模式和重算截止 |
| `PAGE-STU-003` | 首次隐私同意 | `PrivacyConsentScreen` | RETAIN | 同意/拒绝结果明确；清理成绩、设备 Push 等旧说明 |
| `PAGE-STU-004` | 登录前课程引导 | `PreLoginCourseGuideScreen` | RETAIN | 解释学校邮箱、邀请和学生端数据边界，不承诺未实现功能 |
| `PAGE-STU-005` | 登录方式选择 | `LoginScreen` | RETAIN | 学校邮箱验证码或扫码邀请；不新增学生密码登录 |
| `PAGE-STU-006` | 邮箱验证码登录 | `EmailLoginScreen` | RETAIN | 加载、验证码错误、过期、限流、恢复输入和无权限 |
| `PAGE-STU-007` | 登录前隐私政策 | `PreLoginPrivacyScreen` / `PrivacyPolicyScreen` | RETAIN | 相机/麦克风按需申请；明确不采集位置和路线 |
| `PAGE-STU-008` | 身份恢复申请 | `RecoveryRequestScreen` | REDESIGN | 现状主要提示联系管理员；改为可评审申请、处理中、失败和已受理状态 |
| `PAGE-STU-009` | 强制邮箱绑定 | `ContactBindingScreen.RequiredActivation` | RETAIN | 完成邮箱验证后才成为 `ACTIVE`；失败不得误报已激活 |
| `PAGE-STU-010` | 入班后引导 | `PostEnrollmentGuideScreen` | RETAIN | 解释五个主入口、分钟口径、审核与一次补充，不使用“无限重提” |

## 2. 五个主导航与通知

| ID | 页面 | Android 当前承载 | 处置 | 关键要求 |
|---|---|---|---|---|
| `PAGE-STU-020` | 首页 | `DashboardScreen.kt` | REDESIGN | 本人状态、1,200 分钟、两个类别、待补充/待处理；不显示分数、等级或排名 |
| `PAGE-STU-021` | 课程 | `CoursesScreen.kt` | REDESIGN | 课程规则、本人注册/体测/打卡核验；历史课程不得展示最终成绩/及格结论 |
| `PAGE-STU-022` | 打卡 | `CheckInScreen.kt` / `ExercisePreparationContent` | REDESIGN | 达标或达到计入上限后仍允许真实运动，并提示“本次可能不计入” |
| `PAGE-STU-023` | 记录与进度 | `GradesScreen.kt` | REDESIGN | 实际时长、有效分钟、计入分钟、审核阶段和未计入原因；页面名称不再是成绩 |
| `PAGE-STU-024` | 我的 | `ProfileScreen.kt` | REDESIGN | 保留信息分组；移除耐力评分换算入口和任何学生成绩入口 |
| `PAGE-STU-025` | 站内通知 | `NotificationSheet.kt` | REDESIGN | 只允许成员、审核/补充期限、原始时间、分钟进度、反馈和维护类通知 |

固定底部顺序为：首页、课程、打卡、记录与进度、我的。通知由首页或系统入口承载，不新增第六个底部标签。

## 3. 扫码与入班

| ID | 页面 | Android 当前承载 | 处置 | 关键要求 |
|---|---|---|---|---|
| `PAGE-STU-030` | 登录前扫码 | `ScanJoinScreen.kt`（登录前路径） | REDESIGN | 相机权限、二维码无效、网络失败和恢复；正式产品不得出现“模拟扫码成功” |
| `PAGE-STU-031` | 登录前邀请确认 | `CourseJoinConfirmScreen.kt`（登录前路径） | REDESIGN | 先展示课程和邀请事实，再完成邮箱身份；不得在确认前假入班 |
| `PAGE-STU-032` | 登录后扫码 | `ScanJoinScreen.kt`（已登录路径） | REDESIGN | 与登录前共用含义，但保留 Android 相机权限和返回行为 |
| `PAGE-STU-033` | 输入邀请码 | `EnterInviteCodeScreen.kt` | REDESIGN | 正常、格式错误、过期、撤销、关闭、加载和恢复输入 |
| `PAGE-STU-034` | 入班确认 | `CourseJoinConfirmScreen.kt` | REDESIGN | 显示课程、教师和邀请有效状态；二次确认后才提交 |
| `PAGE-STU-035` | 入班结果 | 当前仅 Toast/返回 | ADD | 区分成功、同学期已有班、自然过期、宽限耗尽、撤销/关闭、失败和重试 |

邀请默认有效 30 分钟，可配置 5—120 分钟。只有自然到期前已登记的流程可获得一次不可刷新的 10 分钟宽限；撤销或关闭立即终止。

## 4. 运动、证据与提交

| ID | 页面 | Android 当前承载 | 处置 | 关键要求 |
|---|---|---|---|---|
| `PAGE-STU-040` | 运动会话 | `ExerciseRunningContent` | REDESIGN | `ACTIVE ↔ PAUSED → COMPLETED`；服务器时间和业务日期为准；显示实际时长而非旧学时 |
| `PAGE-STU-041` | 证据采集 | `FinishedContent`、`SessionMediaManager` | REDESIGN | 独立展示材料版本和槽位；游泳必须有前后照片，总计 2—6 图，可选 1 视频 |
| `PAGE-STU-042` | 提交与中断恢复 | 当前局部上传进度 | REDESIGN | 首次受理后批次锁定；展示续传、失败、恢复和重复提交保护；受理不等于有效 |
| `PAGE-STU-043` | 游泳延迟说明 | 无 | ADD | 完全离线时在 24 小时内提交说明转人工；不得补造前照或冒充按时提交 |

共同材料边界：每版最多 6 张图片和 1 段 MP4；单图 10 MB；视频 1—15 秒、含音轨、最大 100 MB；每版总量最大 250 MB。游泳结束后首次接受截止为 15 分钟，同一锁定批次继续上传为 30 分钟。

## 5. 记录、原始体测与一次补充

| ID | 页面 | Android 当前承载 | 处置 | 关键要求 |
|---|---|---|---|---|
| `PAGE-STU-050` | 打卡记录列表 | `CheckInRecords.kt` | REDESIGN | 放入“记录与进度”信息架构；区分待 AI、待教师、待补证、技术处理中、有效但未计入和无效 |
| `PAGE-STU-051` | 打卡记录详情 | `CheckInRecordDetail` | REDESIGN | 展示原始事实、材料版本、细分审核阶段、判断链、三种分钟和公开原因；不显示内部模型分数或隐藏备注 |
| `PAGE-STU-052` | 原始耐力结果 | `GradesScreen.kt`、旧 `EnduranceScoringScreen.kt` | REDESIGN | 只显示教师确认的时间/日期或免测状态；未确认显示空态，绝不显示 0 分 |
| `PAGE-STU-060` | 一次补充任务 | 无 | ADD | 展示六类固定公开原因之一、原文公开补充说明、24/72 小时总截止或维护暂停剩余时间、原材料只读引用和唯一一次提交机会；系统逾期原因单独展示 |
| `PAGE-STU-061` | 补充材料已接收 | 无 | ADD | 明确“已接收，等待教师复核”，不得表示有效、通过或已经计入 |

## 6. 免测、认证与账户服务

| ID | 页面 | Android 当前承载 | 处置 | 关键要求 |
|---|---|---|---|---|
| `PAGE-STU-070` | 免测/认证 | `ExemptionScreen.kt` | REDESIGN | 同一申请最多 3 张 JPEG/PNG/WebP、每张 10 MB；不得套用运动证据上限 |
| `PAGE-STU-080` | 账户信息 | `AccountDetailsScreen.kt` | RETAIN | 仅显示本人身份事实；不可把未验证信息显示为已验证 |
| `PAGE-STU-081` | 设置 | `ProfileSettingsScreen` | RETAIN | 语言、主题和退出等客户端设置；不得加入业务规则开关 |
| `PAGE-STU-082` | 账户注销 | `AccountDeletionScreen.kt` | RETAIN | `ACTIVE`/`PENDING` 阻断及影响说明准确，不声称删除历史审计引用 |
| `PAGE-STU-083` | 已验证邮箱 | `ContactBindingScreen.ManageContacts` | RETAIN | 邮箱验证、错误和恢复；不展示敏感完整凭证 |
| `PAGE-STU-084` | 帮助中心 | `HelpCenterScreen.kt` | RETAIN | 静态/样例来源可辨识；清理旧学时、成绩和未实现能力说明 |
| `PAGE-STU-085` | 反馈 | `FeedbackScreen.kt` | RETAIN | 五类反馈；提交后显示“待受理”，不得自动指派不存在的处理人 |
| `PAGE-STU-086` | 关于 | `AboutScreen.kt` | RETAIN | 版本和能力边界真实，不宣称 Backend 或完整业务已上线 |
| `PAGE-STU-087` | 更新日志 | `ChangelogScreen.kt` | RETAIN | 清理成绩、设备 Push、完整离线等不再成立或尚未实现的描述 |
| `PAGE-STU-088` | 隐私政策 | `PrivacyPolicyScreen.kt` | RETAIN | 无定位/路线；相机和麦克风按需；不写入真实学生资料作为演示 |

## 7. 处置汇总

| 类型 | 数量 | 页面 |
|---|---:|---|
| RETAIN | 17 | 001、003–007、009–010、080–088 |
| REDESIGN | 20 | 002、008、020–025、030–034、040–042、050–052、070 |
| ADD | 4 | 035、043、060、061 |
| 合计 | 41 | 全部 P2W 学生页面编号 |

`PAGE-STU-041` 和 `PAGE-STU-042` 虽然能复用现有媒体与上传构件，但当前没有达到可独立评审的 V8.1 页面状态，因此归入 REDESIGN，而不是视为已完成。
