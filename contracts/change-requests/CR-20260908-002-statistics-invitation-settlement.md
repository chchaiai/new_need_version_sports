# CR-20260908-002：统计规则、邀请流程和关闭结算协议

第六步统一登记：本CR实施已纳入 `1.3.0-contract / RC / 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`，最终同SHA技术回归通过；原DRAFT/分步结果保留历史。用户最终Review/接收待第七步，未代签。见[最终证据](../validation/step06_final/result.json)和[统一CR](CR-20260908-004-rc-consolidation.md)。

- 状态：本地实施及自检；随 Phase5 第六～七步做最终候选核验与 Owner 接收。本文件不是独立人工审查签字。
- 授权：用户指令“好的，开始第4步”；依据已接受的七步计划，串行完成4.1、4.2、4.3后停止。用户兼任 Contract Owner/Reviewer，Codex执行；GitHub由用户操作。
- 仓库：`phase5-contract / codex/phase5-contract-v81`；HEAD `974587c3778a53803a7959ea0f64677581e239f4`。本步仍是未提交工作区候选。
- 前驱：`1.3.0-contract.phase5-step03.1 / DRAFT / 2569c529c4ce332b25d6cc66b281b52c31cf160db5e46181ad552838cdb0df87`。
- 输出：`1.3.0-contract.phase5-step04.1 / DRAFT`；唯一完整 SHA 见[生成元数据](../contract-metadata.json)，实际验证绑定见[机器结果](../validation/step04_courses/result.json)。不能将本步完成写成最终 RC 接收。

## 依据与范围

消费四份[业务正文](../../docs/business/00-overview.md)的统计/开课模板、邀请、关闭及期末章节，以及已接受 [Phase4 Z](../../docs/architecture/new-requirements/p4-design-zhou-v81.md) A/E 和最终第12节、[H](../../docs/architecture/new-requirements/p4-design-huang-v81.md) B/F 的来源保护与待办结果。较早 PENDING、LOCKED、移出后首次材料未决等段落为历史；P-01～04最终结论与上一 CR 原链规则继续有效。

本次只改 Contract 源、生成物、验证、覆盖说明和既有状态交接；四份业务正文保持第三步已授权字节，不另设业务规则，不改架构、产品客户端、后端、数据库、Migration 或 infra。A-08算法从已接受原文逐字节提取，只作有限验证参考，不是 Backend 实现，也不暴露内部 `TryPublishSelection` 为公共 API。

## 4.1 规则与计入结果

| 内容 | 协议落点 | 行为与验证边界 |
|---|---|---|
| 总管理员发布固定模板；教师读取选择 | `listPublishedRuleTemplates`、`publishRuleTemplateVersion` | 固定1200、门槛30/45/60默认30、单次60、每日1、每周2/3/4默认3。发布者必须ADMIN且adminKind=SUPER；不新增第九项分管理员权限，也不经GLOBAL_RULES间接授权；首次改密门禁保留。 |
| 草稿到正式发布 | `createCourse`、`updateCourseDraftRule`、`prepareCoursePublication`、`publishCourse` | DRAFT不能加入/运动；只接受服务器绑定草稿、模板、学期、日历版本的可完成性凭据。完整合法见证可证明可行，完整精确搜索/严格不可能证明才可判不可行；资料不全/计算未完是UNAVAILABLE。600/600与610/590在20个60分钟日的差异有算例。 |
| 发布后冻结 | `CourseRuleVersion`、Session/Record的`ruleVersionId` | 类别目标、门槛、频率、正常时间和收尾安排不可修改；`CourseChangeProposal/UpdateRequest`只留名称/说明及原影响确认。发布新模板不改已发布课程。旧Course目标/时间字段仅是同一规则的服务端摘要，不能独立写入。 |
| 来源一致统计 | `StudentCourseProgress`、`StatisticsCheckpoint`、`ProgressSourceVersions` | CURRENT / RECOMPUTING / UNAVAILABLE明确区分；旧检查点可明确标为重算中的历史结果。来源缺失/失败/前驱丢失不能当0、VALID或首次空选择。规则、Record集合、B候选集合、认证、成员范围和前驱都绑定。 |
| 逐条与汇总 | `listCheckpointRecordCredits`、`ProgressTotals`、`CourseStatisticsScope` | 实际秒数s→一次取整m→门槛/单次上限q→联合选择a。两类各一行，`0≤a≤q≤60`；日/周名额只占实际贡献>0的记录，认证不占。先认证、后按开始instant/稳定ID分配；先最大总量，再完整保留仍最优的原组合，再早开始/ID成员位序。 |
| 三分列与解释 | `RecordCreditDetail`、`RecordCreditExplanation` | 无效列用当前INVALID实际整分钟；有效未计入只算Σ(q-a)；公式未纳入m-q另列。待审/技术处理中不算无效；部分计入只能解释为类别余额，不伪造日/周拒绝。1199即使显示100%仍未达标。 |
| 合法新运动 | `startExerciseSession` | 删除达标拒绝，日/周满额也不拒绝新的真实运动。保留邮箱、成员、学期、课程、原正常时间/补练许可、模式及唯一进行中Session检查；不允许客户端写实际时间或分钟。 |

Source保护不仅是读取两遍：对应Owner集合增删/行变化与检查点前驱必须在共同保护下复核，保护持续到头、明细、合计、指针、回执和审计提交。失败不发布半份结果；旧回执重放不回切当前指针。跨行算术、来源身份/完整性、原子性由服务端运行实现验证，JSON Schema不能单独证明。

## 4.2 邀请与同一次注册流程

创建请求改为`lifetimeMinutes`，省略=30，允许5～120；不再让客户端指定正式expiresAt。服务器保存原到期值，二维码/手动码一致。预览仍为纯读取，增加`newRegistrationAllowed/unavailableReason`，即使码尚ACTIVE也能说明JOIN_CLOSED；预览不判断某主体是否拥有既有宽限。

- 已有学生：登录并验证学校身份，调用`registerExistingInvitationFlow`建立绑定本人和原邀请的服务器流程；最终`joinCourseByInvitation`携带flowId。
- 新学生：主动开始注册时，`registerNewInvitationFlow`将一次生成并复用的随机256位clientFlowNonce摘要绑定到原邀请和服务器流程，返回敏感flowAuthorization；不额外收集个人资料，不要求到期前已完成邮箱验证。最终原`registerStudentAndJoinCourse`携带flowId/授权、资料和STUDENT_EMAIL_BINDING OTP，验证邮箱及唯一教学班并原子绑定账号/成员。邮箱验证可在宽限内完成，但其验证码有效期不延长；原成功精确重放不再次消费OTP，不返回半个账号/成员。
- 流程登记必须`registeredAt < originalExpiresAt`；第一次成功必须`acceptedAt < originalExpiresAt + 600秒`。等于即拒绝，服务器完整精度比较；点击/扫码/本地草稿/验证码请求/HTTP返回时间均不是登记或受理证据。
- 刷新、重试、再次打开不延长。撤销、入班关闭、课程关闭、学期失效立即阻止未完成流程；自然到期后仍有合法宽限时也必须可撤销。已有合法成员不受码到期影响。
- 先验证主体/原作用域，再查询精确原成功回执，再核验新命令的模式/期限/版本/当前来源。相同完整请求只返回同一结果，一流程至多一次成功Enrollment；已成功后过期重放不算再次加入。不同请求同键冲突。

凭据不入URL/日志、原始值不明文持久化；初次或原匿名主体授权精确重放才可返回敏感值。匿名流程凭据不是有效邮箱身份，也不授予登录权。Identity/Enrollment参与式事务、最终消费proof、派生/重现敏感回执、限流和并发终止仍须Phase7真实验证；本步没有搭建登录或发送验证码。早期自检候选将OTP验证提前至登记，已纠正，最终候选不收紧既定宽限。

## 4.3 关闭、补练与结算报告

`closeCourse`不再要求先清空待办。它原子阻止新成员、新Session、新申请/补练入口，并终止未完成邀请宽限；关闭前合法Session的结束、尚未首次受理的材料原链、锁定同批续传、一次补证/审核及已受理名单/OCR/申请继续受原资格和期限保护。`COURSE_CLOSE_BLOCKED`退役，不将关闭混同结算。

发布时固定常规截止、其后7天收尾、结算计划；截止前14天提醒，发布距截止不足14天立即提醒，不伪造已发送记录。新增责任教师指定单个成员/明确时段的`authorizeCourseMakeup`及教师/学生各自读取；仅原学期CURRENT、课程OPEN、成员ACTIVE、原收尾窗口内有效。真实日期/周不变，推迟结算不延长补练。

1. `prepareCourseSettlement`接收课程预期版本/原报告/已有更正事实与原因，由服务器取得每个独立Owner完整来源、完整Enrollment集合和逐学生A检查点及原内容。不能由客户端提交ready布尔、分钟或报告行；名单组合表不能反向批准自己。
2. READY/BLOCKED/UNAVAILABLE明确区分。未结束Session、FIRST_MATERIAL_PENDING、LOCKED_TRANSFER_PENDING、待审核、仍有效补证窗口、技术任务/故障、名单、体测、免测/认证等均保留具体Owner对象和原因。尚无首次回执不能漏掉；已补证受理且审核结束不空等旧期限；未达1200本身不是阻塞。
3. `confirmCourseSettlement`只接受准备凭据和报告前驱，在同一受保护提交点再次核对完整成员、所有Owner集合/行版本、每份检查点身份及内容、待办和前驱。变化则重新准备，不能替换时间/版本标签包装旧值。来源必须每个Owner恰好一次，不能凑相同总数。
4. 原子追加`SettlementReportVersion`、全部行、完整清单、回执、指针和审计/通知事实；历史读取按固定报告和检查点，不查当前缓存。更正版关联前版、既有授权事实、原因和责任教师，原报告不覆盖，已移出成员按权威历史范围保留；不恢复运动、补练、正常第二轮补证或改规则。P-04原链有限纠错沿第三步，不被此处扩张。
5. 管理员仅经SEMESTER权限查看课程级汇总/待办数量；无学生、媒体或成绩下钻。`switchCurrentSemester`必须消费并复核全学期权威完整课程集合的当前无阻塞结算结果，部分分页、读取失败或“曾有一份报告”均不能归档。

报告为数据版本，不表示PDF/导出文件已生成。未来文件生成失败仅标记该产物未就绪，不能把旧文件改名、声称提交事务回滚或暴露学生分数/排名。本步不新增最终成绩备注替代字段；H13与全出口隐私留第五步。

## 兼容性、验证与后续接收

本候选相对第三步新增15个path、17个operation、35个schema；新增15错误，退役达标、低于活动学时、关闭待办三个旧错误。总计132 paths /146 operations /261 schemas /87 errors。旧消费者需重新生成并迁移Course创建/修改、邀请创建/注册、统计结果和原规则引用；第三步Record样例只新增必填ruleVersionId以继续回归，原第三步历史证据不改写。

验证入口为[step04_courses](../validation/step04_courses/README.md)。同一最终SHA执行源码重复生成、结构/门禁、JSON Schema/Python/JavaScript、TypeScript生成类型与往返、Kotlin全模型编译及原CR-005运行回归、第三步完整回归、lint。有限模型另与A-08逐字节引用和独立小集合穷举对照；不宣称真实锁、账号、日历或性能已验收。

Phase6消费最终冻结Version/SHA并做端到端适配器/Mock检查；新增Android模型运行兼容须第六步候选门禁及Phase6定向接收。Backend选型兼容在Phase7.0，未通过不得关闭7.0/进入7.1，但后端尚未搭建不单独阻断Phase5/6。Phase7验证真实Owner完整来源、鉴权、学校日历/计划可完成性、OTP与幂等、事务/并发、计入/结算持久化与提醒；Phase9验证恢复/E2E。当前DRAFT readiness预期阻断，不能写RC PASS。
