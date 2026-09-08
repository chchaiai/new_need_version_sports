# Phase 6B Web 接收与验证要求

本文件随新版 Phase 5「新 API Contract / OpenAPI」上传。Contract Owner/Reviewer 已在本轮对话中审核通过最终交付；Phase 5 的发布回执及具名分发仍待完成。本文件不表示 Web 已接收，也不启动 Web 修改任务。

## 输入身份与接收回执

- 仓库：`https://github.com/chchaiai/new_need_version_sports.git`
- 上传分支：`codex/phase5-contract-v81`；分支名可移动，不能代替固定提交。
- Contract：`1.3.0-contract / RC`，公开路径 `/api/v1`，不兼容旧协议。
- OpenAPI 路径：`contracts/openapi.yaml`
- 原始 SHA-256：`5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`
- 含本轮成果的完整来源 Commit、PR、最终合并 Commit：由实际上传/合并后的发布回执补充，当前不预填。`974587c3778a53803a7959ea0f64677581e239f4` 是旧基线，不含本轮成果。
- Android 与总体架构负责人：用户本人。Web 具名接收人及 6C 汇总负责人待确认，不沿用历史协作名单自动任命。

先接收资料。正式开工前，由负责人提供发布回执并确认 Web 工作分支、Owner/Reviewer、允许修改路径和首个小任务。Web 在独立干净工作区核对完整 Commit、Version/Status/SHA、dirty state，回复具名接收回执；不覆盖旧目录，不将历史 phase-5a/5b 编号当作新版 Phase 6。

回执填写：接收人／日期、固定来源与工作基线 Commit、Version／Status／实测 SHA、负责学生端与 Portal 的范围、Reviewer、分支及可写路径、当前阻塞。尚未明确的项如实写待确认。

## 必读材料及复用边界

1. [最终接收入口](README.md)、[分发清单](../../release-manifest.json)、[当前协议说明](../../README.md)。早期步骤中“待审查”“DRAFT”等文字为当时证据，当前接收结论以 manifest 的用户原话记录为准。
2. [实际协议](../../openapi.yaml)、[操作目录](../../operation-catalog.md)、[完整差异](contract-diff.json)。新增 56 操作、移除学生最终成绩读取、35 操作直接变化、17 操作受引用 schema 变化影响。所有消费者使用完整新 RC，不能按差异摘抄出另一份协议。
3. [追溯表](traceability.json)、[固定样例](fixtures.json)。992 个协议样例含 159 合法及 833 非法输入；41 个 PAGE-STU 是 Phase 2 的实际 Android 页面索引，用于共用业务追溯，不冒充 Web 页面清单。Web 需补充自己的学生端/Portal 对应关系。
4. [最终验证说明](../step06_final/README.md)及[实际结果](../step06_final/result.json)。生成与验证源、固定模板和依赖摘要在仓库；原始执行日志、外部工具缓存及编译产物在交付方本机，尚未作为附件分发。需要审阅原始证据时向交付方索取，不能把本机路径当成 Web 已有文件。

Web 已验证参考工具：Node 24.14.1、openapi-typescript 7.13.0（`--default-non-nullable false`）、TypeScript 5.9.3、Ajv 8.17.1 / ajv-formats 3.0.1；结构 lint 用 Redocly 2.51.2。以上是 Phase 5 的隔离验证配置，不授权静默升级整个产品工具链。工具使用冲突应单独说明；不要直接运行绑定第二步旧 SHA 的候选准备脚本去覆盖当前 RC。

## Phase 6B 工作内容

- 在获准验证轨内，从同一 RC 确定性生成类型，核对重复生成一致；读取两处 Web 实际工程约束及适用 AGENTS.md。
- 检查 required、nullable、省略与显式 null、空数组、枚举、时间及未知字段。TypeScript 编译不等于收到的 JSON 在运行时合法；在数据边界验证，不用类型断言掩盖差异。
- 验证全部相关 union/discriminator 和 Mapper：合法分支正常转换，未知/错配分支被拒绝，不手改生成 DTO，不另建私有协议绕过问题。
- 在学生端及 Portal 做受影响页面的 Mock/构建验证。覆盖成功、空态、权限不足、首次改密/身份恢复、错误、维护等适用场景；连接失败不显示维护，处理中不显示无效，依赖失败不返回成功空数组。
- 重点覆盖材料截止与合法原链、补证和教师 SLA、实际/可计/计入分钟、结算、OCR 草稿及确认、教师/技术管理员权限、学生出口隐私和历史备注只读。真实校历/鉴权/数据库事务等由后续阶段验证，Mock 不证明服务端已正确实现。

Phase 2 的现有页面/组件可以复用；旧 API/字段/展示占位不是规则依据。本轮只进行获准 Contract+Mock 验证和必要客户端整改；正式网络迁移归 Phase 8。后端尚未构建不单独阻断 Phase 6，Backend 7.0 的真实选型兼容与 Domain/Database 对齐仍是进入 7.1 的前置条件。

## 结果回传和 6C 汇总

Web 每个完整小任务完成后汇报实际改动、命令与退出码、通过/失败/未运行、证据位置及 SHA。失败先诊断，不反复重跑相同失败，不为赶工跳过门禁。返回报告必须包括：

- 输入 Version/Status/SHA、完整来源及工作 Commit、工具版本、生成命令、允许路径及实际改动。
- 学生端与 Portal 分别的生成、类型/序列化、Mapper、Mock、受影响构建结果；没跑的明确标记 NOT_RUN 和原因。
- Finding 编号、最小复现、影响、责任人与状态；遗留旧 API/FCM/占位等按所属阶段登记，不能宣称全部迁移完成。
- 自检与 Reviewer 结论分开记录，不能用 Phase 5 的测试结果代替 Web 本轮结果。

Contract defect 返回 Contract Owner，经 CR、升 Version/SHA 后 Android/Web 重验；业务不明确由业务 Owner 决定；Client defect 在获准轨内整改；Legacy issue 交 Phase 8。不得静默修改当前 RC。

6C 收集 Android/Web 同 Version/SHA 的报告与 Findings，检查阻塞项关闭和后续责任明确后才作汇总结论。发布代码、完成单端验证、合并 PR 均不自动等于 Phase 6 或产品验收完成。
