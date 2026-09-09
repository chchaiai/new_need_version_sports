# G1 协议修订（当前）

用户已接受 [历史学生 CR](CR-20260909-001-historical-student.md) 和 [13项查询 CR](CR-20260909-002-query-errors.md)，授权按顺序实施并适配 Android/Web。目标1.4.0-contract / RC，明确不兼容，最终字节/测试/发布状态见 [本轮交接](../../docs/rebuild/handoffs/phase7-contract14.md)。Backend实际适配和G1联合验收未完成。

以下为1.3.0及更早发布历史。

# Contract Change Requests

当前第六步已统一为`1.3.0-contract / RC / 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`，原第2～5步CR本地实施及最终技术门禁完成，最终人工Review和发布仍待第七步。见[统一CR](CR-20260908-004-rc-consolidation.md)、[结果](../validation/step06_final/result.json)与[21项处置](../validation/step06_final/disposition.json)。后续任何外部行为变化仍须CR和新版本。以下阶段状态为历史。

旧正式Contract已经进入 `RC`，因此后续外部行为变化都必须先复制 [TEMPLATE.md](TEMPLATE.md) 建立 Change Request，再修改 Contract。当前工作候选为 `1.3.0-contract.phase5-step05.1 / DRAFT`，状态以metadata为准；新DRAFT不取消旧RC后的变更治理，也不允许作为最终RC分发。

新版Phase5第二步已接受CR-20260901-005，分阶段验收见其第7节。协议修复实施状态、Phase6两端验证和Phase7.0后端兼容验证分别记录；不能将IMPLEMENTED等同全部消费者通过。

Change Request 至少必须：

1. 引用已更新且状态为 ACCEPTED 的业务权威；
2. 列出 Method/Path/operationId、角色/权限、RequestDTO/ResponseDTO、错误、状态码、分页、上传、幂等、认证和 null/time 影响；
3. 评估 Android、学生 Web、Portal、Backend、数据库、Mock、Staging 和兼容性；
4. 标明破坏性/非破坏性及迁移/回滚方案；
5. 提升仓库 Contract 版本并重新生成 SHA-256；
6. 通过结构校验、OpenAPI lint 和 RC readiness；
7. 在下游重新加载前保持旧版本可识别，禁止静默覆盖。

命名：`CR-YYYYMMDD-NNN-short-slug.md`。状态建议使用 `PROPOSED / ACCEPTED / REJECTED / IMPLEMENTED`，不得把 `PROPOSED` 当作已授权行为。

第三步[CR-20260908-001](CR-20260908-001-material-review-timing.md)已获实施授权并完成本地候选与定向检查，最终Review/RC接收仍待第六～七步；DRAFT阶段readiness保持预期阻塞，不放宽最终RC门禁。

第四步[CR-20260908-002](CR-20260908-002-statistics-invitation-settlement.md)已按整步授权实施并完成本地定向核验；第六～七步最终Review/RC接收仍待完成。DRAFT readiness保持EXPECTED_BLOCKED，GitHub仍由用户操作。

第五步[CR-20260908-003](CR-20260908-003-teaching-governance-privacy.md)本地实施/验证完成；两份业务正文的H13同步已获用户明确授权。状态为LOCAL_IMPLEMENTATION_COMPLETE / FINAL_REVIEW_PENDING，不把实施授权当最终Review、RC发布或下游验收。第六～七步未开始。
