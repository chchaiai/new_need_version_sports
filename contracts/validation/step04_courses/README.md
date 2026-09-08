# Phase5第四步：可复现验证

本目录验证[CR-20260908-002](../../change-requests/CR-20260908-002-statistics-invitation-settlement.md)。使用真实工作区生成的OpenAPI，不在验证时改协议，也不编辑生成DTO。

本机已复用第三步固定Python/Node/JDK/Generator依赖；`toolchain.local.json`含固定路径和依赖SHA，程序先验证，再执行。没有自动安装或Git操作。

```powershell
& 'D:\DT\soprts\start4\07_phase5_execution\.venv\Scripts\python.exe' -B -X utf8 `
  'D:\DT\soprts\start4\repos\phase5-contract\contracts\validation\step04_courses\reproduce.py' `
  --repo 'D:\DT\soprts\start4\repos\phase5-contract' `
  --output 'D:\DT\soprts\start4\07_phase5_execution\T04\verification-new' `
  --toolchain 'D:\DT\soprts\start4\07_phase5_execution\T02_completion\toolchain.local.json' `
  --original-contracts 'D:\DT\soprts\start4\07_phase5_execution\T02_implementation\baseline\contracts'
```

输出目录必须不存在。失败日志保留，先诊断再用新目录重跑。运行后检查[机器结果](result.json)绑定的SHA与当前[元数据](../../contract-metadata.json)是否一致；不把历史第三步或早期候选结果挪作新版本证据。

| 检查层 | 内容 |
|---|---|
| 源/产物 | build两次，OpenAPI/catalog/metadata字节一致；verify保留旧门禁并精确扩展新能力；DRAFT readiness应exit1，且原因只有DRAFT。 |
| 协议正反例 | Python Draft202012与JavaScript Ajv严格校验相同用例，无强制类型转换、默认值写入、静默删字段；合法样例往返一致。 |
| 结构破坏 | 修改规则/时间/来源保护、漏掉必填前驱、公开客户端报告行或泄漏成绩等，必须被定向门禁拒绝。 |
| 有限设计模型 | A-08原文逐字节提取及来源SHA核对；80组固定种子小集合用独立穷举对照全组合/逐条值，另查前驱、重排、单调性、类别/周约束、严格时间边界、来源/内容漂移、旧报告/回执保护。 |
| 生成消费者 | openapi-typescript7.13.0使用`--default-non-nullable false`保留可选默认参数；TS5.9.3编译并往返。Generator7.24.0生成全部Kotlin模型，沿用已接受14个原联合类型wrapper方案后编译，原CR-005七分支运行回归。 |
| 前驱回归 | 原CR-005三组映射59例/39变体及JS/JVM；第三步材料/审核原223例补ruleVersionId及对应缺字段负例后以224例重验，原21变体/38计时模型保留。 |

`accepted_selection_reference.py`仅是经批准设计的有限参考；`model_cases.py`的穷举是独立小样本oracle，不是替代算法。Owner身份、来源完整性、持锁状态为模型可信输入；模拟失败不证明真实事务隔离、崩溃恢复或性能。真实校历、OTP、邮件、COS、Backend、数据库、部署和产品E2E均NOT_RUN；不存在产品Mock/空接口交付。

新增Android模型运行兼容（包括第三步联合类型）仍须第六步候选门禁/Phase6消费验证；本步全模型编译不等于Gson已拒绝全部无效payload。Backend7.0先做冻结Contract与所选技术栈兼容，业务运行Phase7、恢复/E2E Phase9。Phase5整体仍IN_PROGRESS；本步完成后等待第五步授权。

最终本地结果：`verification-03`绑定`90e7bbb0af1988e1212a631c775d5d6a3e80e59f7da9b79a05f09da8f276a06b`，436/436 Python、436/436 JavaScript、39/39结构破坏、437/437有限模型、43个合法TypeScript/9个非法断言与往返、290个Kotlin模型编译均通过。前驱回归224/224、21变体/38计时，以及CR-005 59例/39变体通过。全部命令符合预期退出；readiness的exit1只因DRAFT，是EXPECTED_BLOCKED。最初新规模/三项Admin门禁清单未同步的verify失败已修正；早期通过的verification-01/02也保留，因追加完整性约束和纠正OTP前置要求被最终字节替代，不复用其SHA。
