# 架构文档

本目录保存已经进入对应 Phase 的架构设计；文档设计不等于 Backend、数据库、Contract、部署或发布已经实现。

- [Phase 3：Domain 与数据库设计](phase-3-domain-and-database-design.md)：完整上线闭集的 Domain、PostgreSQL、COS 元数据、唯一约束、事务、索引、站内通知、安全和正式审计设计；已同步 P4-DECISION-01 至 05，当前仍不包含 Backend 或 migration 实现。
- [Phase 3A：Backend 内部架构蓝图](backend-architecture.md)：Modular Monolith、Clean Architecture、DDD Lite、Vertical Slice、运行时调用链、分层职责、事务与三模型映射边界。
- [Phase 3A：Backend 模块边界与 Owner](backend-module-boundaries.md)：最终模块清单、唯一写 Owner、跨模块公开能力、原子流程协调者和 `shared/` 边界。
- [Phase 3A：Backend 依赖与架构测试规则](backend-dependency-rules.md)：Repository Port 统一位置、可判定 import/model/transaction/error 规则和 Phase 6.0 架构测试门禁。

## 当前唯一 Contract 基线

上述 Phase 3/3A 文档和后续 Backend 工作只允许以 [Contract metadata](../../contracts/contract-metadata.json) 记录的 `1.2.0-contract`、状态 `RC`、OpenAPI SHA-256 `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a` 为 API 边界。Phase 5F 已把 `CertificationKind` 与密码生命周期对齐到 Domain/数据库设计；架构不得补造或改变字段、状态、错误码、权限、上传、幂等或其他 Contract 语义。发现新的真正缺陷时必须先按 [Change Request 门禁](../../contracts/change-requests/README.md)记录新的 `PROPOSED CR`，不得在设计或实现中私自改 Contract。

`P4-DECISION-05` 明确：删除教师账号不要求或建立责任教师交接，Course 责任不是教师删除 blocker，管理员不得修改/转移责任教师或借账号管理改写课程事实。
