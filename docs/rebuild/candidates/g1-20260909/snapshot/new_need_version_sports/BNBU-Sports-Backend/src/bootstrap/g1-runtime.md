# G1 本地开发进程与计划目录接入

当前入口为 `npm run start:g1`，在已经安装锁定依赖的固定 Node 24.19.0 / npm 11.17.0 容器内执行，工作目录为 Backend。`start:foundation` 保留为 Foundation 健康探针。本入口只支持 `NODE_ENV=development` 和明确批准的本地 Mailpit；生产配置、外部邮件、H 的会话/媒体/记录以及结算/职责 Provider 尚未接入。`/health/ready` 只证明数据库可查询，不是 G1 全链验收结论。

## 启动配置

环境项见 [g1-runtime.example.env](g1-runtime.example.env)，它不含可直接使用的组织、凭据或权威目录。启动前需由环境负责人提供：

- 已批准数据库的 `PGHOST/PGPORT/PGDATABASE/PGUSER/PGPASSWORD`；本进程只读核验 0000 及 1000–1110 共 13 个迁移记录、现存组织及模式配置，不执行迁移、清空或账号初始化。1110 保存学生通知已读的加密幂等回执，与已读更新同事务提交，账号注销时清除。后续 H 迁移可以存在，不能缺少 Z 必需迁移。
- 已存在的 `P7_ORGANIZATION_ID`，组织时区为 Asia/Shanghai；`P7_SCHOOL_EMAIL_DOMAINS` 为明确配置的学校邮箱域名，逗号分隔，不能留空或使用通配符。
- `P7_DIGEST_KEY_FILE` 与 `P7_ENCRYPTION_KEY_FILE`：容器内绝对路径、只读挂载；各文件保存不同的随机 32 字节密钥的 64 位 hex 文本，允许一个尾部换行。由环境负责人生成并保管，不把文件提交仓库或放入交接包。进程重启须继续使用同一对密钥；更换会使已有 token/幂等回放失效，不提供自动轮换。
- `P7_MAIL_MODE=local_mailpit`、`P7_LOCAL_MAILPIT_URL=http://mailpit:8025`，或容器能访问的受支持本地地址。Mailpit 不向外部学校邮箱转发。新进程不读取或清空已有邮箱。
- `LISTEN_HOST` 默认 127.0.0.1，`PORT` 默认 3000。容器映射端口时可设 `LISTEN_HOST=0.0.0.0`，宿主映射到 loopback。进程收到 SIGINT/SIGTERM 后关闭 HTTP 和连接池；启动失败仅输出 `G1_START_FAILED`，不输出 SQL、密钥或邮箱验证码。

目录尚未批准时，必须明确设置 `P7_PLAN_CATALOG_MODE=unavailable` 且不设置目录路径/SHA。Auth 和已具备依赖的操作可运行；课程生成发布计划失败为 503，没有默认空目录或预置计划。所有既有写操作仍执行认证、权限与事务检查。不可用的 H/结算/职责依赖维持明确拒绝，不因应用进程能启动而变成成功。

## Owner 文件协议（内部接入格式，不是新增 HTTP API）

取得 Owner 批准的文件后设 `P7_PLAN_CATALOG_MODE=file`，并同时配置 `P7_PLAN_CATALOG_FILE` 的容器绝对路径及 `P7_PLAN_CATALOG_SHA256`。SHA 是经独立核对的**原始文件字节** SHA-256，含换行；它证明所加载字节匹配批准文件，不能自行证明内容是权威校历。文件用 UTF-8 JSON，只读挂载，无网络抓取或最近一次成功数据回退。

根对象只有 `format: "P7_G1_PLAN_CATALOG_V1"` 和 `entries`。每个 entry 只有以下字段：

- `organizationId` / `semesterId`：UUID，与正在发布的课程组织/学期一致。
- `semesterVersion`：非负整数，须匹配当前学期版本；切换或修改版本后需更新目录绑定。
- `ruleSha256`：小写 64 位 hex，绑定完整内部 Rule，包含模板 ID、目标、阈值、周次数、所有区间、截止及结算时间。
- `notBefore`：该目录适用起点，UTC epoch 毫秒的安全整数。请求时间不得早于它；后续请求会移除已开始的 slot，不重新推导运动日历。
- `catalog`：只有 `version`、`complete`、`slots`。version 为来源版本标签；complete 必须由来源 Owner 明确声明有限目录是否穷尽，不能根据“文件可读取”推定为 true。

`slots` 中每个对象只有 `id`、`category`（COURSE_RELATED 或 OTHER）、`startsAt`、`endsAtExclusive`。时间为 UTC epoch 毫秒，区间为左闭右开，ID 在该 entry 内唯一；必须位于对应 Rule 允许区间并满足阈值。不把普通日历日期或周一至周五自动转换成可运动时段。所有 slot 先校验再过滤过去时段，避免损坏数据被解释为穷尽后的空目录。

ruleSha256 使用 `course-enrollment/infrastructure/file-plan-catalog.ts` 导出的 `planRuleSha256(rule)`。算法为 SHA-256(UTF-8(JSON.stringify(固定顺序对象)))，字段顺序依次为：templateVersionId（小写）、courseRelatedTargetMinutes、otherTargetMinutes、thresholdMinutes、weeklyCountLimit、allowedIntervals（每项 startsAt 然后 endsAtExclusive）、regularCutoffAt、plannedSettlementAt。所有时间先把 Contract RFC3339 UTC 字符串转换为 epoch 毫秒。数组保留顺序，不擅自排序或归并。仅日期写法不同但同一时刻不会改变 hash。

同一文件中组织/学期/学期版本/ruleSha256 组合必须唯一；不同规则可有不同 entry。入口限制 4 MiB、1–1000 个 entry、每项至多 10000 个 slot，超出返回不可用，不能截断后宣称穷尽。catalog/version 最多 128 字符，slot/id 最多 256 字符；这只是该适配器的资源限额，不更改 Contract 或业务规则。

实际 `calendarSourceVersion` 为 `来源标签@sha256:文件SHA`。每次生成计划和发布均重新验证文件字节及精确绑定；文件被替换、丢失、格式损坏或 scope 不匹配返回 503。进程重启采用新 SHA 后，旧计划将返回 `COURSE_PLAN_STALE`，应重新生成计划。完整合法见证才允许发布；目录不完整且无见证时为 UNAVAILABLE，只有 Owner 声明完整目录并穷尽证明无解才为 INFEASIBLE。

## 已实现的验证入口

在 Backend 目录运行 `bash src/bootstrap/run-g1.sh`。它在隔离 Docker 网络创建全新临时 PG/Mailpit，使用仅测试的组织/账号/目录，实际派生 `start-g1.ts` 进程完成 HTTP 登录、Mailpit 收件、课程计划与发布、SHA 替换、旧凭证拒绝、重启和失败清理验证。测试结束销毁本次环境；这不是长期开发数据库的部署脚本。具体结果以 `evidence/phase7/G1-Z/summary.json` 与 host-entry 为准，合成目录测试不计为真实校历接入或 H 联调。
