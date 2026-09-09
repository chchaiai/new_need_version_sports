# P7-Z-0 / 7.0 Foundation — SEC-01 修复交接

日期：2026-09-09。状态：**PARTIAL / READY_FOR_CLOSURE_CHECK**。Z 已完成 SEC-01 修复及固定 G0 自检；等待 H 确认该 Finding 关闭，再由用户最终验收及操作 GitHub 合并。7.0 尚未登记 DONE，G1 尚未启动。

## 审核依据与候选基线

用户本轮转交 `WI-0032-phase7-z0-review.md`；H 结论为 REQUEST_CHANGES，唯一阻塞 Finding 为 SEC-01。H 已核对原 ZIP 内 80/80 文件哈希、1035 个通过记录及 Foundation 范围，不要求重做 Phase 5/6 或再次全文互审。本次按 v3 的 Finding 修复流程处理依赖与直接影响。

- 工作区：`/Users/labyr1nth/Desktop/Phase4&7/phase7/new_need_version_sports`；分支 `main`，HEAD `200ff07e22ff6e2e253d965765a498088af2463c`。
- 入场 clean；当前仍为批准范围内的未提交候选，没有新 Commit。实际交付状态见 `delivery-git-status.txt`。
- 根 AGENTS.md 与 STATUS 已读取；v3 的 STATUS 写入限制仍生效。仅使用 v3 原批准的 Backend 和本 Handoff 路径。
- Contract `1.3.0-contract / RC`；canonical Git/LF 与 checkout SHA 均为 `5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`。
- 原候选 `phase7-z0-foundation-20260909.zip`，SHA-256 `6696234ac772b2faaf2c9ec4f04108652643afd0c1091f957ed7bf574c77b912`；本次差异包以它为叠加基线。
- Docker Engine 29.7.2 / Compose 5.3.1；Node 24.19.0 / npm 11.17.0；PostgreSQL 17.6，linux/arm64。实际镜像 digest 与版本见 [summary](../../../BNBU-Sports-Backend/evidence/phase7/7.0/summary.json)，PRE 记录在同目录 intake.json，保留为历史。
- 每次集成测试是新的隔离 `p7_foundation` 数据库/用户，5432 仅容器内可见，无宿主机映射；随机密码只经临时环境注入，合成数据、tmpfs，结束清理。

## SEC-01 的具体修复

- Fastify：5.6.1 → **5.12.3**。
- Ajv：8.17.1 → **8.20.0**。
- yaml：2.8.1 → **2.9.0**。
- Vitest：3.2.4 → **4.1.11**；`@vitest/mocker` 同步精确到 4.1.11。
- `@redocly/openapi-core@1.34.19` 本身保持不变，仅将它的 js-yaml override 到 **4.3.2**，解决传递告警。openapi-typescript 7.13.0 保持不变。
- `vitest@4.1.11` 的 Vite 精确保持原 **7.3.6**，不接受 npm 顺带升到 Vite 8 的结果。其他无告警直接依赖、Node/npm/PostgreSQL 和镜像 digest 均保持。

Vitest 3.2.7 不足以覆盖全部公告，因此采用[同时修复 mocker 路径穿越的 4.1.11](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)，也覆盖[UI 文件读取/执行公告](https://github.com/advisories/GHSA-5xrq-8626-4rwp)。js-yaml 的修复依据见[维护者公告](https://github.com/nodeca/js-yaml/security/advisories/GHSA-2883-xcg3-v3hh)。Fastify 结合原 audit 中全部受影响范围选择 5.12.3，而非仅处理单个 Content-Type 公告。实际注册表元数据及完整变更节点在 `sec-01/candidate-metadata.json`、`sec-01/lockfile-diff.json`。

第一次解析保留了一个过期的嵌套 js-yaml 锁节点；仅移除该失效解析节点后，由 npm 在空目录重新生成锁文件并执行 npm ci，未手工编造版本或 integrity。新 audit 和 affected dependency tree 均通过。中间诊断留在本地 sec-01/initial-resolution；未将其 2 个 high 豁免。

## 新旧审计与 G0 绑定

旧报告是 **7 个受影响包节点**（3 moderate / 3 high / 1 critical），不是 7 个独立漏洞。旧 JSON 字节保存在 [before-dependency-audit.json](../../../BNBU-Sports-Backend/evidence/phase7/7.0/sec-01/before-dependency-audit.json)。

最终构建在线执行 `npm audit --json`：**0 个受影响包节点，exit code 0**。记录时间 `2026-09-09T03:06:49.072Z`，绑定 lockfile SHA-256 `4ee60feb03aa2cec5d71d572045936f7986ea2638efc8cba7363e04f4851e9af`。未解决的注册表告警为空，没有自动豁免 high/critical。0 告警仅表示该时间的已知依赖公告检查，不是全系统安全认证。

Dockerfile 在 npm ci 后生成原始审计与 metadata；无效响应或告警非零导致构建失败。运行中的 G0 验证器再次确认 metadata、原始 audit 和当前 lockfile SHA 一致。审计在构建时在线执行，测试网络保持内部隔离；后续使用构建缓存时会复用明确标时的审计快照。

证据：[新 audit](../../../BNBU-Sports-Backend/evidence/phase7/7.0/dependency-audit.json)、[audit metadata](../../../BNBU-Sports-Backend/evidence/phase7/7.0/dependency-audit.json.meta.json)、[修复汇总](../../../BNBU-Sports-Backend/evidence/phase7/7.0/sec-01/remediation.json)。ESLint 旧版本支持提示、npm 新版本提示及 esbuild allow-scripts 提示未被混称为漏洞；冻结的无告警版本没有顺便升级，所需运行功能由完整 G0 实测。

## 最终完整验证

宿主机 cwd：`/Users/labyr1nth/Desktop/Phase4&7/phase7/new_need_version_sports`；容器 cwd `/workspace`。唯一入口：

```bash
bash BNBU-Sports-Backend/src/bootstrap/run-foundation.sh
```

最终 G0 从 `2026-09-09T03:06:53.465Z` 到 `2026-09-09T03:06:57.228Z`；project `bnbu-p7-z0-20260909110640-50852`。构建全新依赖层与在线审计，随后 typecheck、lint、codegen check、Contract、Architecture、Integration 全部通过；入口及清理退出码均为 **0**。

- Contract：**1003/1003**；含全部 **992 个冻结 fixture / 159 positive** 和原 11 项补充测试。三组原 union 59/59、七个合法分支 round-trip 保留；新增三组 union 直接用例 114/114。
- Architecture：**18/18**；五项架构结论继续通过。
- Integration：**14/14**；真实 PostgreSQL、两种 CertificationKind 四层映射、未知/null 拒绝、迁移 up/down/rebuild、健康检查正常/断库、真实 Node 启停、并发与事务提交/回滚均保留。
- 总计 **1035/1035，0 failed，0 pending**。全部原测试文件逐字节未改，未削减断言或用替身替换真实 DB/HTTP。

结果见 [summary](../../../BNBU-Sports-Backend/evidence/phase7/7.0/summary.json)、[host-entry](../../../BNBU-Sports-Backend/evidence/phase7/7.0/host-entry.json) 和各 `vitest-*.json` / 分步日志。中间曾验证 npm 自动选择的 Vite 8 组合也通过，最终收窄回原 Vite 后重新跑固定套件；这里仅报告最后的锁文件与测试结果。

## 本次修改文件

相对 H 已审原候选，工程/源码只改以下 6 个文件，再更新本交接和机器证据：

- `BNBU-Sports-Backend/Dockerfile.test`
- `BNBU-Sports-Backend/README.md`
- `BNBU-Sports-Backend/package-lock.json`
- `BNBU-Sports-Backend/package.json`
- `BNBU-Sports-Backend/src/bootstrap/audit-dependencies.mjs`
- `BNBU-Sports-Backend/src/bootstrap/verify-foundation.mjs`

业务模块、所有原测试断言、migration、生成 DTO 字节均保持。允许写入仍限 v3 清单；Contract、业务/架构正文、Android/Web、infra、.github、生产配置和 STATUS 无改动。无新增旧 API、Mock、TODO、空业务接口或 Fake Success。

测试源码 manifest SHA-256：`cb26b13e0724b110b1d0fad5093ab1e969b53c58bc9ccf868fab22e9d80abb77`。交付核验确认当前源码与测试容器 manifest 完全一致；详见 [source-manifest](../../../BNBU-Sports-Backend/evidence/phase7/7.0/source-manifest.json) 和 [candidate-freeze](../../../BNBU-Sports-Backend/evidence/phase7/7.0/candidate-freeze.json)。差异包提供原包 SHA、每个新增/替换文件的前后 SHA；本地中间运行的历史副本保留，不要求 H 重审。

未执行：Phase 5/6 全套（输入未变，H 不要求重做）；G1/G2 业务链与外部服务测试（尚未进入这些阶段）；GitHub commit/push/PR/merge（由用户操作）。Foundation 事务仍标记 `NOT_APPLICABLE_TO_BUSINESS_SLICE`。

## H 本次仅需核对

1. SEC-01 依赖选择和 override、精确 lockfile、原始新旧 audit 及锁文件绑定。
2. 原断言保留、最后一轮完整 G0 全通过、候选哈希与差异包一致。
3. 确认 SEC-01 关闭，或指出该项仍存的具体问题；无需重审稳定的 Foundation 模块或 Phase 5/6。

随后由用户最终验收并完成 GitHub 合并核验，形成共同 Commit 后，才同时启动 Z 的 7.1+7.2 与 H 的 7.3+7.4。本次没有代替 H 关闭 Finding，也没有代替用户接受 7.0。
