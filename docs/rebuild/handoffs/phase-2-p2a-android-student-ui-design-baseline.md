# Phase 2 P2A：Android 学生端 UI 设计基线交接

> 历史状态说明：本文固定在 `49d992a...` / V8.0，记录初次设计时的证据，不是当前业务权威。当前复审以 `main@8c9826822f35876f8d01480f8baf184027711dfe` / V8.1 为准；下列 `PENDING-P2W2-01` 已被 `BD-20260904-01/02` 的六类公开原因决定关闭。

交付日期：2026-09-04。设计版本：`P2A-UI-2026.09.04-draft1`。

**完成状态：DONE（设计基线与实施范围）。Compose UI、接口接入和功能验收仍未开始。**

## 1. 阶段基线

| 项目 | 固定值 |
|---|---|
| Git 根目录 | `D:\DT\soprts\start3\worktrees\phase2-android-student-ui` |
| 分支 | `codex/phase2-android-student-ui` |
| HEAD / 聚合仓库基线 | `49d992a1333294ea561923cfea0b7d25864a4d91` |
| Android tree | `a5071942e2371dc288e8b9e3630080f60e344761` |
| P2W 设计 Commit | 离线 `9140fd3c41994b8cd7f2ad64729abeafad644267` |
| Web UI Commit | 离线 `2ec249166d9c27404cef97a814a9dbc2f9a5adec` |
| Web 交付 HEAD | `codex/web-ui-local-preview` / `74b616653cbae36670c8c9b284c240be7438d480` |
| Contract | `1.2.0-contract` / `RC` |
| OpenAPI SHA-256 | `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a` |
| Android Owner | `PENDING-P2A-OWNER-01` |
| Reviewer | `PENDING-P2A-OWNER-01`（Android / Web 负责人姓名未提供） |

本阶段读取根 `AGENTS.md`、`docs/rebuild/STATUS.md`、四份 v8.0 业务正文、教师辅助优先交接、P2W 设计包、Web 学生端离线实现和现有 Android Compose 页面。Portal 的嵌套 `AGENTS.md` 不适用于本次写入范围。

## 2. 权威与追溯

业务唯一权威仍为：

- [总业务流程](../../business/00-overview.md)
- [学生端业务流程](../../business/10-student-flow.md)
- [教师端业务流程](../../business/20-teacher-flow.md)
- [管理员端业务流程](../../business/30-admin-flow.md)

本阶段新增文档只把这些规则映射到 Android 页面、状态和候选代码路径，不增加、修改或解释新的业务决定。发生冲突时，四份正文优先于 P2W、Web 实现、Android 旧代码和历史文档。

## 3. 本阶段产物

| 文件 | 内容 |
|---|---|
| [设计包入口](../phase-2/android/p2a-student-ui/README.md) | 固定输入、优先级、不变护栏、待确认项与完成边界 |
| [页面清单](../phase-2/android/p2a-student-ui/page-inventory.md) | `PAGE-STU-*` 41/41 映射；18 RETAIN、19 REDESIGN、4 ADD |
| [用户流程](../phase-2/android/p2a-student-ui/user-flows.md) | 启动、登录、入班、分钟进度、运动、证据、游泳、一次补充和账户流程 |
| [状态矩阵](../phase-2/android/p2a-student-ui/state-matrix.md) | 七状态定义、页面组覆盖、业务状态分离和安全切换 |
| [实施范围](../phase-2/android/p2a-student-ui/implementation-scope.md) | A—F 批次、逐文件候选路径、禁止目录和停止条件 |
| [交互与无障碍](../phase-2/android/p2a-student-ui/interaction-accessibility.md) | 返回、权限、TalkBack、大字体、媒体恢复、评审证据模板 |
| 本交接 | 阶段结果、差异、风险和下一阶段条件 |

未更新 `docs/rebuild/STATUS.md`：领导要求 STATUS 只由指定汇总人维护，当前未提供该身份。

## 4. 已冻结的 Android 方向

1. 保留现有 Compose 设计系统、五标签框架、认证外壳、Android 权限/相机适配、主题和返回逻辑。
2. 以“首页 / 课程 / 打卡 / 记录与进度 / 我的”为固定底部导航。
3. 从学生可达 UI 中移除最终成绩、换算分、等级、排名和耐力评分转换器。
4. 统一显示 1,200 分钟、两个类别和实际/有效/计入分钟，不继续使用旧小时阶梯。
5. 达到日/周/类别/总目标后仍允许新的真实运动，只说明可能不计入。
6. 提交只表示受理；UI 覆盖系统、AI、教师、技术、补充、复核、有效、无效和逾期等阶段。
7. 补充只有一次；游泳证据、锁定批次和完全离线说明使用独立页面状态。
8. 所有页面使用 `NORMAL / LOADING / EMPTY / ERROR / FORBIDDEN / MAINTENANCE / RESUME` 状态包络。
9. 无 Backend 时只生成清楚标识的 UI 评审样例，不伪造正式成功或数据写入。

## 5. Web 与 Android 的使用边界

P2W 设计包是页面、流程和状态设计依据；Web UI Commit 是视觉参考。实际 Web 代码仍残留旧 20 小时/小时换算、提交即有效等数据和流程，因此 Android 不机械移植其运行逻辑。

允许 Android 与 Web 不同：

- Material/Compose 组件和尺寸；
- 系统返回、相机和权限处理；
- 小屏、横屏、字体缩放和深色主题适配；
- Android 矢量运动图标的具体线条。

不得不同：业务术语、状态含义、数据口径、权限、流程终点和禁止披露内容。

## 6. 未决、风险与阻塞

| 编号 | 证据/问题 | 影响 | 处理 |
|---|---|---|---|
| `PENDING-P2A-OWNER-01` | 领导回复中的 Owner / Reviewer 仍为姓名占位符 | 无法完成正式设计签字和 PR reviewer 记录 | 用户或领导后续提供真实姓名 |
| `PENDING-P2W2-01`（历史，V8.1 已关闭） | 初次设计时固定教师退回原因分类尚未确定；V8.1 后已固定六类中英公开原因及动作适用范围 | 原 UI 中性字符串需要在复审修正中替换 | 当前按 `BD-20260904-01/02` 实施，不再等待该项决定 |
| `PENDING-P2A-BE-01` | 当前没有新 Backend | 无法验证真实加载、权限、写入、上传、审核和恢复 | 本阶段只做设计；接口到位后另阶段接入 |
| `PENDING-P2A-CONTRACT-01` | 当前 Contract 未完整表达 v8.0 状态和字段 | UI 展示模型不能视为正式协议 | Android 不改 Contract；后续由 Contract Owner 处理 |
| `RISK-P2A-WEB-01` | Web UI 交付未上传 GitHub，且压缩包含 macOS AppleDouble 元数据 | Git 历史命令告警，不能直接用该目录提交 | 保持只读；引用精确离线 Commit |
| `RISK-P2A-LEGACY-01` | Android 旧模型、API、缓存和页面仍含成绩/小时/旧提交语义 | 仅改 UI 后仍有后续协议迁移工作 | UI 阶段隔离展示；不越界改 core/network/model |

上述事项不阻塞开始 Compose 视觉与状态实现，但阻塞接口验收、正式功能验收或 Reviewer 最终签字。

## 7. 本阶段验证

本阶段执行的检查及真实结果：

| 检查 | 结果 |
|---|---|
| 预期设计/交接文件 | 7/7 存在 |
| `PAGE-STU-*` 精确集合 | 41/41；无缺失、无额外编号 |
| 七状态词汇 | 7/7 均有定义和页面组映射 |
| Markdown 本地链接 | 0 个断链 |
| 关键护栏静态核对 | 1,200 分钟、30/45/60、周二/三/四次、24/72 小时、6 图+1视频、10/100/250 MB、无定位、无设备 Push、无换算分和演示标识均存在 |
| 尾随空白 | 0 |
| 合并冲突标记 | 0 |
| `git diff --check` | 无输出；新增文件另由逐行空白检查覆盖 |
| Git 改动范围 | 仅本交接和 `docs/rebuild/phase-2/android/p2a-student-ui/` 下 6 个新文档 |
| 禁止目录 | 0 个改动 |

没有重新执行 Android 单元测试、Lint、构建、模拟器、真机或 E2E：本阶段未修改 Android 源码。上一阶段的构建结果不能替代后续实现后的重新验证。

## 8. 结束声明

- 是否修改业务规则：**否**。
- 是否修改 Contract：**否**。
- 是否修改 Android/Web/Backend 源码：**否**。
- 是否存在旧 API 引用：**是**，现有 Android 正式链路仍保留，未在设计阶段修改。
- 是否存在 Mock、演示或空接口：**是**，仓库原有本地评审数据和未实现服务边界仍存在；本阶段没有新增模拟成功或空接口。
- 是否更新 STATUS：**否**，遵守指定汇总人限制。
- 下一阶段前置条件：用户确认本设计基线并说“开始下一步”；开始代码前再次报告准确批次和文件；如需越过 UI 范围则停止并提交问题/Change Request。

## 9. 下一阶段建议

下一阶段从实施范围的“批次 A + 批次 B”开始：先建立通用七状态和禁止披露护栏，再改五个主导航与通知。该批完成后立即运行相关单测、完整 `testDebugUnitTest`、`lintDebug` 和 `assembleDebug`，然后单独汇报；扫码、会话、证据和补充流程不混入第一批。
