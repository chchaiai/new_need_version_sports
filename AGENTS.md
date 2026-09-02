# 所有 Phase 共同遵守的执行规则

## 每个 Phase 开始前

Codex 应先报告：

```text
当前 Git 根目录
当前分支
HEAD Commit
git status
当前读取了哪些 AGENTS.md
当前 Phase
本轮允许修改的路径
本轮禁止修改的路径
完成标准
```

开始前的标准提示可以固定为：

```text
请先读取根 AGENTS.md、docs/rebuild/STATUS.md 和本阶段权威输入。

本轮可以跨目录只读检索，但只能修改我明确允许的目录。
如需修改禁止目录，请停止并提交 Change Request，不得自行越界。
```

## 每个 Phase 结束后

必须输出：

```text
完成状态：DONE / PARTIAL / BLOCKED
修改文件
执行的测试
真实测试结果
未执行测试及原因
是否修改了业务规则
是否修改了 Contract
是否存在旧 API 引用
是否存在 Mock、TODO、空接口
下一阶段前置条件
```

然后更新：

```text
docs/rebuild/STATUS.md
docs/rebuild/handoffs/
```

## 必须停止的三种情况

### 业务规则不明确

```text
停止实现
→ 标记 PENDING
→ 由你做决定
→ 更新业务文档
→ 再继续
```

### Contract 不够用

```text
停止当前客户端或 Backend 修改
→ 提交 Contract Change Request
→ 修改 Contract
→ 提升 Contract 版本
→ 下游重新加载新版本
```

### 必须跨目录修改

```text
停止
→ 说明为什么需要跨目录
→ 新开对应模块任务
```

## 业务规则权威来源

业务规则只以以下四份文档为权威来源：

- [总业务流程](docs/business/00-overview.md)
- [学生端业务流程](docs/business/10-student-flow.md)
- [教师端业务流程](docs/business/20-teacher-flow.md)
- [管理员端业务流程](docs/business/30-admin-flow.md)

如业务规则不明确，按本文件“必须停止的三种情况”执行，不得由客户端、Contract 或实现代码自行补充业务决定。
