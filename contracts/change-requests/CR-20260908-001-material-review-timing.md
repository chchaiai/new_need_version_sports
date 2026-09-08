# CR-20260908-001：材料受理、审核与计时

第六步统一登记：本CR实施已纳入 `1.3.0-contract / RC / 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`，最终同SHA技术回归通过；原DRAFT/分步结果保留历史。用户最终Review/接收待第七步，未代签。见[最终证据](../validation/step06_final/result.json)和[统一CR](CR-20260908-004-rc-consolidation.md)。

状态：IMPLEMENTED_LOCAL_CANDIDATE / FINAL_REVIEW_PENDING。用户已接受实施范围；本轮已完成第三步本地候选与定向检查，尚未完成最终Review/RC接收。

用户已经接受P-01～04，授权执行第三步，并在本轮明确允许将四项决定同步到四份业务正文。用户兼任Contract Owner/Reviewer；Codex执行和自检。此记录不代替用户对完成成果的最终审查，不登记陈昊通过。GitHub由用户操作。

输入：本地分支`codex/phase5-contract-v81`，HEAD `974587c3778a53803a7959ea0f64677581e239f4`；前一步工作候选`1.2.1-contract.phase5-step02.1 / DRAFT / 1df0e8a1b50b3b4c0cfa128064e8da714f949c761eec9aae9e9e64179d374b27`。目标为新的Step03 DRAFT，最终身份以生成metadata为准，不能冒充已提交RC。

## 来源与范围

业务权威：[总览](../../docs/business/00-overview.md#accepted-p01-p04)、[学生](../../docs/business/10-student-flow.md)、[教师](../../docs/business/20-teacher-flow.md)、[管理员](../../docs/business/30-admin-flow.md)。设计追溯：[H审核/计时及§19最终决定](../../docs/architecture/new-requirements/p4-design-huang-v81.md)、[Z材料及§12最终决定](../../docs/architecture/new-requirements/p4-design-zhou-v81.md)。

仅执行七步计划的3.1～3.4，对应GAP-H02/H03/H04/H05/H15/H16/H17/H18。统计算法、邀请结算、OCR治理、全学生出口交叉检查分别留第四/五步。因记录不再立即有效，旧Record固定0/60/120计入字段随本CR退役；完整的可计/实际计入来源投影由第四步补齐，当前DRAFT不供产品接入。

允许：contracts相关源/生成/CR/验证；四份业务正文只同步P-01～04；STATUS和已有Phase5 handoff；外部T03快照、日志和提案。禁止：架构正文、正式客户端/Backend/数据库/Migration/infra、旧仓库、Git提交与远端操作。无需每步另写完成说明。

## 3.1 首次受理与材料传输

保留`submitExerciseRecord`路径但以三个明确映射分支表示普通首次、游泳按时和游泳完全离线；分支决定材料要求，不新增第三类学时目标。类别、说明、同次运动材料清单、声明checksum、位置和游泳前后阶段锁定后不可改。服务器在正式受理时建立Record与版1，返回独立受理回执；它不是媒体就绪或VALID结果。

普通首次受理严格早于endedAt+24h，全部锁定对象完成严格早于acceptedAt+30m；客户端时间/开始上传不作裁决。原合法Session即使尚未首次受理，也不因课程关闭/成员移出失去原窗口。新的业务起点仍拒绝。每次鉴权先于原结果重放，重放先于当前版本/截止/模式的新写校验；新的意图须新key和最新版本。

增加资格读取、批次/材料读取、同批续传授权及完整材料确认入口。对象写入必须绑定同一资产与checksum，不能覆盖或用新对象替换锁定集合；签名URL的到期不重新发放业务期限。完整传输时点取资产Owner证明的全部必需对象完成时点，不取客户端回调或确认HTTP时点。探测技术失败不等于材料无效；技术恢复后若能证明原传输及时，仍可继续处理。

游泳每版保留前后照片，按15分钟首次/30分钟同批/完全离线24小时的专门路径处理。个人原因超出同批传输时限，按既有游泳延迟说明异常路径，不能自动VALID；普通材料不借游泳分支延长。教师补证须在24/72小时的最终有效截止前完成符合条件的正式受理，不额外赠送30分钟。

## 3.2 审核与教师动作

区分材料处理中、系统检查、AI等待、技术处理中、首版教师待办、待补证、补证复核、VALID、INVALID。非终态result为null，不自动写INVALID；待传输材料不会进入可审核的Case。技术流水和AI provider回调不暴露为学生可写API。

教师仍只有通过/退回补证/判无效；保留appendExerciseRecordReview名称和路径作为当前轮次命令，返回动作回执。六类原因保持闭集，真实性待核实只能退回，经核实重复/冒用只能判无效；补证逾期为独立系统原因。分类中英文与教师原文公开说明分开，同源用于详情和通知；没有隐藏备注。规定检查完成且六类均不适用、只有疑虑时通过，技术未完成不满足前提。

读写限定本人原资源或当前责任教师，不新增管理员代审/跨教师接管。新增去重的教师待办读取和有权教师的独立事实纠错命令；纠错保留原判断，不能修改运动/材料/日期/次数。

## 3.3 一次补证

首次退回永久消耗唯一退回动作，并开启默认24或特殊72小时总预算；不是已提交版2。版2须引用原版和退回事实，完整材料与Case/Timer/新轮次/通知/回执同一原子结果提交。材料版本只允许1/2，同版asset和位置唯一，合法原素材复用按当前版本计上限。补证正式受理即结束学生计时并进入教师round2，不能再次退回，旧AI结果不能覆盖。

保留原材料和原结果；同key同请求返回当时成功，不消耗第二次机会；同key异内容409，过期的预期版本412，不同新命令不能制造版3。真实逾期系统追加INVALID，不由教师点击，也不将教师晚审计作学生逾期。

## 3.4 SLA与错误逾期纠正

SLA公开计算状态、版本化校历引用、172800秒预算、已耗/剩余、实际暂停及权威截止。仅确认工作日的上海00:00至次日00:00可计；暂停取相交并集。缺日历或来源不完整时明确UNAVAILABLE，不制造dueAt/剩余0。开放暂停不以预计恢复冒充最终截止；日历修订不能无声改变已有轮次。超时只提醒，不判学生无效。

P-04通过已确认事故与唯一纠错事实恢复原剩余权益，原终局和合法后继保留；错误锁定到入口真正恢复前仍不计时。公开读取更正事实及剩余时间，不新增管理员任意解锁/指定时长API。平台纠错提交属于Phase7服务端受控流程，必须绑定原Case/轮次/材料/Timer/事故版本与合法后继保护，冲突定向复核。普通教师事实更正只改变已有事实判断，不发新窗口。

## 验证、兼容和退出

验证按生成一致性→完整结构及闭集映射→Schema正反例/类型生成→边界表和时间模型进行。覆盖端点相等、亚秒、关闭前未首次受理、不同本人/批次、六类动作、机会耗尽、重放、工作日跨界/缺数据、暂停重叠和错误终局恢复。纯协议时间模型不证明真实数据库锁、事务、上传、故障恢复或Backend权限。实际运行责任归Phase7，E2E/恢复归Phase9；Backend工具兼容仍在7.0，不把NOT_RUN写PASS。

本CR是破坏性候选：旧立即VALID、旧审查自由文本、旧单版材料消费者必须更新。新旧DTO不得混用；回退只切换到保存的完整旧版本包，不回滚业务历史。保留Step02源快照和原1.2.0固定提交。最终RC及两端共同固定Version/SHA在第六/七步，正式Mock/网络迁移分别Phase6/8。


## 实施与真实验证登记

候选`1.3.0-contract.phase5-step03.1 / DRAFT`，OpenAPI SHA-256 `2569c529c4ce332b25d6cc66b281b52c31cf160db5e46181ad552838cdb0df87`。本地未提交，HEAD仍为上述入场提交。相对第二步新增8个path/operation、33个schema；新增10个稳定错误并退役DAILY_RECORD_ALREADY_EXISTS（按日计入上限仍保留给第四步，不禁止同日独立合法运动）。所有新增操作详见生成[operation catalog](../operation-catalog.md)。

新增操作为getFirstMaterialEligibility、listRecordMaterials、getRecordMaterial、completeExerciseRecordMaterial、renewRecordUploadAuthorization、listTeacherReviewQueue、submitExerciseRecordSupplement、correctExerciseRecordReview。原submit/查询/审核/历史路径按上文替换语义；媒体分配与finalization承接原链与补证入口门禁，Notification增加required nullable reviewContext以携带同源公开原因。其他域操作未改变。材料历史由本人或当前责任教师读取，管理员无读取/裁决增权。

两次源构建字节一致；verify和lint通过；Python/JavaScript各223用例通过；21项本步破坏变体检出；38项有限计时边界通过。TypeScript17合法请求/响应、9非法判别值断言及往返通过；249个Kotlin生成模型编译，原CR-005七分支59例与39变体回归通过。readiness实际exit1，仅因DRAFT，明确不是RC通过。详见[机器结果](../validation/step03_workflow/result.json)。

未执行真实上传、后端鉴权/定时任务、数据库竞争/原子性、真实校历、恢复和E2E。本步新Android联合类型的分支赋值/完整运行序列化仍须在第六步最终候选门禁完成，再由Phase6正式接收；249模型编译不代替该项。没有修改生成DTO、正式客户端或Backend，也未执行GitHub。本地完成第三步后停止，不进入第四步。
