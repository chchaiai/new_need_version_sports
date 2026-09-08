# CR-20260908-003：名单、耐力OCR、技术治理与学生数据边界

第六步统一登记：本CR实施已纳入 `1.3.0-contract / RC / 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`，最终同SHA技术回归通过；原DRAFT/分步结果保留历史。用户最终Review/接收待第七步，未代签。见[最终证据](../validation/step06_final/result.json)和[统一CR](CR-20260908-004-rc-consolidation.md)。

- 状态：`LOCAL_IMPLEMENTATION_COMPLETE / FINAL_REVIEW_PENDING`。用户已授权本步实施；最终第六～七步Review、RC身份与分发未完成，不提前标记全部消费者已接收。
- 用户兼任Contract Owner/Reviewer，Codex执行/自检。GitHub由用户操作；没有代签陈昊或声称独立人工Review完成。
- 前驱：`1.3.0-contract.phase5-step04.1 / DRAFT / 90e7bbb0af1988e1212a631c775d5d6a3e80e59f7da9b79a05f09da8f276a06b`。
- 当前：`1.3.0-contract.phase5-step05.1 / DRAFT / bb57149dd3a28926ae3d9daa5345353b5529c03fc13c6ba2e338851c1924159c`；157 paths /176 operations /316 schemas /99 errors。
- HEAD仍`974587c3778a53803a7959ea0f64677581e239f4`，分支`codex/phase5-contract-v81`；当前是未提交的本地候选字节，不能用HEAD代表该候选内容。

## 来源、授权与范围

用户“好的，开始第5步”授权5.1→5.4串行完成；本轮随后明确答复“允许同步两份正文并继续”，已按事先准备的两段补丁同步[总流程](../../docs/business/00-overview.md)与[教师正文](../../docs/business/20-teacher-flow.md)的GAP-H13决定，其余正文不变。这是承接Phase4已接受决定，无新业务规则。

来源为四份业务正文，以及已接受[H §14、15、19.7](../../docs/architecture/new-requirements/p4-design-huang-v81.md)与[Z A/E](../../docs/architecture/new-requirements/p4-design-zhou-v81.md)。H早期PENDING/LOCKED按最终19节替代。本步只写Contract源/产物/验证/必要说明、两份明确批准正文及现有状态交接。未建立Backend、数据库、Migration、产品Mock或部署。

## 四项交付与行为

1. **5.1 名单（GAP-H08 / AT-15）**：电子XLSX/CSV直接解析，纸质原图按用途/课程授权上传与核验，只产草稿；100MiB为名单单次合计上限，500人员行包含重复/错误，不能静默丢弃。原图/原始位置/提取文本保留。教师显式确认身份或有理由排除；所有定义身份的行终结且稳定身份唯一后，原子写snapshot、entries/findings、完成状态、current pointer、收据及审计/outbox。不得建账号、入班或踢出名单外成员。综合名单以完整Owner来源与精确内容版本组合注册、耐力、学时、待办及结算；缺来源不是0或100%。固定版本导出与取件再次鉴权。
2. **5.2 耐力（GAP-H09 / AT-17）**：原`4.30`保留并阻断自动解释；教师给整数秒或明确`mm:ss`，服务端校验两者一致、项目/性别/年级/日期/身份和规则revision。明确选中行、行/批次/Enrollment/outcome前驱，所有选中行预检、唯一换算成功后一起提交，任一失败全退；重复行ID不能去重后继续。未选行保持待处理，技术成功/部分确认都不是全部完成。纠错追加measurement/conversion和原因/前版，不覆写原文或旧结果；旧无换算历史可以保留，新确认不得重复旧“先保存measurement再给null换算”语义。
3. **5.3 技术治理（GAP-H10 / AT-28）**：仅SUPER配置三种用途、规范scope、不可变service revision与人工窗口，八项分管理员权限不间接授予。客户端提交预配置连接/凭据的opaque reference，不提交或回显secret、prompt、脚本、原始媒体。真实探测与完整采样分开，缺来源显示UNKNOWN/UNAVAILABLE；旧成功探测不当成健康。质量依据本校标注样本/时间窗和精确配置，不把confidence当正确率。外部连接/凭据/评估registry由Phase7 provider准备；无真实匹配证据不能开启VLM自动通过，可按既有规则走人工。证据可来自同一推理配置的关闭态评估revision：服务端核对provider/model/version、scope、purpose、连接/凭据reference及policy的canonical SHA，启停治理标志不改变推理输入身份，避免要求尚未发布的未来revision自证。任务仍绑定实际发布revision，迟到/重复结果不覆盖教师决定。人工窗口只路由硬校验通过的未决任务给原责任教师，恢复不重审已终局任务。
4. **5.4 隐私/备注（GAP-H12/H13 / AT-18）**：撤销学生最终成绩API，学生耐力与Dashboard只保留原始项目/时间/日期/免测，不含conversion/分数/等级/排名/remark，包括null及嵌套字段。学生通知拆为专用DTO/路由，旧generic通知只供教师/管理员；创建、读取、计数、回放均不得返回禁止消息。所有输出先正向白名单构造，缓存按actor/scope/schema/source身份，旧缓存清除失败就不可用，不回退；导出/下载重新核权，日志/崩溃/分析/审计/outbox不带成绩值、通知正文或敏感材料。新最终成绩不写或复制remark，signed int32不收紧为0～100，耐力规则行remark仍保留。历史remark不物理删除，所有已认证且当前角色TEACHER均可只读，不按责任教师、成员或治理分组收窄；专用API只返回历史备注/对象元数据，不扩大跨教师成绩值或修改权限。读取目的及actor/对象/服务器时间审计失败则拒绝交付。

## API 影响

公开基路径仍为`/api/v1`；实际变更31个新增、8个调整、1个撤销operation。所有方法/路径/角色/DTO及原有完整索引见[生成目录](../operation-catalog.md)。下表由当前生成物与第四步快照直接比较，不是另一个Contract来源。

| 变化 | Method/Path（均在/api/v1下） | operationId | Request → success DTO | 角色/范围 |
|---|---|---|---|---|
| 新增 | `POST /courses/{courseId}/teaching-source-allocations` | `allocateTeachingSource` | `TeachingSourceAllocationRequest` → `TeachingSourceAllocation` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `POST /courses/{courseId}/assessment-roster-exports/{artifactId}/download-authorization` | `authorizeAssessmentRosterExportDownload` | `—` → `AssessmentExportDownloadAuthorization` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `POST /courses/{courseId}/teaching-source-assets/{sourceAssetId}/download-authorization` | `authorizeTeachingSourceDownload` | `—` → `TeachingSourceDownloadAuthorization` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `POST /admin/manual-mode-windows/{windowId}/closure` | `closeManualModeWindow` | `CloseManualModeRequest` → `ManualModeWindow` | ADMIN; `SUPER_ADMIN_ONLY` |
| 新增 | `POST /courses/{courseId}/endurance-capture-batches/{batchId}/confirmation` | `confirmEnduranceDraftRows` | `ConfirmEnduranceRowsRequest` → `EnduranceRowsConfirmation` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `POST /courses/{courseId}/endurance-capture-batches` | `createEnduranceBatch` | `CreateTeachingBatchRequest` → `EnduranceCaptureBatch` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `POST /courses/{courseId}/roster-import-batches` | `createRosterBatch` | `CreateTeachingBatchRequest` → `RosterImportBatch` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `POST /courses/{courseId}/teaching-source-assets/{sourceAssetId}/finalization` | `finalizeTeachingSource` | `TeachingSourceFinalizeRequest` → `TeachingSourceAsset` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `GET /courses/{courseId}/assessment-roster-exports/{artifactId}` | `getAssessmentRosterExport` | `—` → `AssessmentExportArtifact` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `GET /courses/{courseId}/assessment-roster` | `getAssessmentRosterProjection` | `—` → `AssessmentRosterProjection` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `GET /courses/{courseId}/endurance-capture-batches/{batchId}` | `getEnduranceBatch` | `—` → `EnduranceCaptureBatch` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `GET /student/notifications/unread-count` | `getOwnStudentUnreadNotificationCount` | `—` → `UnreadNotificationCount` | STUDENT; `SELF` |
| 新增 | `GET /courses/{courseId}/roster-import-batches/{batchId}` | `getRosterBatch` | `—` → `RosterImportBatch` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `GET /admin/technical-service-status` | `getTechnicalServiceRunStatus` | `—` → `TechnicalServiceRunStatus` | ADMIN; `SUPER_ADMIN_ONLY` |
| 新增 | `GET /courses/{courseId}/assessment-roster/{projectionId}/rows` | `listAssessmentRosterRows` | `—` → `AssessmentRosterRowPage` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `GET /courses/{courseId}/endurance-capture-batches` | `listEnduranceBatches` | `—` → `EnduranceCaptureBatchPage` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `GET /courses/{courseId}/endurance-capture-batches/{batchId}/rows` | `listEnduranceDraftRows` | `—` → `EnduranceDraftRowPage` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `GET /courses/{courseId}/members/{enrollmentId}/endurance-measurements` | `listEnduranceMeasurementHistory` | `—` → `EnduranceMeasurementPage` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `GET /teacher/historical-final-grade-remarks` | `listHistoricalFinalGradeRemarks` | `—` → `HistoricalFinalGradeRemarkPage` | TEACHER; `ALL_AUTHENTICATED_CURRENT_TEACHERS_HISTORICAL_REMARK_READ_ONLY` |
| 新增 | `GET /admin/manual-mode-windows` | `listManualModeWindows` | `—` → `ManualModeWindowPage` | ADMIN; `SUPER_ADMIN_ONLY` |
| 新增 | `GET /student/notifications` | `listOwnStudentNotifications` | `—` → `StudentNotificationPage` | STUDENT; `SELF` |
| 新增 | `GET /courses/{courseId}/roster-import-batches` | `listRosterBatches` | `—` → `RosterImportBatchPage` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `GET /courses/{courseId}/roster-import-batches/{batchId}/rows` | `listRosterDraftRows` | `—` → `RosterDraftRowPage` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `GET /admin/technical-service-revisions` | `listTechnicalServiceRevisions` | `—` → `TechnicalServiceRevisionPage` | ADMIN; `SUPER_ADMIN_ONLY` |
| 新增 | `POST /student/notifications/{notificationId}/read` | `markOwnStudentNotificationRead` | `—` → `StudentNotification` | STUDENT; `SELF` |
| 新增 | `POST /admin/manual-mode-windows` | `openManualModeWindow` | `OpenManualModeRequest` → `ManualModeWindow` | ADMIN; `SUPER_ADMIN_ONLY` |
| 新增 | `POST /courses/{courseId}/roster-import-batches/{batchId}/publication` | `publishRosterBatch` | `PublishRosterBatchRequest` → `RosterBatchPublication` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `POST /admin/technical-service-revisions` | `publishTechnicalServiceRevision` | `TechnicalServiceRevisionRequest` → `TechnicalServiceRevision` | ADMIN; `SUPER_ADMIN_ONLY` |
| 新增 | `POST /courses/{courseId}/assessment-roster-exports` | `requestAssessmentRosterExport` | `AssessmentExportRequest` → `AssessmentExportArtifact` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `POST /courses/{courseId}/endurance-capture-batches/{batchId}/rows/{rowId}/decision` | `resolveEnduranceDraftRow` | `ResolveEnduranceDraftRowRequest` → `EnduranceDraftRow` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 新增 | `POST /courses/{courseId}/roster-import-batches/{batchId}/rows/{rowId}/decision` | `resolveRosterDraftRow` | `ResolveRosterDraftRowRequest` → `RosterDraftRow` | TEACHER; `RESPONSIBLE_TEACHER_ORIGINAL_BATCH` |
| 调整 | `POST /courses/{courseId}/members/{enrollmentId}/endurance-measurements` | `confirmEnduranceMeasurement` | `ConfirmEnduranceMeasurementRequest` → `EnduranceOutcome` | TEACHER; `RESPONSIBLE_TEACHER` |
| 调整 | `GET /student/endurance-outcome` | `getOwnEnduranceOutcome` | `—` → `StudentEnduranceOutcome` | STUDENT; `SELF_ACTIVE_ENROLLMENT` |
| 调整 | `GET /notifications/unread-count` | `getOwnUnreadNotificationCount` | `—` → `UnreadNotificationCount` | TEACHER/ADMIN; `SELF` |
| 调整 | `POST /courses/{courseId}/roster-imports` | `importOfficialRoster` | `RosterImportRequest` → `RosterImportBatch` | TEACHER; `RESPONSIBLE_TEACHER` |
| 调整 | `GET /courses/{courseId}/members/{enrollmentId}/final-grade-publications` | `listFinalGradeHistory` | `—` → `FinalGradePublicationPage` | TEACHER; `RESPONSIBLE_TEACHER` |
| 调整 | `GET /notifications` | `listOwnNotifications` | `—` → `NotificationPage` | TEACHER/ADMIN; `SELF` |
| 调整 | `POST /notifications/{notificationId}/read` | `markOwnNotificationRead` | `—` → `Notification` | TEACHER/ADMIN; `SELF` |
| 调整 | `POST /courses/{courseId}/members/{enrollmentId}/final-grade-publications` | `publishFinalGrade` | `PublishFinalGradeRequest` → `FinalGradePublication` | TEACHER; `RESPONSIBLE_TEACHER` |
| 撤销 | `GET /student/final-grade` | `getOwnFinalGrade` | `—` → `FinalGradeState` | STUDENT; `SELF_ACTIVE_OR_HISTORICAL_ENROLLMENT` |

## 通用边界和兼容性

- 新错误闭集：TEACHING_SOURCE_INVALID(422)、TEACHING_SOURCE_NOT_READY(409)、TEACHING_BATCH_NOT_REVIEWABLE(409)、TEACHING_ROW_UNRESOLVED(409)、TEACHING_DUPLICATE_IDENTITY(409)、TEACHING_SOURCE_STALE(412)、TEACHING_SOURCE_UNAVAILABLE(503)、ENDURANCE_CONVERSION_UNAVAILABLE(409)、TECHNICAL_SERVICE_REFERENCE_INVALID(422)、TECHNICAL_SERVICE_VALIDATION_REQUIRED(409)、MANUAL_WINDOW_CONFLICT(409)、PROJECTION_NOT_READY(409)。其余认证/范围/版本/课程/上传错误复用既有统一Envelope；每operation准确集合见OpenAPI。
- 新列表继续opaque keyset cursor，绑定调用者、用途、scope、过滤及完整数据revision。默认20/最大100；分页返回不证明完整Owner集合。读取缺来源用明确状态或503，不伪造空完成。
- 服务器实际事件使用UTC instant，测试日期独立LOCAL_DATE；预计恢复不是实际恢复。原系统模式NORMAL_ONLY与首次改密gate保留。维护PauseFact来源仍由system-mode内部事实提供，不新增客户端写计时器API。
- 新写命令用Idempotency-Key，先认证/原资源权限，再检查原提交收据，再做新命令模式/版本/来源检查；完整规范化输入决定幂等，服务端计算而非调用方自报digest。选中行、日期、秒数、source版本或规则变化均不能重放成原成功。旧隐私违规响应/通知收据不得因“精确重放”绕过学生隐私检查。
- 新上传只分配、验证来源，不等同导入/判定。纸图下载是受认证gateway，不用可转发公开bearer URL。Roster源总100MiB/500行仍固定；耐力上传技术容量由allocation返回，不擅自创造同样业务上限。历史缺batch/日期/来源计数仅如实null，Phase7/G2不得猜测回填；新批次发布必须有完整来源。
- **破坏性变更：是**。移除学生成绩入口和新remark字段，学生通知改路由/DTO，Roster导入变成batch结果，手工耐力新增日期/项目/来源前驱要求。不能给旧客户端返回新对象还声称兼容；不增加旧成绩适配出口。
- Android/学生Web：Phase6按最终唯一RC生成并验证正反例、嵌套/通知/缓存全出口；Phase8正式迁移。教师/管理员Web：草稿确认、partial/complete、scope/revision/人工模式、历史备注及审计反馈需按最终Contract开发。当前旧API引用和旧客户端仍存在，本步没有迁移产品。
- Backend/Domain/DB：Phase7.0验证所选栈兼容；不能把未建后端作为单独阻塞Phase5/6。Phase7按Phase4 Owner边界实现公开端口、稳定锁顺序、完整来源保护、唯一规则、原子收据/审计/outbox、鉴权和受认证下载，配置/secret/evaluation registry、真实学校样本独立准备；Phase9注入失败、恢复、缓存/通知/导出/E2E。未跑真实DB/Migration/服务。
- Mock/fixture：本目录只有隔离合成验证样本和有限规则oracle，不是产品Mock，不进入生产构建。Schema能拒绝结构字段，但不能证明自由文本无成绩语义或实际权限；必须有服务端模板/来源白名单及后续运行测试。
- 迁移/回滚：旧1.2.0 RC和每步DRAFT有独立完整快照；本候选只能审查验证。第六～七步确定正式唯一Version/Status/SHA和消费清单后才分发。若消费者或迁移失败，停止相关能力/分发；不靠回滚重开旧学生成绩、旧remark写入或删除历史。没有执行Staging/Production。

## 本地验证与未执行项目

最终验证入口：[README](../validation/step05_teaching/README.md)，[机器结果](../validation/step05_teaching/result.json)。同一最终SHA：两次生成字节一致、verify/lint通过；Python/JavaScript各273例、34项结构破坏、248项有限设计模型通过；58个合法TypeScript样例/9个非法断言与往返、357个Kotlin模型编译。第四步436例/39变体/437模型、第三步224例/21变体/38计时模型，以及原CR-00559例/39变体与JS/JVM回归通过。

DRAFT readiness仅因DRAFT exit1，为EXPECTED_BLOCKED，不是RC PASS。新Android类型真实反序列化/运行拒绝仍在第六步候选门禁与Phase6，不拿模型编译代替；真实Backend、数据库并发、学校源、OCR准确率、授权下载、通知/缓存/日志和E2E均NOT_RUN。用户尚未完成本候选的最终Review，Codex不代签。

失败/诊断保留：early-check-01的合成年份与version0错误负例已修复（合法初始version0不收紧）；verification-01误传旧基线路径，按已有README更正；verification-02揭示耐力批次误带仅名单需要的null-only字段导致Kotlin Null类型无法编译，已从源中删除无意义字段，未手改生成代码。上述旧SHA/日志不充当最终证据。verification-03为最后完整通过结果。
