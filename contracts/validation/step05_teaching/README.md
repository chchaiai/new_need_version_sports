# Phase5第五步：可复现验证

验证[本步CR](../../change-requests/CR-20260908-003-teaching-governance-privacy.md)与真实生成候选。最终SHA `bb57149dd3a28926ae3d9daa5345353b5529c03fc13c6ba2e338851c1924159c`，版本`1.3.0-contract.phase5-step05.1 / DRAFT`。

复用第二步固定工具链，先验证依赖SHA；脚本不安装、不操作Git、不修改生成DTO。用尚不存在的外部输出目录运行：

```powershell
& 'D:\DT\soprts\start4\07_phase5_execution\.venv\Scripts\python.exe' -B -X utf8 `
  'D:\DT\soprts\start4\repos\phase5-contract\contracts\validation\step05_teaching\reproduce.py' `
  --repo 'D:\DT\soprts\start4\repos\phase5-contract' `
  --output 'D:\DT\soprts\start4\07_phase5_execution\T05\verification-new' `
  --toolchain 'D:\DT\soprts\start4\07_phase5_execution\T02_completion\toolchain.local.json' `
  --original-contracts 'D:\DT\soprts\start4\07_phase5_execution\T02_implementation\baseline\contracts'
```

固定旧基线参数是原CR-005输入，不是第四步快照。失败保留日志并先诊断，不修改断言来跳过新协议问题。运行结果各自绑定实际OpenAPI SHA；以[机器结果](result.json)和[当前metadata](../../contract-metadata.json)交叉核对。机器结果中的绝对路径是本机证据，不代表CI。

| 层次 | 最终实际结果 |
|---|---|
| 源/产物 | 两次build一致、verify、Redocly lint通过；DRAFT readiness预期exit1且只有DRAFT原因 |
| 协议用例 | Python Draft202012 / JavaScript Ajv各273/273，不强制转类型、不填默认值、不静默删字段；含草稿确认、4.30、日期/版本、原子选择请求、OCR自动通过禁止、真实探测、完整Owner来源、隐私嵌套/别名/空值等 |
| 结构破坏 | 34/34拒绝；完整学生可达schema图遍历，角色权限、历史备注读范围与审计、来源保护、旧通知路由/缓存门禁 |
| 有限设计模型 | 248/248，合成可信来源上的原子选择失败/重放、原文时间解释、500行/身份集、陈旧回调、人工恢复、质量证据与角色读权限 |
| 生成消费者 | TypeScript58合法样例/9非法断言和往返；357个Kotlin模型编译，沿用14个原联合类型wrapper；原CR-005七分支JS/JVM回归 |
| 前驱回归 | 第四步436例/39变体/437模型；第三步224例/21变体/38计时模型；CR-00559例/39变体 |

有限模型是可信输入上的设计oracle，未执行真实事务隔离、并发、服务器身份、OCR、secret/evaluation registry、媒体、通知、缓存、导出或E2E。Schema不判断自由文本中隐藏的成绩语义；这依赖服务端模板/来源映射和Phase7/9运行验收。新Android模型运行兼容（含第三步联合类型）仍须第六步候选门禁与Phase6验证；编译不能替代运行拒绝。Backend选型兼容归Phase7.0，不单独卡住Phase5/6。

最终证据在`07_phase5_execution/T05/verification-03`。早期失败及处置见CR最后一段，保留原日志。第五步本地完成后停止，整体Phase5仍IN_PROGRESS，未commit/push/部署。
