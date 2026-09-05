# PR 标题

`feat(android): align Phase 2 student UI with V8.1`

# PR 正文（复制到 GitHub）

## Summary

- 已将业务权威同步到 `main@8c9826822f35876f8d01480f8baf184027711dfe`（V8.1），并完成本轮 Android UI 复审修正，提交 Reviewer 重新审核。
- 覆盖五个主标签、分钟与状态语义、入班、运动取证、记录与原始耐力、一次补充、免测/认证、通知和账户支持页面。
- 保留 Android 平台的导航、返回、相机/麦克风和系统权限适配；不要求与 Web 像素级一致。
- 修复真机走查发现的录像按钮文字截断、已保留视频首次预览黑屏/控制器隐藏、语言切换长时间等待。

## Authority and traceability

- Business authority/base: `main@8c9826822f35876f8d01480f8baf184027711dfe` (V8.1)
- Original Android implementation base: `49d992a1333294ea561923cfea0b7d25864a4d91`
- Design: `P2A-UI-2026.09.04-draft1`
- Contract: `1.2.0-contract` / `RC`
- Contract SHA-256: `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`
- Final handoff: `docs/rebuild/handoffs/phase-2-p2a-android-student-ui-final-handoff.md`

## R10 validation after V8.1 review fixes

- `:app:testDebugUnitTest`: 437/437 passed across 78 suites; 0 failures/errors/skipped.
- `:app:lintDebug`: 0 errors, 5 existing warnings, 0 informational issues.
- `:app:assembleDebug`: passed; Debug APK SHA-256 `a2c6a49a5e54830cec3b123ee3ebe03a7ceb4ea28dc3b1291687f5f20c97ecdb`.
- `:app:assembleDebugAndroidTest`: passed; 19 instrumentation test sources compiled, including 14 CoreJourney tests. They were not device-run.
- R11 physical-device review of the R10 APK confirmed cold-start handoff, visible Loading, no-service Error, Retry, Debug local UI review, first camera/microphone permission prompts, five main-tab NORMAL checks, ordinary background return, recording controls, retained-video preview and in-place language switching on the current phone configuration.

## Scope boundary

- No changes to business documents, Contract/OpenAPI, Backend, Web, database, deployment configuration, `tests/e2e`, or `docs/rebuild/STATUS.md`.
- This is a UI delivery, not Backend integration or full business acceptance.
- There is currently no new Backend. Old API references and Contract/business mismatches are recorded in the final handoff and intentionally deferred.
- R9 provides explicit startup Loading, Error and Retry UI instead of extending the Android system Splash through the system-mode request. An unavailable server does not silently become NORMAL. Debug alone can enter clearly labelled local synthetic UI review after an error; Staging/Release cannot. The current no-service UI path passed R11 on one phone; the real mode, production address and server-authoritative success path remain open.
- R8 已将运行时评审数据和设计 Preview 隔离到 Debug source set；Release APK 产物检查仍需正式 HTTPS/Firebase/签名环境。FCM versus in-app-only notification policy、privacy-policy final text 和 full seven-state/accessibility evidence 仍保持开放。

## Reviewer checklist

- [ ] Student UI does not disclose final score, converted endurance score, grade, or ranking.
- [ ] 1,200-minute goal, actual/effective/countable duration, membership status, submission/acceptance wording and one-supplement flow match V8.1.
- [ ] Maintenance shows paused supplementary-evidence timing and server-confirmed remaining time without locally restoring NORMAL.
- [ ] Review states distinguish pending AI, pending teacher, awaiting supplementary evidence and technical processing.
- [ ] Six bilingual public reasons, action applicability, original-language public note and the separate system overdue reason are traceable to V8.1.
- [ ] Valid English failure/status notifications are not silently dropped by keyword filtering.
- [ ] Android and Web use equivalent business meaning, state semantics, terminology, data grouping, permissions and task flow.
- [ ] Platform-specific navigation, back behavior, camera/media controls and language switch remain usable.
- [ ] Local demonstration data is visibly identified and is not represented as a real Backend success.
- [ ] No prohibited directory appears in Files changed; Contract SHA-256 is unchanged.
- [ ] Android Reviewer and Web student UI owner record cross-platform review conclusions.

## Not tested / not claimed

- Real login, invitation/join, server permissions, upload, review, notification, deletion or interruption recovery.
- All 41 pages across all seven states on a device.
- Connected instrumentation tests and Release APK behavior.
- Full business acceptance.
