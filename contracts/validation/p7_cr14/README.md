# G1 两项 CR 的复现和发布边界

当前候选1.4.0-contract / RC；准确 SHA 由 contract-metadata.json 和本目录 release-manifest.json 固定。用户已批准方案/实施，最终交付复审、提交、PR和合并仍由用户操作。Backend G1 未通过，原PR15四项失败不可被本轮协议/Mock成绩关闭。

## 验证入口

- `build_fixtures.py`：从固定 f95c3833870fe0da55a297aa28c958ec53e9e935 的1.3协议，迁移原992例（52例结构变化）并增加57例；保留原预期有效/无效，不编辑旧fixtures。修改权威源后先运行 build_contract.py，再重生成新用例。
- `verify.py --output <外部JSON>`：检查原字段/权限/操作范围、1049 Schema正反例、18结构破坏控制与31项响应影响盘点。
- `query_cases.py` / `query-cases.json`：243个合成传输向量，覆盖全部13项；不是Backend实现，不是HTTP已通过。包含limit边界、指数/符号/空白/非ASCII数字、重复和解码后重复键，以及已有非法状态/布尔/空q。
- `verify_release.py` / `test_release_seal.py`：新候选字节封存和六个负向/正向控制。旧1.3发布清单/结果不覆盖、不伪造新发布来源提交。
- Web：在 portal-teacher-admin 运行 `npm ci`、`npm run typecheck`、`npm test`；在 frontend/student 运行 `node student-smoke.mjs`。npm test包含本轮完整Schema、243查询向量、实际浏览器校验器和展示测试。依赖由现有lockfile固定。
- Android：在 BNBU-ANDROID 运行 tools/phase6/run_step05.py，参数见该模块README。新清单、固定生成器、两次真实模型生成、327类编译、1213 Schema例、Mapper/Mock与APK封存全部核验。然后以新build证据和明确serial运行 run_step06.py --suite full。用例和APK的SHA必须相符。

协议必要检查还包括 contracts/scripts/verify_contract.py、check_rc_readiness.py，以及固定 Redocly2.51.2 lint（Windows设置 REDOCLY_TELEMETRY=off，检查实际进程退出码）。源码更新时生成两次要求 openapi/catalog/metadata 相同；生成目录不得手改。

工具使用已固定的Python3.12/PyYAML/jsonschema、Node24、openapi-typescript7.13、Ajv8.17、OpenAPI Generator7.24、AGP8.7.3/Kotlin2.0.21/JDK21和Android SDK35；设备测试另记实际系统版本，不能外推所有设备。

## 结果解释

只登记实际执行的用例及范围；设计模型、JS、JVM、Android、真实Backend分开报告。最终证据索引见 [交接](../../../docs/rebuild/handoffs/phase7-contract14.md)。原Phase5/6验收不被撤销，受影响部分用新结果接续。

H/Z须重新加载新版本并实现删除感知身份Port、8出口投影、13项错误映射及查询传输规则；对G1已实现操作执行真实PG/HTTP、权限、Session并发、缓存/回执和删除事务验证。其余影响操作登记到对应后续切片，不要求G1提前完成整个后端。客户端正式网络迁移继续Phase8。
