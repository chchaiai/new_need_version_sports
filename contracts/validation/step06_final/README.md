# 最终 RC 的复现与接收边界

候选为 `1.3.0-contract / RC`，OpenAPI SHA-256为 `5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`。公开路径仍 `/api/v1`；本轮有破坏性变更，版本号和路径保留不意味着兼容旧消费者。第六步技术候选已完成，用户最终Review、提交与分发属于第七步，当前未执行。

## 实际结果

全部结果绑定上述SHA，见[result.json](result.json)、[CR](../../change-requests/CR-20260908-004-rc-consolidation.md)、[21项缺口处置](disposition.json)和[分发候选清单](../../release-manifest.json)。实际原始命令、stdout/stderr、fixture、模型、编译JAR和哈希清单保存在本机 `start4/07_phase5_execution/T06/verification-04-rc`，不是GitHub CI。

| 验证层 | 真实结果 |
|---|---|
| 源与产物 | 两次生成OpenAPI/catalog/metadata字节相同；verify、lint、RC readiness全部exit0 |
| Python与JavaScript | 各992/992；原mapping59 + 材料计时224 + 课程统计436 + 教学治理273 |
| 结构破坏测试 | 原四套133/133拒绝，加最终10/10拒绝；包含六组新旧discriminator、权限、学生可达图、来源和计时语义 |
| 有限设计模型 | 计时38、课程437、教学248均通过，共723；只使用合成可信输入，不是实际服务/数据库运行 |
| TypeScript实际生成 | 159合法对象赋值与JSON往返，24非法闭集断言；字段类型别名先在非预期错误行解析，避免不存在的字段掩盖断言 |
| Kotlin实际生成 | 324模型编译，26模型使用精确选择的wrapper依赖集合，其他沿用基础模型 |
| JVM运行 | 相同992例全部通过；159个合法样例实际生成模型解码、分支选择、编码后JSON字段和值一致；833非法样例由完整Schema边界拒绝 |
| 候选一致性 | `verify_release.py`核对原始SHA、源/输入哈希、三产物、CR/GAP、结果和分发目标；发布门禁仍独立关闭 |

## 固定工具与执行

Python3.12.14、PyYAML6.0.3、jsonschema4.26.0、referencing0.37.0；Node24.14.1；Redocly2.51.2（`REDOCLY_TELEMETRY=off`）、openapi-typescript7.13.0（`--default-non-nullable false`）、TypeScript5.9.3、Ajv8.17.1与ajv-formats3.0.1；OpenAPI Generator7.24.0；Java21.0.10、Kotlin2.0.21（JVM target17）、Gson2.11.0。

新增隔离JVM依赖为Harrel JSON Schema1.9.1和jmail2.1.0。来源与SHA见[runtime-dependencies.json](runtime-dependencies.json)，模板源/修正版哈希见[template-manifest.json](template-manifest.json)。`toolchain.local.json`沿用第二步本机工具路径与校验值，加 `finalRuntimeRoot` 指向含已核验JAR及download-manifest.json的外部目录。换机器只重建依赖路径映射并校验版本/SHA，不修改Contract或生成DTO。依赖未加入正式产品工程。

用**尚不存在**的外部输出目录运行，脚本不会安装工具或操作Git：

```powershell
& 'D:\DT\soprts\start4\07_phase5_execution\.venv\Scripts\python.exe' -B -X utf8 'D:\DT\soprts\start4\repos\phase5-contract\contracts\validation\step06_final\reproduce.py' --repo 'D:\DT\soprts\start4\repos\phase5-contract' --output 'D:\DT\soprts\start4\07_phase5_execution\T06\verification-new' --toolchain 'D:\DT\soprts\start4\07_phase5_execution\T06\toolchain.local.json' --original-contracts 'D:\DT\soprts\start4\07_phase5_execution\T02_implementation\baseline\contracts'
```

`original-contracts`必须是原1.2.0 RC输入（原始SHA以清单为准），不是第五步快照。运行入口从工作区源生成真实协议，后续测试直接读取该协议；没有在验证阶段另加协议补丁。失败立即保留日志停止，不能把旧SHA结果挪作当前结论。源、配置或协议实质变化后重跑相应检查与规定最终门禁。

## 生成与运行支持的必要条件

基础配置是kotlin/jvm-okhttp4，选定26模型用jvm-retrofit2的 `generateOneOfAnyOfWrappers`。模型替换集合有精确断言与输出哈希，不能手动挑选未记录文件。

`generator_support.py`从当前schema推导nullable标量和具名引用映射，保留基本JSON类型与原模型；内联nullable的范围/闭集约束由Schema运行边界检查，Kotlin基本类型本身不保证这些约束。两个模板覆写仅修正数字枚举的类型比较，以及wrapper获取分支适配器时绕过已注册guard的问题。实际模板逐项核验上游JAR和覆写SHA，修改记录可逐字比较。

`jvm/ContractRuntimeProbe.java`使用完整JSON Schema2020-12验证，然后才读取真实生成模型，并校验写出结果；启用format校验。Schema引用只在本地文档和库内置meta-schema解析，没有向在线验证器发送协议。数字/布尔枚举按JSON原类型读写，不靠Gson的字符串枚举默认行为。字段存在性记录仅保存键集合，不保存或重放输入值；它按对象身份、每条消息独立清理，保留省略与显式null的区别。嵌套nullable值由父schema约束，不错误地拿裸非nullable子schema拒绝null。严格外层Schema检查仍在，不能仅复制 `nullSafe()` 而省略父级边界。

这是**隔离生成模型验证方案**。Phase6必须把这些必要语义放进真实Android/Web验证轨，验证相应工具链与Mock；不能宣称现有产品已加载它。并发、生命周期、Android平台兼容和网络集成要在该轨验证。Backend栈尚未构建，本探针不选择Backend语言/框架。

## 失败记录及未执行项

verification-01/02暴露数字枚举编译、nullable空对象和运行guard问题；verification-03为990/992，定位到wrapper绕过适配器与nullable嵌套对象副本丢失null。generator-probe-04在旧DRAFT同schema上992/992；最终verification-04-rc重新生成并在上述RC SHA上完整通过，未复用DRAFT结果充当RC结果。早期工具探测、模板提取计数断言和JVM meta-schema解析失败也保留在外部T06，未隐藏。

真实学校日历、后端鉴权/身份/时钟、数据库隔离与事务、对象存储、OCR准确率、真实服务探测、通知/缓存/导出泄露、恢复、性能和E2E均NOT_RUN。723个有限模型不是上述运行验收。Backend7.0必须完成选型兼容和CertificationKind等Domain/Database对齐，未通过不得关闭7.0或进入7.1；不单独卡住Phase5/6。Phase2遗留FCM清理归Phase8，七状态/隐私/无障碍归Phase10，发布证据归Phase11。

用户兼任Contract Owner和Reviewer，Codex执行与自检；F06-01～03技术整改已自检关闭，人类最终Review仍待第七步。没有代签陈昊，没有commit/push/merge/部署，没有新增产品Mock/TODO/空接口；现有旧API引用及旧消费者仍须按后续路线迁移。
