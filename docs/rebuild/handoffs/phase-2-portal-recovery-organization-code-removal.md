# Phase 2 Portal 找回密码组织代码移除 handoff

> 日期：2026-08-31
>
> 分支：`API-contract-Making`
>
> 起始 HEAD：`0f4d1272886e5cbb355eedbb3daa1ee4595cdd5d`
>
> 状态：DONE（本轮授权范围）

## 目标与边界

按用户在 Portal 找回密码页的明确批注，删除“学校组织代码”表单项。本轮只修改 `portal-teacher-admin/`、`docs/rebuild/STATUS.md` 和本 handoff；Backend、Contract、Android、学生 Web、四份 `docs/business/` 权威文档均只读。

权威业务文档的现有规则是：

- 教师忘记密码时，通过已验证学校邮箱完成本人验证并设置新密码；
- 总管理员和分管理员同样通过已验证学校邮箱完成验证；
- 业务流程没有要求用户手工输入组织代码。

## 实施结果

1. 从公开找回密码表单删除组织代码的 label、input、必填标记、格式校验、字段错误映射、change handler 和中英文文案。
2. 账号绑定邮箱改为表单首个可编辑项，打开找回页后自动获得焦点。
3. `requestAccountRecovery()` 在 API Client 边界注入部署组织上下文：使用 `NEXT_PUBLIC_BNBU_ORGANIZATION_CODE`，当前 BNBU 部署未显式设置时默认为 `BNBU`。该值不是密钥。
4. 已登录教师/管理员在工作台内改密时，仍优先传入 `/organizations/current` 返回的 `organizationCode`，没有退回到页面手工输入或修改已登录组织边界。
5. Contract 仍要求 recovery request 携带 `organizationCode`；本轮只将它从页面 Contract DTO 耦合收口到 API Client，未修改 Contract 或 Backend。

## 验证证据

| 验证 | 真实结果 |
|---|---|
| `npm run typecheck` | PASS；Contract snapshot verify、generated `--check`、两个 TypeScript project 通过 |
| `npm run lint` | PASS；0 error，5 条 `admin-service.ts` 既有 unused warning |
| 定向 API/UI 测试 | PASS；31/31 |
| `npm run build` | PASS；vinext production build 完成；保留 chunk > 500 kB 和 route classification 警告 |
| `npm test` | PASS；production build + 90/90 tests |
| 中文浏览器 | PASS；组织代码 input/text 均为 0，邮箱自动获得焦点，布局正常 |
| 英文浏览器 | PASS；`Organization code` input/text 均为 0，新说明文案正确 |
| Browser console | PASS；warning/error 为 0 |
| `git diff --check` | PASS |

## 未执行的产品验证

- 未提交真实邮箱或验证码，因此未执行真实邮件发送、Backend recovery 创建或最终改密；
- 未执行数据库、Staging、Production、部署或发布验收；
- 本地浏览器与 Mock/demo 证据不代表真实 Backend 或产品发布通过。

## 现状与后续

- 业务规则：未修改；
- Contract：未修改；
- 旧 API 引用：仍存在，`/api/v1/auth/account-recovery-requests` 及其 `organizationCode` DTO 仍是当前传输依赖；
- Mock/Fake/TODO/空接口：本轮未新增；
- 若将来部署到非 BNBU 组织，必须在构建时显式设置 `NEXT_PUBLIC_BNBU_ORGANIZATION_CODE`，不得恢复用户手工输入。

## Git 与发布状态

- 本轮只执行精确路径本地 Git 存档；
- 不执行 push、merge、tag、branch switch、部署或发布；
- 最终 commit 与工作区状态由任务结果报告。
