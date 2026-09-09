# Phase 7 / G1 H-Z 候选与 CR 集中交接

**PARTIAL / NOT_TRACK_READY；协议决策用 Draft，不得直接合并或按完整后端验收。**

本次经用户明确授权上传候选并创建 Draft PR；不执行合并、部署、协议修订或双方联调。所有新增内容位于本交接目录，未修改仓库运行中的 Backend、权威 Contract、客户端或正式 STATUS。

## 请协议负责人先读两份完整 CR

1. [已注销学生的历史表示：完整 CR](snapshot/coordination/P7-Z-CR-historical-student-01.md)
2. [查询参数错误码：完整 CR（原 12 项＋新增第 13 项）](snapshot/coordination/P7-Z-CR-query-errors-01.md)
3. [集中提交说明和需要作出的决定](snapshot/coordination/P7-G1-CR-submission-20260909.md)
4. [历史主体影响盘点](snapshot/coordination/P7-Z-CR-historical-student-impact.json)

第一项需明确具体历史主体类型/字段、相邻 PII 策略和版本；不能伪造姓名、性别或年级。第二项需明确各操作 INVALID_REQUEST/HTTP400 范围，新增 listStudentAccounts 不能沿用原 12 项审核结论。两项均待协议负责人决策，不因上传而视为批准。

## 固定输入

- 仓库：`chchaiai/new_need_version_sports`
- 已核实远端 main / 上传分支共同起点：`f95c3833870fe0da55a297aa28c958ec53e9e935`
- 原 Phase 7 入场：`200ff07e22ff6e2e253d965765a498088af2463c`
- Contract：`1.3.0-contract / RC`
- canonical LF SHA-256：`5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`

## 候选目录及版本关系

| 目录 | 内容 | 验证边界 |
|---|---|---|
| `snapshot/new_need_version_sports/` | Z 16:34 集中包中的源码、迁移、证据及冻结输入副本 | Z 自报 1156/1160 通过，4 失败；H 未重跑 |
| `snapshot/h-received/` | Z 原包独立保存的 H 16:12 快照 | H 44 PG/HTTP＋92 单测；历史快照，不是最新 H |
| `h-latest/BNBU-Sports-Backend/` | 本次补入 H 最新三个模块、六个迁移及证据 | H 本机隔离测试 51 PG/HTTP＋92 单测通过 |

H 最新包含 `1720_material_preparation.sql`、内部就绪事务、并发唯一事件和回滚验证；本地各方开发目录均未覆盖或提交。候选目录不是一个已装配服务，不得将测试数量相加作为双方联合结果。

## 当前验证与失败

- H 最新：51 PostgreSQL/HTTP、92 单元通过，0 失败/跳过/TODO；类型及静态检查通过。原报告在 [H 数据库报告](h-latest/BNBU-Sports-Backend/evidence/phase7/h-a/h-a-preparation-postgres.tap)、[H 单元报告](h-latest/BNBU-Sports-Backend/evidence/phase7/h-a/h-a-preparation-unit.tap)。
- H 架构诊断 unexpected=[]，正式 gate 仍未通过，本地 10 张 H 表待根装配对齐；Z 集中包登记的是此前 9 张。新增 `exercise_record.material_preparation → exercise-record`。
- Z 集中包报告：1160 项，1156 通过、4 失败、0 跳过；4 项保留期望 400/INVALID_REQUEST 与实际 500。Contract 1003、Architecture 22、Foundation 14 通过，typecheck/lint/codegen 通过。
- 双方真实联合链、最新共同迁移、实际权限/注销并发及真实 COS 未验证；测试替身不算真实来源通过。本次上传只核对文件和清单，没有运行候选脚本或重跑后端。

## 未完成与范围

H 仍有权威活动/前后凭证、调整期限持久化、真实上传/探测/存储故障恢复及公开完成/Case 交接工作。内部材料就绪事件不是 Review Case，也不表示运动有效。

Z 仍有正式来源、结算/职责等分支依赖。已注销历史主体表示保持待完成。G2 审核等按既定门禁启动；不以本次候选上传冒充 G1 或整个 Phase 7 完成。

## 已确认执行顺序

H/Z 继续当前开发 → 提交 G1 候选和 CR → 协议负责人补协议并发布唯一版本/SHA → H/Z 适配、Android/Web 按归属验证受影响部分 → 真实 G1 联合验收 → 继续 Phase 7/G2。

无需全员返回重做 Phase 5；协议补齐必须在 G1 验收前，而非整个 Phase 7 DONE 后。Phase 8 正式客户端旧 API/Mock 迁移分工不变。

## 上传完整性与安全

源集中包 SHA-256：`7aa046a9953b544e246979980bae21b5eaebe49d6f230656225377c40ba35a92`。

[UPLOAD-MANIFEST.json](UPLOAD-MANIFEST.json) 记录 296 个候选/证据文件的长度与 SHA。逐文件与来源匹配；本文件及本目录 .gitattributes 是上传说明，不在来源清单内。快照字节按原样保留，历史 README 中“未上传/未收到后续实现”等是快照时点，当前说明优先。

两个 `.env` 示例按本机安全规则未读取、未复制、未上传，已在清单列明；未上传实际凭据、签名材料、node_modules 或 Git 元数据。该副本不是开箱部署包，不因缺示例配置而补造配置。后续运行必须由对应 Owner 在获准隔离环境设置真实提供方。
