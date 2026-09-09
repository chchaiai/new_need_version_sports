# G1 CR 当前 Web 校验绑定

当前使用 contracts/openapi.yaml 的1.4.0-contract / RC，本地候选身份由现行生成脚本严格锁定。新增学生身份联合类型、8个历史出口的严格校验；当前学生接口显式拒绝已注销身份。共享 studentIdentityDisplay 只生成展示数据，不伪造 StudentSummary；已注销文案不建立当前账号链接。

Portal/Student 的生成类型和 validators.generated.js 都从权威源重生成，历史报告不改写。真实Backend、删除事务、缓存/导出清理及Phase8正式网络接入不在本次客户端验证之内。

以下为原1.3校验器的历史说明。

# Phase 6B runtime Contract validation

`wire.js` is shared by the student and Portal mappers. It validates incoming 1.3.0 DTOs before projection. Legacy API migration remains a Phase 8 responsibility.

The source is repository `contracts/openapi.yaml`, version `1.3.0-contract / RC`, SHA-256 `5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`. Do not edit `validators.generated.js` or copy a schema into a mapper.

From `BNBU-Sports-Web-new/portal-teacher-admin`, after `npm ci`:

```sh
npm run phase6b:wire:generate
npm run phase6b:wire:check
npm run typecheck
npm test
```

From `BNBU-Sports-Web-new` also run `npm run test:student`.

The generator uses pinned Ajv 8.17.1 / ajv-formats 3.0.1, matching the Phase 5 JavaScript validator family. It compiles the unchanged schema with required properties, nested references, closed objects, formats and conditional assertions intact. OpenAPI annotations are allowed. It never inserts defaults, coerces values or removes unknown properties. Both `typecheck` and the Portal test command reject stale generated output.

The browser artifact is self-contained ESM, compiled ahead of time; no Node dependency, runtime `eval` or `new Function` is required. Development dependencies are only used when generating. Errors expose schema paths and keywords rather than student payload values. Protocol routing retains recognizable malformed 1.3.0 records on the strict path instead of falling back because `recordId` or `currentMaterial` is missing.

`tests/phase6b-wire.test.mjs` checks the published Phase 5 cases relevant to these five schema roots, then exercises invalid/valid payloads through both consumer mappers. This is not a claim that the Web mapper executes all 992 Phase 5 cases. `tests/checkin-audit.test.mjs` additionally checks unknown credits through mapping, aggregation and actual React rendering; unknown totals, remaining duration and target status stay unavailable.

The inherited Portal `phase5gb` test invokes `python3` and requires PyYAML. On this Windows review host only, an external Node preload maps that command to the existing Phase 5 virtual environment. It is a recorded test-run adaptation, not a product dependency or a backend test.
