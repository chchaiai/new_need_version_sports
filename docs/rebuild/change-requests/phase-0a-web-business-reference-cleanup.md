# Change Request：Web 模块旧业务文档引用清理

## 状态

PENDING

## 原因

Phase 0A 全仓搜索发现 3 处旧业务文档名称或目录文本位于 `BNBU-Sports-Web-new/`。本阶段禁止修改 Android 或 Web 源码，并且跨模块修改必须另开对应模块任务，因此未在 Phase 0A 越界处理。

## 待处理位置

- `BNBU-Sports-Web-new/README.md:17`：把旧根业务目录说明更新为 `docs/business/`；
- `BNBU-Sports-Web-new/portal-teacher-admin/docs/admin-frontend-audit.md:3`：确认历史审计基准是否应保留旧名称；如表示当前权威输入，则更新为管理员流程的新路径；
- `BNBU-Sports-Web-new/frontend/student/js/screens/checkin.js:4`：在明确允许修改 Web 源码的任务中，把注释引用更新为学生流程的新路径。

## 完成条件

- 在新的 Web 模块任务中重新读取该模块的 `AGENTS.md`；
- 不改变运行逻辑或业务规则；
- 全仓旧业务目录和旧文件名文本扫描只剩有意保留且有历史说明的内容；
- Web 模块按其规则完成对应验证。
