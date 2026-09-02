# Phase 1A Handoff：Android 旧 API 审计

> 日期：2026-08-31
>
> 完成状态：DONE
>
> Git 根目录：`C:\Users\23328\Desktop\new_version`
>
> 分支：`API-contract-Making`
>
> HEAD：`6a91d70ed433e85b0d8eb4433be40518cddad852`

## 本阶段范围

Phase 1A 只盘点 Android 网络边界与相关的测试、调试、Fake/Mock 入口，不迁移旧 API，不设计新 Endpoint，不修改 Contract，也不把旧 DTO 解释成新业务。

唯一 Android 写操作是按用户明确决定删除无实现、无引用的空文件：

- `BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/core/mock/MockStudentWorkspace.kt`

其余 Android 代码保持只读。

## 交付产物

- [Android 旧 API 审计清单](../inventories/android-legacy-api.md)
- [Rebuild 当前状态](../STATUS.md)
- [总业务流程 v7.14](../../business/00-overview.md)
- [学生端业务流程 v7.14](../../business/10-student-flow.md)

## 主要审计结论

- Android 没有 Retrofit，现有网络栈为手写 `OkHttp 4.12.0 + Gson 2.11.0 + V1ApiTransport`。
- Base URL 从 `BuildConfig.BNBU_API_BASE_URL` 注入，但客户端仍固定 `/api/v1` 旧边界；debug 默认指向本机旧 Backend。
- 静态调用图确认 55 个实际或条件可达的旧 HTTP method/path 目标。
- 手写旧边界包含 9 个 Request 类、40 个 Response 类和 18 处 `@SerializedName`，并与 OpenAPI 生成 DTO 并存。
- `ApiStudentRepository` 实际兼任 Repository 实现、旧 DTO 兼容层和 API Adapter；DTO/Transport 错误存在向 State、ViewModel/Controller 与 UI 泄漏。
- 未发现“网络失败后伪造 Mock 成功并写入正式业务”的生产分支；发现若干明确的 debug、测试和未正确门禁的开发入口。

## 已确认并回填的四项决定

1. **模拟扫码成功不进入正式产品。** 清单已从 `UNKNOWN` 改为 `DEV_ONLY`；当前实现仍在 `main` 且无 build gate，属于后续 Android 实现偏差，不代表已获准的产品能力。
2. **删除空 `MockStudentWorkspace.kt`。** 本轮已删除；不新增替代 Mock 成功实现。
3. **运动记录 `resubmission` 不属于真实业务。** 旧 route、payload 和无调用适配器后续删除，不进入新 Contract。
4. **版本策略检查失败采用受约束降级。** 单个辅助接口故障不能独自导致整个 App 不可用；已缓存的强制升级要求不能被清除、降级或绕过。

上述规则已写入业务权威文档。Android 审计表当前没有 `UNKNOWN` 项；Web `UNKNOWN` 继续等待 Phase 1B 审计后人工决定。

## 验证结果

| 验证 | 结果 | 说明 |
|---|---|---|
| `BNBU-ANDROID\gradlew.bat :app:compileDebugKotlin --console=plain` | PASS | `BUILD SUCCESSFUL in 5s`；21 个 actionable tasks，5 executed、16 up-to-date |
| Markdown/表格/链接定向检查 | PASS | 业务文档版本、四项决定、审计分类和 handoff 链接均已核对 |
| `git diff --check` | PASS | 未发现空白错误 |
| Android `UNKNOWN` 表项扫描 | PASS | 结果为 0 |

编译输出 Gradle 10 兼容性弃用警告，未阻断本次编译。

## 未执行验证

- Android 全量单元测试、lint、instrumentation test、模拟器/真机、Staging、Release：NOT EXECUTED；超出静态审计与本次空文件删除的比例验证范围。
- Web、Backend、数据库、真实 API、部署、E2E：NOT EXECUTED；不在 Phase 1A 范围。

## 业务与 Contract 变更

- 业务规则：**已修改**，仅写入用户明确确认的四项决定。
- Contract：**未修改**。
- 新 Endpoint：**未设计**。
- Mock 成功：**未新增**。

## Git 与交接边界

- 本阶段尚未 Commit、Push、Tag、Merge 或部署。
- 当前 HEAD 仍为 `6a91d70ed433e85b0d8eb4433be40518cddad852`。
- 下一阶段不得把本地文档完成视为新 Contract、Backend、Staging 或产品验收完成。

## 下一阶段前置条件

1. Phase 1B 开始前读取根与 Web 目录适用的 `AGENTS.md`、`docs/rebuild/STATUS.md` 和四份业务权威文档。
2. Web 代码保持只读，覆盖学生、教师、管理员三类界面及全部真实网络调用。
3. 同步扫描 Web 测试按钮、调试入口、Fake Success、Mock 触发器和开发专用操作，并按 `PRODUCT`、`DEV_ONLY`、`TEST_ONLY`、`UNKNOWN` 分类。
4. Web `UNKNOWN` 只记录，留给人工决定；不得从旧 Endpoint、DTO 或 Mock 推导新业务。
5. Android 的实现偏差和旧边界删除必须在后续独立 Android 任务中处理，不能在 Web 审计中跨目录修改。
