# 给领导的发送模板

Push 并更新 PR 标题/正文后使用。发送前把 `[FINAL_COMMIT_SHA]` 替换为 Push 输出的新远端 HEAD；PR 链接固定为 `https://github.com/chchaiai/new_need_version_sports/pull/4`。

## 消息一：请审核什么、具体交接文档在哪里

```text
领导您好，PR #4 已按第二轮复审要求更新，定位为 V8.1 Android UI foundation / PARTIAL：
https://github.com/chchaiai/new_need_version_sports/pull/4

新的远端 HEAD Commit：`[FINAL_COMMIT_SHA]`

请以该 Commit 开始最终复审，首要交接文档为：
docs/rebuild/handoffs/phase-2-p2a-android-student-ui-final-handoff.md

请重点核对两项 P1：
1. 系统模式首次确认后，普通轮询失败保留最后确认模式并显示中性连接阻断，不再伪造 MAINTENANCE 或补证暂停承诺；只有服务器明确返回维护才进入维护语义。
2. 英文通知拦截 Score、Grade、Ranking 和数字 points 等学生结果泄漏，同时保留 Evidence upload failed、Evidence passed initial checks、Evidence level unavailable 等合法流程通知。

同一最终 Commit 的证据为：JVM 447/447（78 suites）；Lint 0 error、5 existing warnings；强制重建 Debug APK SHA-256 `216561a78dc570dbb400d9789ff83b1184f9614cf3c1341ef753d30400b56ebc`、AndroidTest APK SHA-256 `ced6c6980653c66d4b030af0dda6ea72abe0428e4564dedf29f38aca6ce31a0c`；专用 AVD BNBU_P2_UI_Review / API 37 实际执行 instrumentation 22/22 通过；git diff --check 通过；Contract SHA-256 未变化。当前真机配置下，源码等同的 R2-05 候选已确认原系统启动页/无服务启动门禁、五个主页面指定检查、语言切换、录像/视频预览、英文通知固定文案和视频底部说明移除；最终强制重建包由 AVD 验证，未伪称再次安装到真机。

PR Files changed 未由 Android 修改业务正文、Contract/OpenAPI、Backend、Web、infra、tests/e2e 或根 STATUS。请按 PARTIAL 边界审核，并由 Android Reviewer记录最终结论；学生 Web Reviewer 仍由负责人正式指定。
```

## 消息二：哪些仍不是当前 UI PR 能关闭的问题

```text
领导您好，再确认 PR #4 的边界：本轮完成 Android UI foundation、两个 Android 客户端 P1、对应 JVM/instrumentation 测试和指定真机 UI 回归，不代表学生端完整业务流程、Backend、Contract 或 Release 验收通过。

当前没有可用于正式联调的新 Backend。维护剩余时间、正式原因代码、动作来源、细分审核阶段、正式补证、课程关闭后的既有业务续办、锁定批次续传，以及真实登录/入班/上传/审核/通知/恢复，仍需 Contract Owner、Backend Owner 和后续 Android 联调阶段提供生产事实；Android 未自行修改 Contract 或用本地样例冒充接口成功。

按已确认分工：FCM/系统 Push 清理另建 Android 平台任务并作为 Release 阻塞；GitHub CI 另建仓库治理任务，在下一次大型功能 PR 或 Release 前启用；根 docs/rebuild/STATUS.md 由主线汇总人更新，最终 handoff 已提供可直接采用的准确文字。隐私定稿、Release APK、完整七态/无障碍和其他设备覆盖继续作为后续或发布门禁。

因此本次请求的是 V8.1 Android UI foundation / PARTIAL 的代码复审与合并判断，不是完整产品上线验收。
```
