# H 消息与负责人方向接收 — 2026-09-09 15:27

状态：RECEIVED / P7-Z PARTIAL。本次整理消息和源码快照，保持用户此前“暂缓联调、继续 Z”的安排；截图内 H 的接入请求不是已经执行联调的记录，也不是 H TRACK_READY。没有代发消息、GitHub 写操作或新增正式互审。

## 收到和核验

工作区收到的是解压目录 P7-H-A-integration-snapshot-20260909，未发现原 ZIP。已按原字节复制到 incoming/H-integration-20260909-1527；原目录保留。manifest 声明的79项全匹配，另保存manifest本身，共80文件；三个用户截图一并归档。共同 HEAD 与 canonical Contract SHA 均匹配。见 [接收核验](incoming/H-integration-20260909-1527/intake-verification.json)。哈希一致证明收到的文件与提供清单一致，不代替执行证明。

最新两个原始报告为 h-a-query-postgres.tap（37/37）和 h-a-query-unit.tap（83/83），均零失败/跳过；只是收到并核对报告，本机尚未运行 H 代码。H 自报类型/lint通过、architecture unexpected=[]；正式 H 架构门禁仍待完整接入。Z 已登记七张表不等于 H 完整扫描通过。

H 最新运行接入请求已读：Session 查询权限、维护期精确回放、材料 checksum/位置冻结和离线游泳已推进；真实 Record 提交 HTTP、原子回执/outbox、维护/故障调整窗口、活动/游泳事实、完整媒体读取/完成/下载和 COS 仍未完成。H handoff 中若干旧计数和旧待办由本次15:10接入说明覆盖；不能把交来的源码快照称为整轨完成。

## 负责人方向

- 允许明确标记的测试目录用于测试环境。已整理 [测试目录版本、学期、覆盖和用途](P7-Z-test-catalog-register-20260909.md)；真实目录验收未通过，正式来源仍待负责人协调。课程发布日程与教师 SLA 学校工作日日历分开记录。
- 历史主体 CR 的处理方向已确认，具体表示尚未批准。已补齐 [完整历史学生提案](P7-Z-CR-historical-student-01.md) 和 [10个schema/33个响应操作盘点](P7-Z-CR-historical-student-impact.json)，含当前/已注销联合类型、相邻PII出口、Android/Web、版本和验收。应在本轮 G1 候选汇合、联合验收前统一决定并实施。
- H 对查询参数 CR 仅做静态复核，建议接受12项最小错误码补充；尚未获得 Owner 发布接受及新版本/SHA。已在 [查询参数 CR](P7-Z-CR-query-errors-01.md) 区分明确范围错误与指数写法/重复参数待定项，后两者移出明确验收输入；冻结 Contract、公共错误 Mapper、生产解析器均未改。

## Z 本轮验证与回传准备

本轮仅更正 g1.test.ts 中待修 CR 的验收输入，其他产品源码不变；固定 Docker 单入口于 2026-09-09T07:32:57.727Z 完成，1144项中1141通过、3失败、0跳过。三项原有 CR 用例继续失败，typecheck/lint及其余套件通过，宿主exit1/清理exit0。当前不是 G1 PASS。

按 H 缺少完整 Z 源码的说明，准备一份完整 Backend 本地源码快照，包含1000–1110（比 H 请求的1100多出既有通知回执迁移）、根Owner登记/测试发现、运行入口、冻结依赖和最新原始证据。不是补发接口零件包，也不是整轨冻结或开始联调；由用户统一转交。H 的1500–1700源码保留在 incoming，没有写入 Z 产品目录。

真正接入需恢复集成工作后，由 Z 在隔离共同基线装配真实 Identity/Course/Mode/Session/注销事务，按所有权合并迁移并跑正式架构/HTTP/权限/回滚/并发链；H 的未完成 Provider 和 COS 不能用测试替身顶替。两个 CR 的具体决定/新版本及双方剩余实现仍是 G1 完成条件。
