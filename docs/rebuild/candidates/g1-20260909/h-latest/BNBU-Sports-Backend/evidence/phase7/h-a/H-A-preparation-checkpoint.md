# H 未完成材料准备链 checkpoint — 2026-09-09 16:45 +08:00

状态 PARTIAL / IN_PROGRESS，不是 TRACK_READY 或 G1 PASS。共同 HEAD 仍为 `f95c3833870fe0da55a297aa28c958ec53e9e935`；H 候选未提交。Contract 不变：`1.3.0-contract / RC`，canonical LF SHA `5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`。

## Owner 最新流程

按用户转述负责人决定：H/Z 继续当前开发 → 提交 G1 候选和 CR → 协议负责人补协议 → H/Z 适配、两端验证受影响部分 → G1 验收 → 继续 Phase 7。

不返回重做整个 Phase 5，也不等整个 Phase 7 DONE 后再补协议。已注销主体历史表示保持待完成；不伪造个人资料，不提前改冻结 Contract。Phase 8 正式客户端旧 API/Mock 迁移分工不变。

## 本批实现

- `exercise-record/application/prepare-first-material.ts`：内部事务参与者，校验原批次、权威检查与完成时间，将全部就绪材料绑定到原 Record，保存唯一不可变准备事件；并发/重复执行不重复生成事件。
- `application/ports/material-preparation.ts`：Record 自有依赖协议。调用方必须已认证、已按模式/来源→Owner→Session 顺序持锁，policy 只能消费同事务已锁定来源；不能在此倒序获取模式锁，也不能默认允许调整链。
- `infrastructure/persistence/repositories/postgres-material-preparation.ts`、`1720_material_preparation.sql`：真实 PostgreSQL 准备事件、复合归属 FK、唯一约束和不可变保护。
- `first-material-transfer.ts`：拒绝晚于本次观察时刻的验证证据、异常验证时序及绑定到其他 Record 的对象。

该内部方法不独立建立事务、鉴权或注册 HTTP；调用方遇到错误必须回滚整个事务。它不发布审核结果，不伪造 Review Case，不改变最初受理回执。平台调整链仍由必需真实 policy 拦截；测试 policy 为明确的测试适配器。

## 实际验证

冻结 Node 24.19.0 / PostgreSQL 17.6、原 lockfile。隔离合成数据库、只读源码/Contract；未装配或运行 Z 1608 新包。

- 全部 51 项 PostgreSQL/HTTP 测试通过，0 失败/跳过/TODO；包括 1720 up/down/up、未就绪拒绝、准时字节晚检查、并发准备、准备事件 SQL 失败回滚绑定、批次/归属、来源不可用、截止等号及未来验证时间拒绝。
- 全部 H 92 项原生单元测试通过，0 失败/跳过/TODO。
- TypeScript、ESLint exit 0；架构诊断 unexpected=[]。正式架构 gate 仍 false，本地共有 10 张 H 表待根映射对齐，新增 `exercise_record.material_preparation → exercise-record`。
- 报告 `h-a-preparation-postgres.tap` SHA256 `f125eb6172a31a87ceb011165ed8cb1ae97af8271ab2a01f143632a3bacb075c`。
- 报告 `h-a-preparation-unit.tap` SHA256 `b86286beaded8b8296043759d152b7d01464450aabcd0b0f4365b1dd8c802a58`。
- 最终测试后只增加 policy 锁顺序说明注释，未改行为。两个精确 WI-0035 标签的临时容器已清理；只有合成数据库和临时依赖被丢弃，源码/报告保留。

## 分工核对与未完成项

只读核对 Z 1608 的 `ModeTimelineAccess` 和 `StudentOwnerLock`，未改 Z 文件。Mode 的实际 `read` 使用 FOR SHARE；消费方应在 Owner/Session 前获取，不把当前 NORMAL 当成完整事故依据。

重新阅读 v3 §10.2～10.3：G1 明确验收链止于媒体核验/绑定及 Record/首次受理，`record-review` 属于 G2。冻结 `completeExerciseRecordMaterial` 同时要求真实 Case handoff；因此本批不擅自注册一个只做绑定、不交接 Case 的公开完成接口，也不越界实现审核模块。该接口需在候选清单标明待完成；若 Reviewer 要求将其提前纳入 G1，须先明确最小跨模块范围。这是交付范围依赖，不是本次自行提出协议删改。

仍需：真实上传/检查/存储失败恢复、调整期限持久化和资格来源、完整公开完成/Review Case 链，以及 Z 实际权限/注销/根装配联合验证。不能说只剩最终联调。

未修改 Contract、业务、客户端或 Z 根；未引入旧 API、TODO 或注册默认成功实现。存在上述未接入真实提供方的必需 Port。G2 未启动，GitHub 未操作。

上一份 `P7-H-A-consolidated-source-evidence-20260909-1612.zip`（44/92）保持不变，不含本批 1720/准备服务。暂不要求额外小包转发或审查，后续集中候选再纳入。
