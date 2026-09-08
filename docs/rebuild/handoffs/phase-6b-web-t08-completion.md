# Phase 6B Web T08 完成回传（供 6C 汇总）

## 完成状态：DONE（含审查整改 R01–R07）

Phase 6B Web 在固定 `1.3.0-contract / RC / 5c87eeb9…f4a19ed` 上完成绑定、Fixture、双端运行时 Mapper、Mock/构建门禁，并已关闭 PR #11 审查报告全部 Finding。正式网络迁移仍归 Phase 8。

## 审查整改（2026-09-08）

| ID | 状态 | 修复摘要 |
|---|---|---|
| R01 | CLOSED | `loadApiWorkspace` 先取 `contractCourse` 再 `mapProgressTarget`；smoke 新增工作区加载用例 |
| R02 | CLOSED | `processingStage` → `auditStatus: processing`（Portal）；学生端 `reviewProcessingStage` 映射 |
| R03 | CLOSED | 分类完成量使用 `cappedCompletedMinutes`；`countedRecordMinutes` 单列 |
| R04 | CLOSED | UNAVAILABLE/RECOMPUTING 返回 `null` + `progressUnavailable`；dashboard 展示暂不可用 |
| R05 | CLOSED | `creditedDurationSeconds`/`creditedMinutes` 保持 `null`；VALID 无 hours 显示“计入情况待确认” |
| R06 | CLOSED | 两端 `assertContractExerciseRecordWire` 运行时校验 + 反例测试 |
| R07 | CLOSED | `transferDueAt` 修正为 acceptedAt+30min（`03:45:00Z`） |
| G01 | CLOSED | `STATUS.md` 合并 Android 6A 与 Web 6B 段落 |

## 输入身份

| 项 | 值 |
|---|---|
| 入场基线 | `2ba9355e38373b8d2350eb8efe4071048337c320` |
| 工作分支 | `codex/phase6b-web` |
| 工作区 | `/Users/louis/Projects/new_need_version_sports-phase6b` |
| Owner | 甘洛夷（6B Web） |
| Reviewer | 用户（6C / Contract 门禁） |

## 任务完成清单

| 任务 | 状态 | 证据 |
|---|---|---|
| T01 接收回执 | ✅ | [phase-6b-web-t01-receipt.md](phase-6b-web-t01-receipt.md) |
| T02 绑定 + 类型生成 | ✅ | `phase5b:contract:generate --check` 两端 14352 行一致 |
| T03 Fixture/Mock 对齐 | ✅ | typecheck ✅；phase5b mock/revalidation **22/22** |
| T04 学生端运行时 Mapper | ✅ | student smoke **92/92**；[t04](phase-6b-web-t04-runtime-mapper.md) |
| T05 Portal 运行时 Mapper | ✅ | portal **133/133**；[t05](phase-6b-web-t05-portal-runtime-mapper.md) |
| T06 Portal 全量构建测试 | ✅ | `npm test` **133/133**（含 `rendered-html` AppSelect 门禁） |
| T07 phase5gb + Finding 收口 | ✅ | phase5gb **13/13**；ADMIN gated 清单升至 54 |
| T08 6B 完成回传 | ✅ | 本文件 |

## 测试汇总

| 范围 | 命令 | 结果 |
|---|---|---|
| 学生端 smoke | `npm run test:student` | ✅ 92/92 |
| Portal typecheck | `npm run typecheck` | ✅ exit 0 |
| Portal 全量 | `npm test` | ✅ 133/133 |
| phase5b contract | mock + revalidation | ✅ 22/22（含于 Portal 133） |
| phase5gb contract | revalidation | ✅ 13/13（含于 Portal 133） |

## Finding 最终状态

| ID | 状态 | 说明 |
|---|---|---|
| WEB-6B-001 | CLOSED | 绑定 1.3.0 |
| WEB-6B-002 | CLOSED | Fixture 对齐 |
| WEB-6B-003 | INFO | 正式轨仍并行 `3.0.0-web-snapshot`；归 Phase 8 Legacy |
| WEB-6B-004 | CLOSED | 学生端 `api.js` 双轨 |
| WEB-6B-005 | CLOSED | phase5gb 改用 `python3` 可运行 |
| WEB-6B-006 | CLOSED | Portal `teacher-data` 双轨 |

## 未执行 / 明确延期

| 项 | 阶段 | 原因 |
|---|---|---|
| 真实后端联调 | Phase 7/8 | Backend 未构建 |
| 正式 API 网络迁移 | Phase 8 | 本轮仅 Contract+Mock |
| Teacher Dashboard / Notification Center UI | Phase 8+ | 覆盖矩阵 T01/T07 仍为 MISSING |
| 6C 汇总结论 | 6C | 待用户复核 PR #11 后执行；Android 6A 已在 main 接受 |

## 自检

- 未手改 `*.generated.ts`
- 未改 `contracts/**`、业务正文、Android、Backend
- 无新增产品 Mock/TODO/空接口
- Phase 5 通过不代替 Web 本轮验证

## 6C 前置

- Android 6A 需在同 Version/Status/SHA 完成加载与验证
- 阻塞 Contract defect 为零后方可 6C 通过
- Legacy Migration（LM-01～24）登记保留，不宣称正式链路已迁移
