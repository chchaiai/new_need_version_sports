# Phase 0B Handoff：基线与重写范围锁定

## 完成状态

DONE

Phase 0B 的完成含义是“真实状态、重写范围和责任目录已经明确”，不表示所有产品构建项均为 PASS，也不表示重写已经开始。

## 修改文件

- `docs/rebuild/00-scope.md`：记录 Git、Android/Web 构建基线，锁定重写范围和后续责任目录；
- `docs/rebuild/STATUS.md`：将当前 Phase 更新为 0B 并汇总状态；
- `docs/rebuild/handoffs/phase-0b-baseline-and-rewrite-scope.md`：记录本 handoff。

未修改 Android、Web、Backend、数据库、Contract、infra、E2E 或业务流程文件。

## 执行的测试与真实结果

- Git 根/分支/HEAD/status：PASS；根目录为 `C:\Users\23328\Desktop\new_version`，分支为 `API-contract-Making`，HEAD 为 `366ce4dabe3897276fa948ed012048e357a9137f`，Phase 开始前工作树 clean；
- `.git` 递归检查：PASS；只发现根 `.git`，嵌套 `.git` 数为 0；
- `git submodule status`：PASS；无输出，退出码 0；
- Android `.\gradlew.bat assembleDebug --console=plain`：PASS；退出码 0，`BUILD SUCCESSFUL in 3s`；
- Android Debug APK：存在，26,112,665 bytes，SHA-256 为 `17D614417D0AD0C1877ADCC8B5B20E111F2030185E210A4C69BADE144E1C981C`；
- 学生 Web typecheck/build：BLOCKED；学生端和 Web 根 package scripts 均未提供相应入口，本阶段未新增；
- Portal `npm run typecheck`：PASS；退出码 0；
- Portal `npm run build`：PASS；退出码 0；
- 基线构建后的 `git status --porcelain=v1 --untracked-files=all`：PASS，无输出。

## 已知非阻断警告

- Android 构建报告当前弃用特性将在 Gradle 10 中不兼容；
- Portal 构建报告 Node `punycode` 弃用；
- Portal 构建报告部分压缩 chunk 超过 500 kB。

这些警告只被记录，没有在 Phase 0B 修复。

## 未执行测试及原因

- Android 单元测试、lint、instrumentation、设备、Staging、Release：NOT EXECUTED，不属于本阶段基线命令；
- 学生 Web smoke/浏览器验证：NOT EXECUTED，本阶段只确认 typecheck/build 入口现状；
- Portal test/lint/浏览器验证：NOT EXECUTED，本阶段只要求 typecheck/build；
- Backend、数据库、部署和 E2E：NOT EXECUTED，重写尚未开始。

## 规则与接口边界

- 是否修改了业务规则：否；
- 是否修改了 Contract：否；
- 是否存在旧 API 引用：是，Android/Web 仍有既有 `/api/v1`、OpenAPI snapshot、生成代码和 API client；
- 是否存在 Mock、TODO、空接口：存在既有 Mock；TODO 和空接口未做全仓语义审计；本阶段未新增、修复或删除这些内容。

## Git 操作

未创建 Tag、未创建或切换分支、未 Commit、未 Push。根目录之外存在其他 linked worktree，但本阶段未触碰，且它们不属于嵌套 `.git`。

## 下一阶段前置条件

- 重新读取根 `AGENTS.md`、`docs/rebuild/STATUS.md` 和下一阶段权威输入；
- 从 `docs/rebuild/00-scope.md` 的责任目录表选定并声明本轮允许修改路径；
- 默认一个实现 Phase 只修改一个实现责任目录，另加 `docs/rebuild/STATUS.md` 与本阶段 handoff；
- 业务规则不明确、Contract 不够用或必须跨责任目录时立即停止，不得自行补规则或越界修改。
