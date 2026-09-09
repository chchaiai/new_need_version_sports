# G1 当前候选与 CR 集中决策包

请先阅读 [集中提交说明](coordination/P7-G1-CR-submission-20260909.md)。接收对象是负责补协议的前Phase/Contract负责人，H可同步同一份材料。当前阶段候选及CR供协议决策使用；Z/H均PARTIAL，不代表正式G1验收、TRACK_READY或部署授权。

按用户16:29转交方案：提交候选与CR → 协议负责人明确方案并发布唯一新Contract版本/SHA → H/Z及Android/Web按归属适配并验证影响范围 → 完成真实联合链与G1验收 → 进入后续Phase7/G2。具体历史表示落地必须在G1联合验收前完成。

本包包含：

- new_need_version_sports/：当前Z完整Backend源码/迁移/测试/原始证据/根Owner登记，以及冻结Contract构建输入。124项测试源哈希与当前字节相同，65个注册operation。已交付16:08源码后仅增加两条H表Owner登记和对应测试数据，当前H精确Owner共9张。
- coordination/：两份完整CR、历史表示影响盘点、测试目录登记、负责人流程原件、v3计划及H最新接收说明。原12项查询CR与新增第13项学生目录分别标明；方向确认不等于具体schema/版本批准。
- h-received/：H16:12集中包的独立原始目录，59项清单文件加manifest；已有H文件字节未改。没有把H装进Z服务。H附带Z v1.3迁移仅为测试夹具，不能用来覆盖Z最新迁移。

实际Z基线 f95c3833870fe0da55a297aa28c958ec53e9e935，候选未提交。Contract 1.3.0-contract / RC，canonical SHA 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed。两份CR尚待具体接受，没有更改冻结协议、业务规则或客户端。

Z最新Docker结束 2026-09-09T08:25:29.353Z：1160项中1156通过、4失败、0跳过。四项保留400/INVALID_REQUEST期望及实际500，不等待伪造全绿再递交协议问题。Contract1003、Architecture22、Foundation14通过，G1为117/121，typecheck/lint/codegen通过。H的44PG/HTTP+92单测是收到的原始报告，Z未重跑；双方计数不相加作为联合结果。

测试目录已获准用于明确标记的测试环境；版本/学期/覆盖已登记。正式目录验收仍未通过，Course运动日程不能替代教师SLA工作日日历。H仍有权威活动/前后凭证、调整期限/后续材料链和真实COS等未完成项；Z结算/职责等依赖也保留。收到本包或批准CR，不表示这些工作已完成。

Source/Contract只读比较完成后，后续需在独立同基线checkout按所有权装配。不能把两个目录直接覆盖合并，不能在无.git解压目录伪造HEAD。Z自检入口为Backend下 bash src/bootstrap/run-g1.sh，创建独立临时PG/Mailpit与内部网络、无宿主端口并清理；当前仍应报告4项CR失败。实际服务入口及development限制见运行说明。

只含示例环境文件和隔离合成测试代码/证据；不含真实.env、生产密钥、数据库、邮件或node_modules。H脚本作为原始材料保留，没有在Z执行。H源目录原始ZIP未收到，因此只声明manifest文件核对，不冒充原ZIP验证。

SOURCE-MANIFEST.json覆盖本包所有其他文件的长度/SHA；包外verification.json记录本ZIP哈希。用户自行转交，本次没有发送消息、GitHub操作或修改正式STATUS。原16:08交付ZIP仍保留原字节。
