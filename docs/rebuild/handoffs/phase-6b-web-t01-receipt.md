# Phase 6B Web T01 接收回执

## 接收登记

| 项 | 值 |
|---|---|
| 接收人 | 甘洛夷 |
| 接收日期 | 2026-09-08 |
| 角色 | Phase 6B Web（学生端 + Portal） |
| 工作分支 | `codex/phase6b-web` |
| 独立工作区 | `/Users/louis/Projects/new_need_version_sports-phase6b`（`git worktree`，保留原目录 `/Users/louis/Projects/new_need_version_sports` 不动） |

## 固定输入身份（已实测）

| 项 | 登记值 | 工作区实测 |
|---|---|---|
| 入场基线 Commit | `2ba9355e38373b8d2350eb8efe4071048337c320` | `2ba9355`（Merge PR #10） |
| Contract Version | `1.3.0-contract` | `contract-metadata.json` 一致 |
| Contract Status | `RC` | 一致 |
| OpenAPI 路径 | `contracts/openapi.yaml` | 存在 |
| OpenAPI SHA-256 | `5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed` | `shasum -a 256` 一致 |
| 公开路径 | `/api/v1` | 一致 |
| 追溯来源 Commit | `f702c590ff10b11f7de038332868c988ab4cec11` | 仅追溯，不作工作输入 |
| 工作区 dirty state | — | **clean**（新建 worktree） |

## 工具版本（Web 工作区实测）

| 工具 | 版本 | 说明 |
|---|---|---|
| Node.js | v24.14.0 | 本地；Phase5 参考为 24.14.1 |
| npm | 11.9.0 | |
| openapi-typescript | 7.13.0 | `portal-teacher-admin/package-lock.json` |
| TypeScript | 5.9.3 | 同上 |

## 分工与 Reviewer（T01 确认）

| 范围 | Owner | Reviewer |
|---|---|---|
| 6B Web 总体 | 甘洛夷 | 用户（6C 汇总、协议身份门禁） |
| T01 输入加载回执 | 甘洛夷 | 甘洛夷（实测）+ 用户（基线/SHA 授权） |
| T02 绑定升级与类型生成 | 甘洛夷 | 甘洛夷（执行/自检）+ 用户（Contract defect / CR） |
| Contract defect | — | 用户（CR → 新 Version/SHA） |

## 可写路径

**允许修改：**

- `BNBU-Sports-Web-new/**`（学生端 `frontend/student/`、Portal `portal-teacher-admin/`）
- `docs/rebuild/STATUS.md`
- `docs/rebuild/handoffs/phase-6b-*.md`

**禁止修改：**

- `contracts/**`（含 `openapi.yaml`、生成脚本、fixtures）
- `docs/business/**`
- `BNBU-ANDROID/**`
- Backend / DB / infra
- 手改 `*.generated.ts` DTO

## T01 结论

- Phase6 入场资料已从固定基线 `2ba9355` 加载；Version/Status/SHA 与工作区字节一致。
- Web 现有验证轨仍钉在 **1.2.0-contract**（`verify-phase5b-contract.mjs` 与 fixture 常量）；`npm run phase5b:contract:check` **预期失败**，属待迁移状态，不是基线错误。
- Phase5 通过 **不代替** Web 本轮验证。

## 首个后续小任务（T02）

将学生端与 Portal 的 Contract 绑定从 `1.2.0-contract` 升级到 `1.3.0-contract / RC / 5c87eeb9…`，确定性重生成 `phase5b-contract.generated.ts`（两端），更新绑定常量与校验脚本，记录生成命令与结果；Mapper/Mock/构建修复在 T02 之后按 Finding 分批处理。

## 当前阻塞

| ID | 状态 | 说明 |
|---|---|---|
| WEB-6B-001 | OPEN | Web 绑定仍指向 1.2.0；T02 目标项 |
| — | — | 后端未构建不单独阻断 Phase6 |
| — | — | 正式网络迁移仍归 Phase8 |
