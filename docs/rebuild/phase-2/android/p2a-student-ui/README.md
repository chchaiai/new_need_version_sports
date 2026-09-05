# Phase 2 P2A：Android 学生端 UI 交付包

> 设计版本：`P2A-UI-2026.09.04-draft1`
>
> 状态：Compose UI 已实现并完成本地自动验证与本轮真机走查；等待 Owner / Reviewer 姓名、PR 审核及正式签字。当前没有 Backend，本状态不代表接口或完整业务验收通过。
>
> 本目录是实施与评审证据，不是新的业务规则来源。

## 1. 固定输入

| 输入 | 固定版本 | 用途 |
|---|---|---|
| 聚合仓库 | `main` 的固定 Commit `49d992a1333294ea561923cfea0b7d25864a4d91` | Android 开发基线及四份 v8.0 正文 |
| Android 源码树 | tree `a5071942e2371dc288e8b9e3630080f60e344761` | Compose 现状盘点 |
| Android 任务分支 | `codex/phase2-android-student-ui` | 后续 P2A 独立任务分支 |
| P2W 设计交付 | 离线 Commit `9140fd3c41994b8cd7f2ad64729abeafad644267` | 页面编号、流程、状态矩阵、原型和 AT 追溯 |
| Web 学生端 UI | 离线 Commit `2ec249166d9c27404cef97a814a9dbc2f9a5adec` | 已落地视觉与信息分组参考 |
| Web 离线交付 HEAD | `codex/web-ui-local-preview` / `74b616653cbae36670c8c9b284c240be7438d480` | 压缩包来源追溯；未上传 GitHub |
| Contract 只读快照 | `1.2.0-contract` / `RC` / SHA-256 `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a` | 识别缺口；本阶段不得修改或据此补造业务 |

业务含义只来自以下四份正文：

- [总业务流程](../../../../business/00-overview.md)
- [学生端业务流程](../../../../business/10-student-flow.md)
- [教师端业务流程](../../../../business/20-teacher-flow.md)
- [管理员端业务流程](../../../../business/30-admin-flow.md)

本轮同时读取[教师辅助优先更新报告](../../../handoffs/2026-09-04-teacher-first-business-update.md)。README、AGENTS、STATUS 和历史 handoff 只提供治理、路线及追溯信息，不覆盖四份业务正文。

## 2. 决策优先级

出现差异时按以下顺序处理：

1. 四份 v8.0 正文决定业务含义、权限、数据口径和状态语义。
2. P2W 设计交付决定共同页面编号、用户流程、状态覆盖和跨端信息分组。
3. Web 已落地页面用于视觉层级、组件组合和已有学生端呈现参考。
4. Android 可针对导航、返回操作、系统权限、相机/麦克风和屏幕尺寸适配，但不得改变业务规则。
5. 旧 Android、旧 Web、旧 Contract、旧 README 和历史 handoff 只作迁移参考。

不得把 Web 代码中的旧 20 小时、1/2 小时阶梯、提交即有效、成绩展示或旧重提逻辑带入 Android。

## 3. 本交付包内容

- [页面清单](page-inventory.md)：覆盖 `PAGE-STU-001` 至 `PAGE-STU-088` 的全部 41 个学生端页面。
- [用户流程](user-flows.md)：启动、登录、入班、打卡、证据、补充、记录和账户流程。
- [状态矩阵](state-matrix.md)：统一 `NORMAL / LOADING / EMPTY / ERROR / FORBIDDEN / MAINTENANCE / RESUME`。
- [实施范围](implementation-scope.md)：下一阶段候选文件、批次、禁止目录和停止条件。
- [交互与无障碍](interaction-accessibility.md)：Android 平台适配、TalkBack、权限、返回与评审证据。
- [阶段交接](../../../handoffs/phase-2-p2a-android-student-ui-design-baseline.md)：本阶段结果、缺口和下一阶段条件。
- [人工验收记录](manual-acceptance-record.md)：真机观察、三项 UI 缺陷修复与复测、未覆盖项和启动阻塞。
- [最终交接](../../../handoffs/phase-2-p2a-android-student-ui-final-handoff.md)：提交审核时的首要入口、范围、验证、风险和 Reviewer 清单。
- [PR 说明](pull-request-body.md)：可复制到 GitHub Pull Request 的说明正文。

## 4. 不变业务护栏

- 学生端不得显示、通知、导出或缓存最终成绩、耐力换算分、等级或排名。
- 学生身份只使用 `ACTIVE` 和 `PENDING`；`PENDING` 对学生显示“已退班”，不得显示“进行中”。
- 总目标为 1,200 分钟，同时展示两个类别目标；实际时长、有效分钟和计入分钟必须区分。
- 达到日/周上限、类别目标或总目标不得阻止新的真实运动。
- 提交成功只表示材料已受理，不等于有效、通过或已经计入。
- 原记录最多一次补充、总窗口 24 或 72 小时，不允许学生自助延期或第二轮补充。
- 每版运动材料最多 6 张图片和 1 段 MP4；免测/认证是另一套上限，最多 3 张图片。
- 不采集位置和路线；不使用设备 Push、短信或业务邮件通知，只呈现站内通知。
- 无 Backend 阶段只完成可评审 UI；演示数据必须明确标识，不伪造写入、审核或入班成功。

## 5. 当前待确认项

| 编号 | 项目 | 当前处理 | 是否阻塞 Compose UI |
|---|---|---|---|
| `PENDING-P2A-OWNER-01` | Android Owner、Android Reviewer、Web 跨端 Reviewer 的真实姓名未提供 | 保留待填，不猜测 | 否；阻塞正式签字 |
| `PENDING-P2W2-01` | 教师退回原因的固定分类尚未确定 | UI 使用中性原因文本和“待定分类”评审样例，不创建枚举 | 否；阻塞最终原因控件定稿 |
| `PENDING-P2A-PATH-01` | Compose 写入范围 | 已按 `implementation-scope.md` 冻结并执行；提交前再次验证禁止目录无差异 | 已关闭实施前置；不表示 Reviewer 已签字 |
| `PENDING-P2A-BE-01` | 新 Backend 和可用接口不存在 | 只设计状态与交互，不声称功能接入 | 否；阻塞接口/功能验收 |

## 6. UI 交付与功能完成的边界

本交付完成表示 Android 的页面、流程、状态、平台差异、Compose UI 修改和验证证据可追溯。它不表示：

- Contract 已支持 v8.0；
- Backend 已实现；
- 数据可持久化；
- 接口、全量七态、设备自动化或完整业务流程已经验收；
- Owner / Reviewer 已签字。
