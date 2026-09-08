# Phase 6B Web T05 Portal 运行时 Mapper

## 输入

| 项 | 值 |
|---|---|
| Version/Status | `1.3.0-contract` / `RC` |
| SHA-256 | `5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed` |
| 分支 | `codex/phase6b-web` @ `2ba9355` |

## 改动

- `portal-teacher-admin/app/phase6b-contract-mapper.ts`（新增）
- `portal-teacher-admin/app/teacher-data.ts` — `mapExerciseRecordToCheckin` 双轨
- `portal-teacher-admin/app/teacher-workspace.tsx` — 1.3.0 文案、原生 `<select>` → `AppSelect`
- `portal-teacher-admin/app/portal-app.tsx`、`language.tsx`、`review-public-reasons.ts`
- `portal-teacher-admin/tests/phase6b-contract-mapper.test.mjs`（新增 3 例）
- `portal-teacher-admin/tests/checkin-audit.test.mjs`

## 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run typecheck` | ✅ exit 0 |
| `npm test`（含 phase6b mapper） | ✅ **130/130** |

## Finding

| ID | 状态 | 说明 |
|---|---|---|
| WEB-6B-006 | **CLOSED** | Portal 已读 1.3.0 `publicReason` / `ExerciseRecord`；`creditedMinutes` 仅 UI 审计汇总字段 |

## 自检

- 1.3.0 `ExerciseRecord` 不发明 `creditedDurationSeconds`
- 退回补证：协议已定义 `RETURN_SUPPLEMENT`，生产后端未就绪前仍不写
