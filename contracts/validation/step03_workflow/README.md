# 第三步协议验证入口

本目录是可复跑的验证材料，不是额外的步骤完成说明。对应[CR-20260908-001](../../change-requests/CR-20260908-001-material-review-timing.md)，本轮只验证材料/审核/计时协议。

## 如何复跑

在仓库根目录使用已准备好的Python环境运行`reproduce.py`，显式传入`--repo`、一个不存在的`--output`目录、Step02固定依赖的`--toolchain` JSON，以及不可变1.2.0快照的`--original-contracts`目录。所有外部进程记录实际命令、cwd、时间和退出码；失败即停，原日志不覆盖。

本机参数：Python为`D:\DT\soprts\start4\07_phase5_execution\.venv\Scripts\python.exe`；toolchain为`07_phase5_execution/T02_completion/toolchain.local.json`；原始快照为`07_phase5_execution/T02_implementation/baseline/contracts`。工具不安装依赖、不读取认证秘密、不执行Git或真实服务。

顺序：实际源生成两次并比对三份产物→原verify加本步门禁→DRAFT readiness预期阻塞→Python Schema/固定映射/计时模型→JavaScript相同输入→TypeScript生成/编译/往返→Kotlin生成模型编译与原CR-005运行回归→lint。生成与类型工具使用同一实际工作区OpenAPI，测试不临时加协议补丁。

`check_workflow.py`接入正式verify，检查本步八个联合分支的显式映射、六类原因、严格端点、历史原链、预算/暂停/纠错边界与新学生投影。`fixtures.py`保存手写合成样例；`run_checks.py`将同一输入发给JSON Schema和JavaScript。非法用例必须实际到达断言；未知字段不删除、字符串数字不转换、默认值不自动插入。

## 工具兼容与范围

openapi-typescript 7.13.0必须显式使用`--default-non-nullable false`，使默认24小时的可选`windowHours`仍可省略；首次默认配置把它变成必填并造成真实TS2322，不能修改协议为必填来掩盖。该选项同时由本机CLI帮助及[官方CLI说明](https://openapi-ts.dev/cli#flags)确认。全量生成仍保持原required/null约束，不开启任意字段或强制类型转换。

TypeScript类型系统不执行日期比较、同资源归属或全部JSON Schema条件，因此类型编译与运行时Schema检查分开。JavaScript用固定Ajv8.17.1/ajv-formats3.0.1，对同一实际schema执行全部约束；仅将OpenAPI注解登记为注解，`strictTypes:false`允许条件片段继承对象类型，不删除验证关键字。

Kotlin沿用7.24.0和第二步已接受的14个选择性wrapper方案。全体生成模型编译，以及原三组七分支的59个运行用例回归，不能被解释为本步新联合类型的完整运行验证。本步新联合类型的Android分支赋值、序列化和拒绝规则须在第六步最终候选门禁定向验证，并在Phase6 Android消费者验证中绑定最终SHA。若工具暴露缺陷，只修生成源/固定生成配置/适配验证，不手改生成DTO，不在RC发布后才发现未验证的协议。

`timing_cases.py`只是独立有限计算器：使用显式合成校历（含周六工作、周一休息）、Decimal和半开区间验证端点、暂停并集、上海日界以及入口真正恢复后的剩余预算。没有连接Backend、真实校历或时钟服务；不证明数据库锁、竞态、事务、真实文件探测、服务端授权或故障恢复。真实校历和实现归Phase7，DB恢复/E2E归Phase9。

## 失败与整改记录

- 最初旧verify按`RecordReviewSummary.result.enum`读取，遇新nullable结构产生KeyError。本CR有明确的旧/新语义，验证脚本改为校验新nullable结果和中间阶段约束，其他权限/文件/密码/认证检查保留；规模固定更新为本CR实际增量。
- 首轮lint发现未消费的独立原因枚举；删除冗余定义，六类wire值仍在具体动作和公开原因中受约束。
- 第一次完整复跑在上述TypeScript默认值行为处停止，保留`T03/verification-01/`真实失败；第二次设置官方选项后通过。
- 最后补充完整回执/记录/队列反例及学校工作日最后一纳秒检查；有限计算器取日界时用整秒定位日期，避免浮点四舍五入跨日。该改动仅为验证计算器，不是Backend实现。

最终机器结果与具体计数见本目录`result.json`；完整原始日志在用户资料包`07_phase5_execution/T03/`。DRAFT readiness exit1必须标记EXPECTED_BLOCKED，不能写成RC通过；本步也不代表整个Phase5完成或产品已可上线。
