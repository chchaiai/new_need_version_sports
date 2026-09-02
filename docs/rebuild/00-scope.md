# Phase 0B：基线与重写范围锁定

> 记录日期：2026-08-31（Asia/Shanghai）
>
> 本文件记录重写开始前的事实基线和责任边界，不代表已经开始重写。

## Git 基线

| 项目 | 基线结果 |
|---|---|
| Git 根目录 | `C:\Users\23328\Desktop\new_version` |
| 当前分支 | `API-contract-Making` |
| HEAD | `366ce4dabe3897276fa948ed012048e357a9137f` |
| 开始前工作树 | CLEAN，`git status --short --branch` 仅输出 `## API-contract-Making` |
| 基线构建后工作树 | CLEAN，构建未产生未提交文件 |
| 根 `.git` | 存在：`C:\Users\23328\Desktop\new_version\.git` |
| 嵌套 `.git` | 不存在；递归检查只发现根 `.git` |
| Git submodule | 无；`git submodule status` 无输出并返回 0 |

`git worktree list --porcelain` 显示此 Git 仓库还关联了根目录之外的其他 worktree；它们不属于本目录内的嵌套 `.git`，Phase 0B 未修改、清理或切换这些 worktree。

Phase 0B 未创建 Git Tag、未创建或切换分支、未 Commit、未 Push。

## 构建基线

### Android

**Android baseline：PASS**

- 命令：在 `BNBU-ANDROID/` 执行 `.\gradlew.bat assembleDebug --console=plain`；
- 结果：退出码 0，`BUILD SUCCESSFUL in 3s`，43 个 task 中 5 个执行、38 个 up-to-date；
- 环境：launcher JVM 为 Java 24；仓库 Gradle wrapper 报告 Gradle 9.3.0，daemon JVM criteria 为 `Compatible with Java 25`；
- 产物：`BNBU-ANDROID/app/build/outputs/apk/debug/app-debug.apk`；
- 产物大小：26,112,665 bytes；
- SHA-256：`17D614417D0AD0C1877ADCC8B5B20E111F2030185E210A4C69BADE144E1C981C`；
- 已知警告：当前构建使用了将在 Gradle 10 中不兼容的弃用特性。

本结论只证明当前 checkout 的 Debug APK 可以在本机完成组装，不证明单元测试、instrumentation test、真机/模拟器行为、Staging、Release、签名、Firebase 或真实 Backend 可用。

### Web

Web 当前包含两类构建入口，必须分开记录：

| Web 范围 | 检查 | 状态 | 真实结果 |
|---|---|---|---|
| 学生端 `frontend/student/` | typecheck | BLOCKED | `package.json` 只声明 `type: module`，没有 `typecheck` script；仓库根 `package.json` 也没有学生端 typecheck 入口 |
| 学生端 `frontend/student/` | build | BLOCKED | 没有学生端 `build` script；本阶段不新增工具链 |
| 教师/管理员共享 Portal `portal-teacher-admin/` | `npm run typecheck` | PASS | 退出码 0；Contract snapshot 校验、生成结果检查和两个 TypeScript 配置的 `tsc --noEmit` 全部通过 |
| 教师/管理员共享 Portal `portal-teacher-admin/` | `npm run build` | PASS | 退出码 0；`vinext build` 完成五个阶段并输出 `Build complete` |

Portal 构建存在两项非阻断警告：Node `punycode` 弃用警告，以及部分压缩 chunk 超过 500 kB。Phase 0B 只记录，不修复。

因此，**Web baseline：PARTIAL**。教师/管理员 Portal 可以 typecheck/build；学生端没有仓库定义的 typecheck/build 入口，当前无法用等价命令判定。

## 重写范围锁定

### 保留

- Android UI；
- Web UI；
- 已确认的业务流程，唯一权威来源为：
  - [总业务流程](../business/00-overview.md)
  - [学生端业务流程](../business/10-student-flow.md)
  - [教师端业务流程](../business/20-teacher-flow.md)
  - [管理员端业务流程](../business/30-admin-flow.md)

“保留 UI”不表示保留当前网络调用、Contract DTO、Mock 数据或客户端业务推断；这些内容必须按下述重写范围重新建立边界。“已确认的业务流程”只包括四份权威文档已经明确的规则，未明确内容仍须停止并等待业务决定。

### 重新设计

- Backend；
- 数据库；
- API Contract；
- 客户端网络边界。

### 不需要

- 兼容旧发布客户端；
- 迁移旧生产数据；
- 长期维持旧 API。

当前 Android 和 Web 仍存在 `/api/v1`、OpenAPI snapshot、生成代码、API client 和 Mock 等既有实现。它们是后续重写时需要清点和替换的旧边界，不是新设计的权威输入；Phase 0B 不删除或修改它们。

## 后续 Phase 责任目录

后续每个 Phase 开始时必须从下表明确声明允许修改的责任目录。默认一个实现 Phase 只选择一个实现责任目录；`docs/rebuild/STATUS.md` 和 `docs/rebuild/handoffs/` 作为阶段治理输出可以同时更新，但不自动授权修改其他实现目录。

| 责任范围 | 责任目录 | 边界 |
|---|---|---|
| 业务规则决定 | `docs/business/` | 只由明确业务决定更新；客户端、Contract 和 Backend 不得自行补充规则 |
| 跨系统架构说明 | `docs/architecture/` | 记录已批准架构，不代替实现目录授权 |
| API Contract | `contracts/` | Contract 版本、Schema、DTO 和生成输入；Contract 不足时先在此处理 Change Request |
| Backend 与数据库 | `BNBU-Sports-Backend/` | 新 Backend、数据库 schema/migration 和服务端实现；不得顺带修改客户端 |
| Android | `BNBU-ANDROID/` | 保留 UI，按新 Contract 重建 Android 网络边界；不得决定业务规则或修改 Contract |
| Web | `BNBU-Sports-Web-new/` | 保留学生、教师和管理员 UI，按新 Contract 重建 Web 网络边界；Portal 子目录还必须遵守其 `AGENTS.md` |
| 基础设施 | `infra/` | 本地/部署基础设施；不得以部署配置反向决定业务或 Contract |
| 跨端 E2E | `tests/e2e/` | 只消费已完成的客户端、Backend 和 Contract，不在测试中补写业务规则 |
| 重建治理 | `docs/rebuild/` | Scope、Status、inventory、Change Request 和 handoff；不承载产品实现 |

如果某一 Phase 必须修改表中另一个责任目录，必须停止当前实现，说明跨目录原因，并新开对应模块任务。Contract 变更和下游客户端加载必须拆开执行，不能在客户端 Phase 内直接改 Contract。

## Phase 0B 明确不做

- 不修复 Android 或 Web 问题；
- 不设计或实现新 Backend、数据库、Contract 或客户端网络层；
- 不修改四份业务流程；
- 不删除旧 API、Mock、TODO 或空接口；
- 不执行部署、真实 Backend、数据库、端到端、设备或发布验收；
- 不创建 Git Tag、分支或 Commit。
