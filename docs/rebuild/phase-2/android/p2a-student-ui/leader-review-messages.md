# 给领导的发送模板

本模板只在 R3—R12 复审修正、重新测试和交接完成后发送。发送前把 `[PR 链接]`、`[复审最终 Commit]` 和测试结果替换为实际值，不能继续把初版实施 Commit 当成最终复审 Commit。

## 消息一：请审核什么、具体交接文档在哪里

领导您好，Phase 2 Android 学生端 UI 已按 V8.1 复审意见修正并更新 PR：`[PR 链接]`，复审最终 Commit：`[复审最终 Commit]`。审核请先看 `docs/rebuild/handoffs/phase-2-p2a-android-student-ui-final-handoff.md`，其中集中列出 V8.1 固定 Commit、页面范围、Web 对齐依据、复审意见处理、自动测试、真机证据、未完成项和 Reviewer 清单。请重点核对：维护期间补证计时暂停与剩余时间；六类中英公开原因、动作适用范围、原文公开说明和系统逾期原因；待 AI、待教师、待补证和技术处理中等审核阶段；合法英文失败通知不被误删；启动错误状态、七态、无障碍及演示数据边界。R10 本地验证为 JVM 437/437、Lint 0 error；AndroidTest APK 只编译未在设备运行。R11 在当前真机上确认启动无服务 UI、五个主页面指定正常态、普通后台返回及三项现场缺陷通过，但没有外推为 41 页七状态或完整业务验收。也请检查 Files changed 未由 Android 修改 Contract、Backend、业务正文或 STATUS，并安排 Android Reviewer 与学生 Web 负责人完成跨端一致性复核。

## 消息二：本轮只改 UI，后端/业务问题和启动问题如何处理

领导您好，再说明本 PR 的验收边界：本轮只完成 Android Compose UI、UI 展示模型和对应测试，不修改 Contract/OpenAPI、Backend、数据库或部署。V8.1 的维护暂停、六类原因和审核阶段可在 UI 中表达，但真实剩余时间、原因代码、动作来源、生产状态、课程关闭后的既有业务续办、锁定批次续传和正式通知仍须 Contract/Backend 提供。当前没有 Backend，且 Debug 默认 `10.0.2.2:13000` 对未连接开发机的真机不可达；Android 已把启动等待改成明确的 Loading/Error/Retry，并由当前真机确认无服务 UI 路径正常，但真实系统模式、生产地址和服务成功路径仍待联调。FCM/系统通知与 V8.1 站内通知规则的冲突、Manifest/Gradle/core-push 清理、正式 Release 产物、隐私政策定稿和 CI 属于非 Compose UI 或治理任务，需另行授权/指定负责人；R8 已完成本地评审数据与 Preview 的 Debug source-set 隔离。最终只报告实际运行的本地测试与设备证据，不把编译、本地样例或少量真机页面外推为完整业务验收。
