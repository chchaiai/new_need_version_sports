# Phase 2 Web 已决策边界清理 Handoff

## 状态

- 完成状态：DONE
- 日期：2026-08-31
- Git 根目录：`C:\Users\23328\Desktop\new_version`
- 分支：`API-contract-Making`
- 起始 HEAD：`b7b051d2a758788ddb7de927ff07e79f1f825686`

## 授权与边界

本轮获准修改：

- `BNBU-Sports-Web-new/`；
- `docs/rebuild/inventories/web-legacy-api.md`；
- `docs/rebuild/STATUS.md`；
- `docs/rebuild/handoffs/phase-2-web-boundary-cleanup.md`。

本轮保持只读：`BNBU-Sports-Backend/`、Android、`contracts/`、`docs/business/`、infra 和其他模块。删除的 Backend 仅为 Web 工作区内嵌旧实现，不是当前真实 Backend。

## 已完成处置

1. 删除学生无门禁免登录 review、synthetic workspace、review banner 以及运动、规则试算、申请、邮箱、注销、帮助/反馈、通知等关联 Fake Success。
2. 删除 Web real/local “增加 60 分钟”，以及 exercise record `resubmissions` / `attempt-context` 的页面、Client、DTO sidecar、测试与运行文案。
3. 删除 `joinConfirm` correction-request 非 real 写成功、启动 `/dev/demo-session` 探测、demo 登录 Client 与 preview route。
4. 将学生 `?sysmode=normal|maintenance|planned` 限制为 `APP_ENV=qa`；production、local、test、staging 不解析 override；QA 不启用 test-tools。
5. 删除无 UI 调用者的 admin demo service，及已决策的 admin course、旧 score-rule 审批、teacher/staff self account-deletion、重复/无调用 Client。
6. 管理员 demo 与 real 统一使用 `EndurancePanel`；real 写链因 Contract 缺失继续返回 `BACKEND_REQUIRED`，没有回退 Mock success。
7. 删除 Web root 的旧 Backend/Mock/demo setup/test scripts、Web 内嵌 `backend/`、setup helper、quality smoke 与 handoff patch；历史只由 Git 保存。

## 验证证据

| 验证 | 结果 |
|---|---|
| Web `npm run test:web` | PASS，退出码 0 |
| Web `npm run test:student` | PASS，81/81 checks，退出码 0 |
| Portal `npm run typecheck` | PASS，snapshot verify、generated check、TypeScript 均通过 |
| Portal `npm test` | PASS，production build + 89/89 tests；只有 chunk size 与动态 route classification 警告 |

未执行浏览器人工回归、真实 Backend/数据库、Staging、Production、部署与跨端 E2E；自动化结果不代表这些边界已验收。

## 保留风险与下一步

- Portal frozen OpenAPI snapshot/generated types 仍声明 `add-sixty-minutes`、`resubmissions`、`attempt-context`、旧 score-rule 等 operation；这是 generated-only Contract 耦合，不是 Web 实际请求。清理它们必须走独立 Contract 版本任务。
- Web 其余真实 `/api/v1` 请求与 raw/generated DTO 耦合仍存在，完整清单见 `docs/rebuild/inventories/web-legacy-api.md`。
- 管理员耐力规则、学期、系统模式、帮助、反馈、账户等正式写能力仍缺 Contract/Backend 链；demo localStorage 成功不能视为实现。
- Web/Android 免测 upload route、submitted 默认有效后的投影时序仍需新 Contract 决策。

## Phase 结束声明

- 是否修改业务规则：否；
- 是否修改 Contract：否；
- 是否存在旧 API 引用：是，剩余实际调用与 generated-only 声明已分开登记；
- 是否存在 Mock、TODO、空接口：Portal development-only Mock 与测试 fixture 仍存在；未新增 TODO/空成功接口；正式管理员规则写入明确 fail closed；
- 下一阶段前置条件：先完成上述 Contract 决策，再迁移剩余真实请求与 DTO 边界。
