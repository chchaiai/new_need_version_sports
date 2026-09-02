# Phase 2 Web 上线树清理 handoff

> 日期：2026-08-31
>
> 分支：`API-contract-Making`
>
> 起始 HEAD：`7bcf8da772f2538629103ac44c0084612cf6afb6`
>
> 状态：DONE（本轮授权范围）

## 目标与边界

本轮按用户确认的删除建议，清理 Web 当前上线树中确定无关的历史文件、旧数据库材料、联调 helper、无运行引用源文件、D1/Drizzle starter 和学生 Test Tools。允许同步修改必要的 README、package/lock、测试及容器复制白名单。

以下内容明确不在删除范围：

- Demo 与正式版共用的学生、教师和管理员 UI；
- Portal development-only admin/teacher/roster Mock adapter；
- Portal OpenAPI snapshot、generated types 与现行 `/api/v1` Client；
- `.github/workflows/pages.yml`、Cloudflare/Sites 和 Docker 发布链路的二选一决定；
- 当前 Backend、Android、Contract 和四份业务权威文档；
- 未跟踪的 `node_modules`、`dist`、`.wrangler` 与本地日志缓存。

## 删除结果

共删除 57 个跟踪文件，主要分组如下：

1. `BNBU-Sports-Web-new/database/`：旧 MySQL schema、migration、seed 与执行脚本；
2. `BNBU-Sports-Web-new/handoff/`：旧 Backend patch、联调说明、环境 setup 和造测试记录脚本；
3. Web 历史材料：旧产品文档、开发/交付说明、计划/spec、工作日志、问题日志、验收截图、docx、宝塔 PDF 和冲突业务口径 `业务流程审2.md`；
4. 学生旧测试边界：`js/test-tools.js`、test capability/advance-duration Client、`MOCK_INVITES`、只供 smoke 使用的免测预览 SVG；
5. Portal 无运行引用源文件：ChatGPT auth starter、退役 ticket workspace、空 roster engine、未使用 roster service facade；
6. Portal D1/Drizzle starter：`db/`、`examples/d1/`、drizzle config/journal 及对应 package dependencies；
7. Portal 旧审计和建议性伪 Contract 文档。

历史文件均可从 Git 历史恢复。本轮没有执行 Git history rewrite。

## 配套修改

- Root `package.json` 删除失效 `seed`，同时移除无调用的 root `esbuild`、`playwright` 并更新 lock；
- Portal 删除 `db:generate`、`drizzle-orm`、`drizzle-kit`，更新 lock，并移除 Sites 构建中的 migration copy 和 Worker D1 binding；
- 学生运行时配置从 `APP_ENV + TEST_TOOLS_ENABLED` 收敛为只公开 allowlist 后的 `APP_ENV`；
- 学生 app 不再读取 test capability 或保存 `testToolCapabilities`；
- 学生 smoke 删除旧 Mock 邀请、test-tools 与 internal advance-duration 覆盖，测试 fixture 不再依赖产品静态 SVG；
- Portal 源码检查型测试删除对已移除 dead files 的读取；
- `Dockerfile.local` 的学生 target 使用明确复制白名单，只装入 preview server 和 `student/index.html`、`assets/`、`css/`、`js/`；
- Web README 改指当前 `docs/business/` 和 `docs/rebuild/` 权威输入；Phase 1B inventory 回填本轮删除状态。

## 验证证据

| 验证 | 结果 |
|---|---|
| Web `npm run test:web` | PASS |
| Web `npm run test:student` | PASS，79/79 |
| Portal `npm run typecheck` | PASS |
| Portal `npm run lint` | PASS，0 error；5 条既有 warning |
| Portal `npm test` | PASS，production build + 89/89 |
| 全树已删路径/入口扫描 | PASS；当前 Web 代码无悬空引用 |
| `git diff --check` | PASS |
| Dockerfile build check | NOT EXECUTED；Docker Desktop Linux daemon 未运行 |

## 风险与后续决定

1. 旧 `database/run-seed.cjs` 曾包含硬编码远程数据库凭据。文件删除不使凭据失效，必须在数据库侧轮换；Git 历史重写需另行明确授权。
2. GitHub Pages workflow 仍上传整个 `frontend/`，与三角色正式发布目标不一致。正式部署目标未决定，因此本轮保留该 workflow 与 Cloudflare/Docker 两条链路。
3. Portal Demo 数据仍可能进入 production bundle；为保持 Demo/正式 UI 一致，本轮没有删除共用页面或 adapter。后续应通过独立 Demo/QA build、动态加载或 bundler boundary 排除正式包中的 fixture，而不是复制 UI。
4. 当前真实业务仍耦合旧 `/api/v1` DTO/Client；生成快照仍有已删除 operation 声明。必须等待新 Contract 后迁移，不得盲删。
5. 自动化通过不等于真实 Backend、数据库、浏览器、Staging 或 Production 验收。

## Git 与发布状态

- 本 handoff 只授权本地精确路径存档；
- 不执行 push、merge、tag、branch switch、部署或发布；
- 最终 commit 与工作区状态在完成本地存档后回填到任务结果。
