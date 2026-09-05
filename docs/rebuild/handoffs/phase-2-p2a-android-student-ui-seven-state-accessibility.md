# 原计划第 12 步交接：七态与无障碍源码核查

日期：2026-09-05。Phase 2 / Android 学生端。
**本轮核查与限定 UI 修正完成；整体七态覆盖 PARTIAL，设备人工验收 NOT_RUN。**

## 1. 本轮成果

- [41 页七态与无障碍源码核查报告](../phase-2/android/p2a-student-ui/seven-state-accessibility-audit.md)：41 个唯一 PAGE-STU 标识，逐项区分源码证据、局部支持与未关闭项。
- 修正 13 个 UI 源文件：返回路由、48dp 分段目标、可伸展底栏、安全区/键盘、维护滚动、错误播报、图标标签、运动类别选中语义、帮助搜索恢复，以及补充任务非 Open 状态禁用材料/备注。
- 将提前准备的人工验收材料恢复为原计划第 14 步，并标明历史 APK 不含第 12 步修改。
- 没有扩大为业务规则实现，也没有用样例伪造正式扫码、提交、受理、上传或审核结果。

## 2. 固定基线

| 对象 | 分支 / HEAD / 状态 |
|---|---|
| Android 实施 worktree | codex/phase2-android-student-ui / 49d992a1333294ea561923cfea0b7d25864a4d91；累计未提交修改保留 |
| start3/repos/new_need_version_sports | main / 49d992a1333294ea561923cfea0b7d25864a4d91；clean |
| Web Mac 离线目录 | codex/web-ui-local-preview / 74b616653cbae36670c8c9b284c240be7438d480；635 个默认 porcelain 状态项 |
| Week 9 Android | fix/android-contract-4.0.1-alignment-20260827 / 9506a8a491d091ff9be4936995b92184c007fc11；35 个状态项保留 |

Android 任务目录：`D:\DT\soprts\start3\worktrees\phase2-android-student-ui`。

聚合与 Web 目录 origin：`https://github.com/chchaiai/new_need_version_sports.git`。Week 9 origin：`https://github.com/chchaiai/BNBU-Sports-Android.git`。没有 fetch、pull、push 或远程写操作。

Web 离线目录 Git 读取仍报告 Mac `._pack-*.idx` 附属文件过小，分支/HEAD/状态仍返回上述信息；本轮没有删除或修复它。将其作为只读参考，不能据此声称完成仓库完整性检查。

Contract：`1.2.0-contract` / RC。OpenAPI SHA-256：
`667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`，与本轮开始一致。

## 3. 本轮写入清单与保护

通过本轮开始的 85 个已有差异文件 SHA 快照与结束清单比较，区分了本轮变化与前 0—11 步变化；不是把 git diff 相对 HEAD 的全部修改归为本轮。

源码范围（均在 `BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/`）：

1. core/designsystem/Components.kt
2. core/designsystem/BNBUErrorPanel.kt
3. feature/shell/AppRootScreen.kt
4. feature/checkin/ExerciseCheckInScreen.kt
5. feature/checkin/CheckInRecords.kt
6. feature/checkin/SwimmingDelayExplanationScreen.kt
7. feature/checkin/SupplementTaskScreen.kt
8. feature/courses/ScanJoinScreen.kt
9. feature/courses/EnterInviteCodeScreen.kt
10. feature/courses/CourseJoinConfirmScreen.kt
11. feature/help/HelpCenterScreen.kt
12. feature/login/EmailLoginScreen.kt（仅返回图标可访问名称）
13. feature/login/RecoveryRequestScreen.kt

文档范围：

1. docs/rebuild/phase-2/android/p2a-student-ui/seven-state-accessibility-audit.md（新增）
2. docs/rebuild/handoffs/phase-2-p2a-android-student-ui-seven-state-accessibility.md（本文件，新增）
3. docs/rebuild/phase-2/android/p2a-student-ui/manual-acceptance-guide.md
4. docs/rebuild/phase-2/android/p2a-student-ui/manual-acceptance-record.md
5. docs/rebuild/handoffs/phase-2-p2a-android-student-ui-manual-acceptance.md
6. docs/rebuild/handoffs/phase-2-p2a-android-student-ui-integration-audit.md（仅后续步骤编号更正）

未写 STATUS、业务正文、Contract、Backend、Web、数据库或部署配置；未写核心数据/网络/运动/状态/审核、会话 Gateway/Mapper/UploadCoordinator。未修改、清理、stash、reset、删除、回退或覆盖 Week 9 与其他历史目录。没有提交 Git。

## 4. 本轮验证

- `gradlew.bat :app:compileDebugKotlin --no-daemon --offline`：最后一次 BUILD SUCCESSFUL，34 秒，21 项任务（7 执行、14 up-to-date）。
- `git -c core.safecrlf=false diff --check`：退出码 0。
- 41 页台账：41 行、41 个唯一 PAGE-ID。
- 已复核分支、HEAD、origin、状态数量与 Contract SHA；未发生基线切换。
- Gradle 编译依赖生成 build/generated 下的 API 代码，不是修改 Contract 源文件。
- 没有完整单测/Lint/Debug APK 构建或设备 UI 自动测试；不挪用此前 388 单测作为本轮结果。
- 没有运行模拟器/真机，没有业务/API 验收。此前 APK 的 SHA 仅为第 11 步历史指纹。

## 5. 未关闭项与下一步

完整问题见审计报告 S12-UI-01 至 S12-EVIDENCE-01，包含：

- Phase 2 UI 仍需跟进：页面级异常态、可独立触发的评审场景、安全草稿、静态正文缺失态、共享配色和实际无障碍证据。
- 后续接口/领域阶段：未知提交结果恢复、服务器截止/权限/材料版本、锁定批次续传、旧 60 分钟清理规则、旧 8MB 媒体限制。
- 身份/安全负责人：验证码与验证流程状态恢复边界。
- 用户/Reviewer：第 14 步设备实测与具名签认。

**没有 Backend 不阻止继续 UI 设计，但不能把纯 UI 缺口全部移交 Backend 并宣称 Phase 2 已验收。**

停在第 12 步结束。等待用户开始原计划第 13 步，再做完整自动测试与本地构建；第 14 步仍由用户人工操作，第 15 步再准备交接和由用户手动提交/Push/PR。不要现在安装历史 APK。
