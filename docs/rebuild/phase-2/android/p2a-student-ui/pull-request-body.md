# PR 标题

`feat(android): add V8.1 student UI foundation (partial)`

# PR 正文（Push 后复制到 GitHub）

将 `[FINAL_COMMIT_SHA]` 替换为本次 Push 输出的新远端 HEAD；不得继续填写 `6e0456c...` 或初版 Commit。

## Summary

- PR 定位：`V8.1 Android UI foundation / PARTIAL`。业务权威为 `main@8c9826822f35876f8d01480f8baf184027711dfe` 的四份 V8.1 正文。
- 覆盖五个主标签、分钟与状态语义、入班、运动取证、记录与原始耐力、一次补充、免测/认证、通知和账户支持页面；Android Owner 为 `Exwind259`。
- 修复 P1：普通系统模式轮询失败不再伪造 `MAINTENANCE`；仅服务器明确确认维护时显示维护/补证暂停语义。
- 修复 P1：英文学生通知拦截 Score、Grade、Ranking 和数字 points 结果泄漏，同时保留合法的上传失败、初检通过等流程通知。
- 保留原 BNBU SPORT / VERITY AI 系统启动页；修复通知应用内语言、录像按钮、视频首帧/控制器、语言切换等待和视频底部说明等真机 UI 问题。

## Authority and traceability

- Final review commit: `[FINAL_COMMIT_SHA]`
- Business authority/base: `main@8c9826822f35876f8d01480f8baf184027711dfe` (V8.1)
- Original Android implementation base: `49d992a1333294ea561923cfea0b7d25864a4d91`
- V8.1 main sync parent: `f39c29dad2ddd3c2eb1d5924cff67d2ff825601d`
- Second-review issue baseline: `6e0456c9de45188b5b5a6139ad551274fed9685d`
- Design: `P2A-UI-2026.09.04-draft1`
- Contract: `1.2.0-contract` / `RC`
- Contract SHA-256: `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`
- Final handoff: `docs/rebuild/handoffs/phase-2-p2a-android-student-ui-final-handoff.md`

## Validation on the final commit

- `:app:testDebugUnitTest`: 447/447 passed across 78 suites; 0 failures/errors/skipped.
- `:app:lintDebug`: 0 errors and 5 existing warnings.
- `:app:assembleDebug`: passed; Debug APK 27,463,039 bytes; SHA-256 `c98e30158d687056292c790fe85bd30cb6606cb673ef92a74ed8aa7d9b51183f`.
- `:app:assembleDebugAndroidTest`: passed; AndroidTest APK 1,000,761 bytes; SHA-256 `517828c30cf54e5d130f6715516f650a1def669537c62021aaab15d8fe7d365d`.
- `:app:connectedDebugAndroidTest`: dedicated AVD `BNBU_P2_UI_Review`, serial `emulator-5554`, Android/API 37, model `sdk_gphone16k_x86_64`; 22/22 passed, 0 failures/errors/skipped.
- `git diff --check`: passed. Relative to `origin/main`: 117 files, 0 prohibited paths. Contract SHA-256 unchanged.
- Physical-device review passed for the no-service startup gate and original splash, five main-page checks, ordinary background return, camera/microphone prompts, recording controls, retained-video first frame/controls, in-place language switch, English notification chrome and bilingual removal of the clipped video footer. Evidence covers 9/41 pages at different depths and is not full-flow acceptance.

## Scope boundary

- No changes to business documents, Contract/OpenAPI, Backend, Web, database, deployment configuration, `tests/e2e`, or `docs/rebuild/STATUS.md`.
- This PR is UI foundation only. There is no current Backend; real login, invitation, upload, review, notification and recovery are not accepted by this PR.
- Maintenance remaining time, formal public-reason codes, detailed review stages, formal supplementary evidence, locked-batch resume and course-close continuation still require Contract/Backend production projection.
- FCM/system Push cleanup is a separate Android platform task and Release blocker. GitHub CI is a separate repository-governance task and must be enabled before the next large feature PR or Release.
- Privacy final text, Release APK and complete seven-state/accessibility evidence remain Release or follow-up blockers.
- `docs/rebuild/STATUS.md` is updated by the mainline aggregator; the exact suggested text is in the final handoff.

## Reviewer checklist

- [ ] The PR head is `[FINAL_COMMIT_SHA]`, and the validation evidence above is bound to that same commit.
- [ ] A refresh/network failure after a confirmed system mode never creates a false `MAINTENANCE` fact or pause promise.
- [ ] Student notifications do not disclose score, grade, ranking or points; legitimate failure/status notifications remain visible.
- [ ] 1,200-minute goal, actual/effective/countable duration, membership state and submission/acceptance wording match V8.1.
- [ ] Maintenance, six bilingual public reasons and detailed review stages are traceable in UI, while missing production projection remains clearly disclosed.
- [ ] Android and Web use equivalent business meaning, terminology, grouping, permissions and task flow without requiring pixel identity.
- [ ] Original system splash, startup Loading/Error/Retry, navigation/back, media controls and language switching remain usable.
- [ ] Local synthetic data is visibly identified and is not represented as real Backend success.
- [ ] No prohibited directory appears in Files changed; Contract SHA-256 is unchanged.
- [ ] Android Reviewer records the final decision; the project owner separately designates the student Web Reviewer and remaining owners.

## Not tested / not claimed

- Real Backend/Contract flows or production data correctness.
- All 41 pages across all seven states on a physical device.
- Complete TalkBack, font-scale, orientation and device compatibility coverage.
- Release APK, production signing/configuration, FCM cleanup, privacy approval or CI.
- Full student business acceptance.
