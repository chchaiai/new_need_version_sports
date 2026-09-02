# Phase 5D-B Web Legacy Migration Findings

> 固定目标：`1.1.0-contract` / `1d538483f96b95d777cc4dd02526b78a214bd663e036ea5a6c77f43dfa38d99d`
> 本阶段只盘点，不执行 migration，不修改正式 Client/DTO，不删除旧 Endpoint。

## 总结

- **Legacy Migration bundle：24**
- **正式 Web runtime 已验证绑定固定 1.1 operation：0 / 121**
- Student 正式边界仍集中在 `BNBU-Sports-Web-new/frontend/student/js/api.js`。
- Portal 正式边界仍集中在 `portal-teacher-admin/app/api-client.ts`、`teacher-data.ts`、`admin-service.ts`；其正式 generated snapshot metadata 仍是 `3.0.0-web-snapshot`。
- `phase5b-contract.generated.ts`、strict fixture、Mock 页面与 tests 只属于 validation-only consumer gate，不进入正式产品请求链。

## Migration Bundles

| ID | 当前正式边界 / 旧语义 | 固定 Contract 目标 | 分类与处置边界 |
|---|---|---|---|
| LM-01 | Student OTP、refresh/logout 仍使用旧 challenge/session/token DTO | `requestAuthChallenge`, `createStudentSession`, `refreshSession`, `logoutCurrentSession`, `logoutAllSessions` | `LEGACY_MIGRATION`；一次切换 auth DTO/error，无旧新 fallback |
| LM-02 | Portal password login/recovery/session restore 仍由旧 `api-client.ts` 驱动 | `createPasswordSession`, `requestAuthChallenge`, `resetPassword`, `refreshSession`, `getCurrentActor` | `LEGACY_MIGRATION`；保留 fail-closed 模式门禁 |
| LM-03 | Student/Portal 启动继续从旧 projection/fan-out 组装状态 | `getSystemMode`, `getAppReleasePolicy`, `getStudentDashboard`, `getTeacherDashboard`, `getAdminDashboard` | `LEGACY_MIGRATION`；Dashboard 不再由客户端补造 |
| LM-04 | Student `/me`、旧邮箱 challenge、旧 account deletion challenge/confirm | `getCurrentActor`, `changeOwnVerifiedEmail`, `getOwnAccountDeletionImpact`, `deleteOwnAccount` | `LEGACY_MIGRATION`；删除旧中间状态映射 |
| LM-05 | Student/Portal 学期仍依赖旧 current/list DTO 和页面本地摘要 | `getCurrentSemester`, `listSemesters`, `createSemester`, `updateUpcomingSemester`, `switchCurrentSemester` | `LEGACY_MIGRATION`；保留 404 无 current 与 summary 快照语义 |
| LM-06 | Student workspace 从 `enrollments`、`class-sections`、`courses` 多请求拼当前课程 | `getOwnCurrentCourse` | `LEGACY_MIGRATION`；单一正式 projection 替换 fan-out |
| LM-07 | Teacher 课程使用旧 course DTO/route，部分真实写能力未接入 | `listOwnCourses`, `createCourse`, `getCourse`, `previewCourseChangeImpact`, `updateCourse`, `closeCourse` | `LEGACY_MIGRATION`；不得恢复课程代码/教学班号 |
| LM-08 | Student join 和 Teacher invitation 使用旧 preview/capability/join/恢复数据结构 | `createCourseInvitation`, `listCourseInvitations`, `revokeCourseInvitation`, `previewCourseInvitation`, `joinCourseByInvitation`, `registerStudentAndJoinCourse` | `LEGACY_MIGRATION`；五种预览 content-state，不保留审批态 |
| LM-09 | Teacher roster/student page 仍从旧 enrollments/profile DTO 组装成员 | `listCourseMembers`, `removeCourseMember`, `restoreCourseMember` | `LEGACY_MIGRATION` |
| LM-10 | Portal roster reconciliation 使用旧 generated snapshot 和 service adapter | `allocateRosterImport`, `importOfficialRoster`, `listRosterSnapshots`, `getRosterSnapshot`, `listRosterFindings`, `resolveRosterFinding`, `revertCurrentRosterSnapshot` | `LEGACY_MIGRATION`；不保留旧“reopen finding”私有状态 |
| LM-11 | Student Session 仍含旧 `cancel`，且页面可清零/重开 | `getOwnActiveExerciseSession`, `startExerciseSession`, `getExerciseSession`, `pauseExerciseSession`, `resumeExerciseSession`, `completeExerciseSession` | `LEGACY_MIGRATION` + CD-01；新 Contract 无 cancel |
| LM-12 | Student media 使用旧 upload/confirm/bind/poll 和 `/media/{id}` 证据 DTO | `allocateMediaAsset`, `finalizeMediaAsset`, `authorizeMediaDownload` | `LEGACY_MIGRATION`；保持 allocation PUT headers/bytes 与唯一 200 finalization result |
| LM-13 | Student Record 先 Draft 后 submit；Teacher 审核使用旧 Record/status DTO | `submitExerciseRecord`, `listOwnExerciseRecords`, `getOwnExerciseRecord`, `listCourseExerciseRecords`, `getCourseExerciseRecord`, `appendExerciseRecordReview`, `listExerciseRecordReviews` | `LEGACY_MIGRATION`；无 Draft/resubmission/attempt |
| LM-14 | Student/Teacher 进度从旧 score/progress/target DTO 本地合成 | `getOwnCourseProgress`, `getCourseMemberProgress`, `listCourseProgress` | `LEGACY_MIGRATION`；百分比仅展示，判断使用权威原始值 |
| LM-15 | Student application 仍是 draft/update/submit；Teacher 使用旧 exemption/certification DTO | `createStudentApplication`, `listOwnApplications`, `getOwnApplication`, `supplementStudentApplication`, `listCourseApplications`, `getCourseApplication`, `decideStudentApplication`, `adjustCertificationCredit`, `revokeCertificationCredit` | `LEGACY_MIGRATION`；补材料不是 Record 重提 |
| LM-16 | Student `previewEnduranceConversion` 与旧 score projection；Teacher 旧 endurance DTO | `getOwnEnduranceOutcome`, `getCourseMemberEnduranceOutcome`, `confirmEnduranceMeasurement`, `listEnduranceRuleTables`, `getEnduranceRuleTable`, `reviseEnduranceRuleTable` | `LEGACY_MIGRATION`；学生仅读正式结果 |
| LM-17 | Teacher 调用 `/student-scores/{id}/recalculate` 与 `/publish`，Student 读取旧 published score | `getOwnFinalGrade`, `listCourseFinalGrades`, `listFinalGradeHistory`, `publishFinalGrade` | `LEGACY_MIGRATION`；改为教师直接填写 int32 + ≤50 字备注 |
| LM-18 | Student/Portal feedback 使用旧 list/detail/status DTO；部分 Admin real mutation 不开放 | `createFeedback`, `listOwnFeedback`, `getOwnFeedback`, `listFeedbackForAdmin`, `getFeedbackForAdmin`, `processFeedback` | `LEGACY_MIGRATION`；正式 summary 不由当前页本地重算 |
| LM-19 | Student help 和 Admin help 使用旧 DTO；Admin real 写能力仍未接入 | `listPublishedHelpArticles`, `getPublishedHelpArticle`, `listHelpArticlesForAdmin`, `createHelpArticle`, `getHelpArticleForAdmin`, `updateHelpArticle`, `transitionHelpArticleState` | `LEGACY_MIGRATION` |
| LM-20 | Student 有旧通知 client；Teacher/Admin 没有正式通知中心 | `listOwnNotifications`, `getOwnUnreadNotificationCount`, `markOwnNotificationRead` | `LEGACY_MIGRATION` + UI-06；只做站内通知，不引入 Push/device token |
| LM-21 | Admin overview/current courses 使用旧 fan-out/只读 projection | `getAdminDashboard`, `listCurrentCoursesForAdmin`, `getCurrentCourseForAdmin` | `LEGACY_MIGRATION`；管理员不下钻单条 Record/media |
| LM-22 | Admin teacher/student/sub-admin 页面大量写动作仅 demo/localStorage，正式页还宣称 API 未开放 | `listTeacherAccounts`, `getTeacherAccount`, `validateTeacherAccountBatch`, `createTeacherAccountBatch`, `deleteTeacherAccount`, `listStudentAccounts`, `getStudentAccount`, `listSubAdmins`, `getSubAdmin`, `createSubAdmin`, `updateSubAdmin`, `setSubAdminState`, `deleteSubAdmin` | `LEGACY_MIGRATION`；不得用 demo 成功替代 Backend |
| LM-23 | Admin global rules/system/audit 使用旧 service 或 demo state | `listEnduranceRuleTables`, `getEnduranceRuleTable`, `reviseEnduranceRuleTable`, `getSystemMode`, `listSystemModeTransitions`, `switchSystemMode`, `listAuditEvents`, `getAuditEvent`, `requestAuditArchive`, `getAuditArchiveJob`, `authorizeAuditArchiveDownload` | `LEGACY_MIGRATION`；保留 permission、maintenance、job/download 边界 |
| LM-24 | Portal 正式 generated types 的 metadata 为 `3.0.0-web-snapshot`；1.1 types 只在 `phase5b-*` validation files | 全部 121 operation | `LEGACY_MIGRATION` 总门禁；正式 repository/client 每个 Slice 完成前不得宣称已绑定 1.1 |

## 代表性当前证据

- Student 旧 fan-out：`frontend/student/js/api.js:911-928`。
- Student cancel 与 Draft：`frontend/student/js/api.js:1040`、`frontend/student/js/screens/checkin.js:1165-1209`、`:1565-1573`。
- Portal 当前导航：`portal-teacher-admin/app/portal-app.tsx:170-188`；Teacher 无 Dashboard/Notifications，Admin 无 Notifications。
- Portal 正式 snapshot：`portal-teacher-admin/openapi/contract.json:8` 为 `3.0.0-web-snapshot`。
- Portal Admin 写入门禁：`portal-teacher-admin/app/admin-service.ts:80-81` 为 `BACKEND_REQUIRED`；Sub-admin 仍写 localStorage。
- Portal Teacher 旧成绩链：`portal-teacher-admin/app/teacher-data.ts:539-554`。
- Phase 5B 1.1 binding 仅由 `phase5b-contract-fixtures.ts` / `phase5b-contract-mock.tsx` / tests 消费。

## 后续迁移顺序门禁

1. 每个 Slice 先加载固定 1.1 generated types，再建立单一 Repository/API adapter；
2. 同一 Slice 删除旧 Endpoint/DTO/mapper 后才算迁移完成，不保留 old/new response fallback；
3. strict content/empty/error、权限、maintenance、idempotency/expectedVersion、上传和浏览器 console 均通过后再进入下一 Slice；
4. Migration 不得修改业务权威或倒逼 Contract 兼容旧状态；
5. 本文不是 Phase 7 授权，也不是 Backend、Staging 或发布验收。
