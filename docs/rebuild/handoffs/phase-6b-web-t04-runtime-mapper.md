# Phase 6B Web T04 学生端运行时 Mapper

## 输入

| 项 | 值 |
|---|---|
| Version/Status | `1.3.0-contract` / `RC` |
| SHA-256 | `5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed` |
| 分支 | `codex/phase6b-web` |
| 基线 Commit | `2ba9355e38373b8d2350eb8efe4071048337c320` |

## 改动

- `BNBU-Sports-Web-new/frontend/student/js/phase6b-contract-mapper.js`（新增）
- `BNBU-Sports-Web-new/frontend/student/js/api.js`
- `BNBU-Sports-Web-new/frontend/student/js/v81-review.js`
- `BNBU-Sports-Web-new/frontend/student/js/screens/checkin.js`
- `BNBU-Sports-Web-new/frontend/student/student-smoke.mjs`

## 命令与结果

| 命令 | 结果 |
|---|---|
| `npm run test:student` | ✅ 90/90 |
| `npm run typecheck`（portal，含 student contract tsconfig） | ✅ exit 0 |

## 未运行

| 项 | 原因 |
|---|---|
| Portal 全量 `npm test`（build） | T04 范围仅学生端运行时 Mapper |
| `phase5gb-contract-revalidation` | 本机无 `python` |
| 真实后端联调 | Phase7/8 |

## Finding

| ID | 状态 | 说明 |
|---|---|---|
| WEB-6B-004 | CLOSED | 学生端 `api.js` 已双轨支持 1.3.0 |
| WEB-6B-006 | CLOSED | Portal `teacher-data.ts` 已双轨；UI `creditedMinutes` 为审计汇总展示字段 |

## 自检

- 未手改 `*.generated.ts`
- 未改 Contract / 业务正文
- 1.3.0 `ExerciseRecord` 不发明 `creditedDurationSeconds`；`hours` 为 `null`
