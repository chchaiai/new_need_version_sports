# Phase 7.0 Foundation 接受与发布记录

日期：2026-09-09。Owner：Z。技术复核：H侧。用户已接受并授权代理GitHub发布。此记录补充已审候选，不改原始证据中的历史PENDING字段。

## 已接受的候选

- 入场Commit：`200ff07e22ff6e2e253d965765a498088af2463c`。
- Contract：`1.3.0-contract / RC`，SHA `5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`。
- 基包SHA：`6696234ac772b2faaf2c9ec4f04108652643afd0c1091f957ed7bf574c77b912`。
- SEC-01差异包SHA：`ff0581e572c2f84031a144b4a0cb5e8ade46190603780ce15c1b72d50973f296`。
- 最终source-manifest SHA：`cb26b13e0724b110b1d0fad5093ab1e969b53c58bc9ccf868fab22e9d80abb77`。
- 最终lockfile SHA：`4ee60feb03aa2cec5d71d572045936f7986ea2638efc8cba7363e04f4851e9af`。

H侧已核对原包80项哈希、SEC-01增量38项前后哈希、最终36项工程清单和99项candidate-freeze清单；全部匹配。产品/迁移/原测试断言未变。SEC-01仅变更有告警依赖及构建/audit入口等直接影响，已关闭，无剩余阻塞Finding。

## 测试与证据边界

Z在固定Docker镜像及隔离PostgreSQL17.6执行最后一轮G0：1003 Contract、18 Architecture、14 Integration，共1035通过、0失败、0跳过。含992冻结fixture、159合法往返、原三组union59例/七合法分支，以及Foundation真实DB/HTTP/migration/事务检查。审计0告警，锁文件绑定与容器实际版本一致，宿主入口及清理exit0。

H侧直接核对文件字节、原始测试JSON、依赖锁与audit绑定及变化代码；发布阶段没有重跑Docker，也没有宣称业务权限或完整业务事务已验收。原始证据见[summary](../../../BNBU-Sports-Backend/evidence/phase7/7.0/summary.json)、[freeze](../../../BNBU-Sports-Backend/evidence/phase7/7.0/candidate-freeze.json)、[audit](../../../BNBU-Sports-Backend/evidence/phase7/7.0/dependency-audit.json)。

已接受的Fastify5.12.3、Ajv8.20.0、yaml2.9.0、Vitest/mocker4.1.11及锁定js-yaml4.3.2取代早期计划中的对应旧版本。

## 发布与下一步

用户已明确授权本次代理提交、创建PR及正常合并。只发布已接受候选，以及本接受记录和STATUS更新；不强推、不绕过GitHub保护、不部署。发布分支`codex/phase7-foundation-sec01`，目标`main`。

本PR合并并核验其Backend文件与candidate-freeze、Contract SHA一致后，7.0 DONE / G1 READY成立。最终合并SHA从GitHub实际结果取得，不在合并前虚构。Z/H下一次入场必须记录该共同Commit并冻结各自Port、表Owner、迁移范围。

Z进入7.1身份认证+7.2课程/成员；H进入7.3运动会话+7.4媒体/记录。两轨隔离开发，单轨自检不替代合并后的真实鉴权、权限、数据库和事务验收。Phase8客户端迁移和后续外部服务/校历/E2E门禁继续保留。
