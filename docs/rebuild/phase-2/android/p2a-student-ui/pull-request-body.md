# PR 标题

`feat(android): align Phase 2 student UI with v8.0`

# PR 正文（复制到 GitHub）

## Summary

- 按 v8.0 四份业务正文和已评审的学生 Web 交付，完成 Phase 2 Android 学生端 Compose UI 对齐。
- 覆盖五个主标签、分钟与状态语义、入班、运动取证、记录与原始耐力、一次补充、免测/认证、通知和账户支持页面。
- 保留 Android 平台的导航、返回、相机/麦克风和系统权限适配；不要求与 Web 像素级一致。
- 修复真机走查发现的录像按钮文字截断、已保留视频首次预览黑屏/控制器隐藏、语言切换长时间等待。

## Authority and traceability

- Base: `main@49d992a1333294ea561923cfea0b7d25864a4d91`
- Design: `P2A-UI-2026.09.04-draft1`
- Contract: `1.2.0-contract` / `RC`
- Contract SHA-256: `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`
- Final handoff: `docs/rebuild/handoffs/phase-2-p2a-android-student-ui-final-handoff.md`

## Validation

- `:app:testDebugUnitTest`: 408/408 passed; 0 failures/errors/skipped.
- `:app:lintDebug`: 0 errors, 5 existing warnings.
- `:app:assembleDebug`: passed.
- `:app:assembleDebugAndroidTest`: passed; AndroidTest APK compiled only, not device-run.
- Physical-device review: the three UI defects above were confirmed fixed by the user on the current candidate.
- Debug APK SHA-256: `edfd9b1c580aac1d66fc50443c676c68a3badac68534acdf78810da787688aa1`.

## Scope boundary

- No changes to business documents, Contract/OpenAPI, Backend, Web, database, deployment configuration, `tests/e2e`, or `docs/rebuild/STATUS.md`.
- This is a UI delivery, not Backend integration or full business acceptance.
- There is currently no new Backend. Old API references and Contract/business mismatches are recorded in the final handoff and intentionally deferred.
- The cold-start Logo/white/black delay is also deferred: the Debug app checks the unavailable system-mode endpoint at `10.0.2.2:13000`, which is not a reachable Backend address on a physical phone. Re-test the startup gate during Backend integration.
- FCM versus in-app-only notification policy, privacy-policy final text, Release sample isolation, and full seven-state/accessibility evidence remain open.

## Reviewer checklist

- [ ] Student UI does not disclose final score, converted endurance score, grade, or ranking.
- [ ] 1,200-minute goal, actual/effective/countable duration, membership status, submission/acceptance wording and one-supplement flow match v8.0.
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
