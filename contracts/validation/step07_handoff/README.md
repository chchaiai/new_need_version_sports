# Phase 5 最终接收与 Phase 6 输入包

本包对应新版Phase5「新 API Contract / OpenAPI」第七步。技术交付已审核通过，**PR #9已合并并核验字节，Phase6接收负责人已明确**；新版Phase5完成7/7步，Phase6为READY / NOT_STARTED。本地收尾记录待用户同步GitHub；Web实际加载确认属于Phase6 T01，不登记为已发生。用户是Contract Owner/Reviewer，Codex是执行与自检方。本包不登记陈昊或任何未参与者通过。

## 1. 唯一接收对象

- Repository：`https://github.com/chchaiai/new_need_version_sports.git`
- 工作分支：`codex/phase5-contract-v81`
- 基线Commit：`974587c3778a53803a7959ea0f64677581e239f4`
- 候选：`1.3.0-contract / RC`；OpenAPI原始SHA-256：`5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`
- 规模：157 paths、176 operations、316 schemas、99 errors。
- 公开路径仍`/api/v1`，本轮不兼容旧协议。两个历史4.0.1候选和各步DRAFT不得作为本轮输入。
- 已发布来源Commit：`f702c590ff10b11f7de038332868c988ab4cec11`；合并输入基线：`d7e241ebf5293eb0fed42187544fedc73ecef53f`；[PR #9](https://github.com/chchaiai/new_need_version_sports/pull/9)于2026-09-08T04:20:43Z合并。合并文件树与已审核来源完全一致。原基线不包含本轮改动，收尾记录引用实际已有协议提交，不伪造自引用。

[metadata](../../contract-metadata.json)、[release manifest](../../release-manifest.json)及[第六步结果](../step06_final/result.json)必须保持同一OpenAPI SHA。合并后已只读核对main为`d7e241ebf5293eb0fed42187544fedc73ecef53f`，其Git文件树与已审核来源一致。该固定提交供后续入场核验；main以后仍可能移动。

## 2. 需要Reviewer核对的具体内容

| 审查对象 | 本候选的行为 | 对应证据 |
|---|---|---|
| 首次材料与原链 | 普通首次严格早于结束后24小时；同批完整传输严格早于受理后30分钟。合法原链不因关闭/移出截断；游泳15/30/24及补证24/72保持独立 | CR-001、AT19～21/24、H04/H16、fixtures的prior-workflow组 |
| 审核与纠错 | 规定检查完成、六类均不适用而仅剩疑虑时通过；技术失败不等于检查完成。一次补证、逐轮SLA、学校日历、实际暂停和有限故障纠错均有独立状态/来源 | CR-001、AT01～08、H02～05/H15/H17/H18 |
| 统计与结算 | 实际/可计/计入分钟分开，完整来源和前驱约束；课程关闭只阻止新起点，两类未完链阻塞结算；报告更正追加历史 | CR-002、AT09～14/22～25 |
| 名单、OCR与治理 | OCR只产生草稿，身份核对及耐力歧义必须由教师确认；SUPER治理技术服务，不取得教学代审权 | CR-003、AT15/17/28 |
| 学生隐私与历史 | 移除学生最终成绩读取；学生所有出口禁止分数/等级/排名/历史remark；新成绩无remark，全部当前已认证教师只能只读历史remark | CR-003、AT18/25、学生可达schema检查 |
| 生成兼容 | 原三组七分支及三组新增union全部显式映射；nullable、数字/布尔枚举、省略字段保持wire含义。生成脚本/模板可追溯，无手改DTO | CR-005、CR-004、第六步324模型编译和159实际模型往返 |
| 边界与责任 | 未把协议自检当人类Review或产品验收；真实后端/校历/权限/事务/OCR/恢复仍待后续阶段 | disposition、下表和NOT_RUN清单 |

CR路径均在[change-requests目录索引](../../change-requests/README.md)。F06-01～03为CLOSED_SELF_VERIFIED；这是执行者的技术整改记录，不是独立人类Review。用户随后明确回复：“最终交付是否正确落实决定  审核通过，可以开始准备上传和交接”。现登记为ACCEPTED，绑定第1节的固定Version/Status/SHA及manifest中的接收记录；这是用户本人的Owner/Reviewer结论，不是自动检查代签。

## 3. 操作、字段、场景与样例

- [完整差异](contract-diff.json)：相对固定旧RC，新增56操作、移除1操作（`getOwnFinalGrade`）、35操作定义直接变化、17操作定义未变但引用的schema变化；68操作定义及引用schema未发现变化。共156个schema新增/删除/变化条目。此分类不是向后兼容承诺；全体消费者加载完整新RC。
- [完整操作目录](../../operation-catalog.md)：实际Method/Path/operationId、角色、权限、作用域和幂等。字段/required/null/枚举/响应/错误差异通过JSON Pointer与前后值定位，完整定义仍以OpenAPI为准。
- [追溯表](traceability.json)：12个已有BD、AT01～28、Phase2实际41个PAGE-STU页面及七状态，关联GAP、CR、operation、schema与样例。没有编造REQ编号。AT26/27的旧接管能力被后续决定取消，仅保留后续拒绝/无副作用验收。
- [固定样例](fixtures.json)：复制最终SHA上实际使用的992例，其中159合法、833非法；保留名称、schema、payload与预期结果。所有数据均为合成，不是真实学生资料。样例用于协议边界，不等于已跑完整UI Mock。
- [构建清单](build-result.json)：上述机器材料的SHA与统计；使用`build_handoff.py --verification <第六步最终证据目录>`可重新产生。源为Git固定旧协议、当前新协议、实际Phase2/4文件和最终运行fixture，不手写一套影子协议。

Phase2材料中的旧wire、展示词表和尚未实现的按钮不是API权威。例如PAGE-STU-008沿用学生业务§5.3的学校/管理员身份核验渠道；不额外捏造在线申请/批准接口。学生课程页只映射本人入口，不因共享页面名称获得教师`getCourse`权限。七状态为客户端呈现：连接失败不能伪装维护，处理中不能伪装无效，依赖失败不能伪装成功空数组。

## 4. Phase 6分发与后续验收

用户明确确认：Web负责人为甘洛夷，Android开发、总体架构和6C两端结果汇总由用户负责，依据原话登记于release manifest。Phase5按任务书T09交付已发布的跨端验证包；两端实际加载同Version/SHA及各任务Reviewer、可写路径属于Phase6 T01。材料已交给用户用于转交，未代写甘洛夷收到、验证通过或Review结论。

| 目标 | 本次交付 | 接收人及门禁 |
|---|---|---|
| 6A Android | 同SHA OpenAPI、源/工具配置、模板与运行支持、fixture、差异/场景表 | 用户本人已确认负责Android及接收，并已审核接受最终候选；实际Gradle工具链生成/编译、Mapper、严格读写和UI Mock；不能直接用Phase5 JVM通过替代 |
| 6B Web（学生/Portal） | 相同完整协议、TypeScript生成选项、fixture、错误/权限与UI对应 | 甘洛夷负责，实际接收/加载确认待6B T01；两处实际验证轨的生成、边界、Mapper/Mock及受影响构建 |
| 6C统一汇总 | A/B同Version/SHA报告、CR分类、Legacy清单 | 用户本人负责汇总；双方绑定一致且阻塞Contract defect关闭后才可通过6C |
| Backend7.0 | 冻结协议与BE-CR005-COMPAT用例要求 | 人员可按已确认安排在7.0入场落实；选型兼容和CertificationKind等Domain/Database对齐未通过，不得关闭7.0/进入7.1 |

Phase6发现问题：Contract defect返回Phase5走CR/新Version/SHA，两端重验；业务不明确回业务Owner；Legacy issue进入Phase8清单；Client Defect在获准验证轨整改。不得为凑通过改当前RC或引入私有DTO遮蔽协议问题。

真实学校日历由Academic Term/Data Owner提供；后端状态机、鉴权、来源、事务和媒体生命周期归Phase7；正式网络迁移及FCM清理归Phase8；E2E、真实恢复/性能/OCR质量归对应Phase7～9任务；完整七态/无障碍/隐私定稿归Phase10；Release证据归Phase11。均不登记提前通过。

## 5. 用户GitHub操作及固定提交

用户已经执行提交、推送、创建PR和合并，Codex只读核验了来源提交、实际合并提交及相同协议字节。[Web交接说明](WEB_HANDOFF.md)随协议发布，甘洛夷具名分工及发布回执在本次文档收尾同步。Phase6真正开工前落实各任务Reviewer、允许路径及实际输入加载记录。

执行顺序：核对指定分支/HEAD/文件清单与SHA → 仅暂存批准清单 → 检查暂存原始字节与空白 → 用户本地commit → 非强制push工作分支 → 用户创建/审核PR → 检查实际PR head、main差异和适用检查 → 用户merge → 只读核验远端合并Commit及RC字节。任何文件或基线变化先诊断，不force push、不覆盖旧仓库。

Commit由Git实际产生后，将完整来源Commit、PR和合并Commit与上述SHA共同登记为发布回执。若需要仓库内记录自身提交，以后续仅文档提交引用先前已含完整协议的提交，不能伪造自引用。协议发布回执现已完成；甘洛夷的实际加载确认仍待Phase6B T01。

新版Phase5状态为DONE，7/7步完成；Phase6为READY / NOT_STARTED。此结论覆盖交付方已发布协议和验证包，不冒称两端实际加载或产品验收。Codex未代用户执行GitHub写操作；本次发布事实与分工的文档回填尚未提交，之后只由用户同步，不重新发布不同字节的协议。第六步及本目录早期result.json保留各自执行时点，不把历史NOT_OPERATED当作当前发布结论。
