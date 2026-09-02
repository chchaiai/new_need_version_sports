# Phase 0A Handoff：仓库目录治理

## 完成状态

DONE

## 本地存档

Phase 0A 成果已作为一个精确范围的本地 Git 提交存档；未推送、未合并、未切换分支。

## 修改文件

- 使用 `git mv` 将四份业务流程迁移到 `docs/business/` 并按角色编号重命名；
- 更新根 `AGENTS.md` 的业务权威路径；
- 新建 `docs/business/README.md`、`docs/architecture/README.md`、`docs/runbooks/README.md`、`docs/history/README.md` 和 `docs/reference/README.md`；
- 新建重建范围、状态、目录清单、Change Request 和 handoff 文档；
- 为 `contracts/`、`BNBU-Sports-Backend/`、`infra/` 和 `tests/e2e/` 各创建一个说明性 README。

## 执行的测试与真实结果

- `git diff --cached --summary`：四份业务流程均为 100% rename；
- `git diff --cached --numstat`：四份业务流程均为 `0 0`；
- `git hash-object`：四个新路径的 blob 与迁移前 Git blob 分别一致；
- 本地 Markdown 链接检查：PASS，无失效本地链接；
- `git diff --check`：PASS；
- `git diff --cached --check`：PASS；
- Android/Web 变更路径检查：PASS，两个源码模块均无变化；
- 旧目录检查：PASS，迁移后的空目录已移除；
- 全仓旧业务文档引用扫描：发现 Web 模块内 3 处，均记录在 [Change Request](../change-requests/phase-0a-web-business-reference-cleanup.md)。

## 未执行测试及原因

- Android/Web 构建、静态检查和产品测试：NOT EXECUTED，本阶段禁止修改客户端源码；
- Backend、数据库、Contract、Docker、部署和 E2E 验证：NOT EXECUTED，本阶段没有对应实现。

## 规则与接口边界

- 是否修改了业务规则：否；
- 是否修改了 Contract：否；
- 是否存在旧 API 引用：未执行 API 引用审计；本阶段没有 API 或 Contract 变更；
- 是否存在 Mock、TODO、空接口：未创建 Mock、TODO 或空接口；四个未来实现目录仅包含明确标注的说明性 README。

## 下一阶段前置条件

- 因根 `AGENTS.md` 已修改，必须新开 Codex 对话；
- 新对话必须重新读取根 `AGENTS.md`、`docs/rebuild/STATUS.md` 和下一阶段权威输入；
- Web 模块内 3 处旧业务文档文本只能在单独授权的 Web 模块任务中处理。
