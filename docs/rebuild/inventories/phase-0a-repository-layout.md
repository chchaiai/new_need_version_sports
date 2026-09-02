# Phase 0A 仓库目录清单

## 业务文档迁移

| 原文件 | 新文件 | 迁移方式 |
|---|---|---|
| 总业务流程 | [docs/business/00-overview.md](../../business/00-overview.md) | `git mv` |
| 学生端业务流程 | [docs/business/10-student-flow.md](../../business/10-student-flow.md) | `git mv` |
| 教师端业务流程 | [docs/business/20-teacher-flow.md](../../business/20-teacher-flow.md) | `git mv` |
| 管理员端业务流程 | [docs/business/30-admin-flow.md](../../business/30-admin-flow.md) | `git mv` |

四次迁移均由 Git 识别为 100% rename，增删行数均为 0。

## 文档治理目录

- `docs/business/`
- `docs/architecture/`
- `docs/rebuild/`
- `docs/runbooks/`
- `docs/history/`
- `docs/reference/`

## 后续实现占位目录

- `contracts/`
- `BNBU-Sports-Backend/`
- `infra/`
- `tests/e2e/`

上述四个后续实现目录在 Phase 0A 中只包含说明性 README。
