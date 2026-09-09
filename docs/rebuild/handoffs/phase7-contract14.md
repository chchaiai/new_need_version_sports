# G1 协议补全及 Android/Web 适配交接

本轮用户为Contract Owner、架构负责人及人类Reviewer，明确批准两份CR方案、查询序列化边界，并授权用户侧完成Android和Web受影响修复。Web原Owner甘洛夷；Backend仍由H/Z分别按模块Owner推进，Reviewer用户。GitHub提交、PR、合并由用户操作。

## 身份与范围

- 原main基线：f95c3833870fe0da55a297aa28c958ec53e9e935。
- 决策来源：PR15 / d2d361d76b8f2e59623c49a5dbaf83895a4d2608；独立候选快照不拷入运行服务、不重写原失败证据。
- 原协议：1.3.0-contract / RC / 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed。
- 新本地候选：1.4.0-contract / RC；准确SHA见[metadata](../../../contracts/contract-metadata.json)及[新封存清单](../../../contracts/validation/p7_cr14/release-manifest.json)。公开 /api/v1 不变，不兼容旧响应。
- 实际新来源Commit、PR/合并SHA尚未产生；接收方从用户发布的固定Commit读取并核对所有清单字节，不能用上述旧base作为新协议来源。无需为预填未来SHA额外制造文档PR。

## 已接受的决定

见[历史身份CR](../../../contracts/change-requests/CR-20260909-001-historical-student.md)与[查询CR](../../../contracts/change-requests/CR-20260909-002-query-errors.md)。正常学生也使用新包装；PENDING是当前账号，注销是历史身份，null仅为未关联。名单当前注册完成重算其状态，历史报告/统计/成绩不重算。原学校名单受限保留；当前邮箱/名单展示和个人资料副本清除。原回执只对身份展示做脱敏例外，业务结果不变，不能重执行命令。

13项x-error-codes增加INVALID_REQUEST/HTTP400，查询标量不可重复，limit解码后ASCII数字、1–100、省略20、前导零可规范化；指数/小数/符号/空白拒绝。cursor内容错误仍用INVALID_CURSOR；重复cursor用INVALID_REQUEST。

Android只更新contract-validation/tools/phase6，保留旧app/openapi和phase5ga待Phase8；Web更新当前Phase6生成类型、运行校验器和展示/Mapper。任何旧字节不能被当成新客户端兼容结果。

## H/Z 下一工作包

1. 核对用户发布的实际分支/完整Commit、1.4版本/RC/完整SHA和清单，再适配各自候选。当前本地验证不等于已经分发。
2. Identity提供权威当前/历史查询Port，区分删除与依赖错误；按一致快照读取。Course/Record等各模块按原Owner接入；不覆盖另一人的候选。
3. 13项全部按新允许错误及传输规则校验，特别教师/分管理员列表也不能继续返回错误的INVALID_CURSOR；原四项应在新源码/新SHA下真实复跑通过。
4. 31项受影响响应操作逐项分类：G1已实现的全部实测；未实现/后续切片明确Owner和回归任务。StudentAccount/StudentDashboard直接当前资料仍不变，但后者嵌套progress需回归。不能只验Enrollment，也不把整个后端未来功能强塞进G1。
5. 用真实PG/HTTP验证注销、凭据失效、保留关系、历史读取权限、Session并发、同事务事实保留与派生资料清理、缓存/导出/回执/恢复屏障。合成目录只用于联调，真实校历/目录来源验收仍未完成。
6. 完成双方源代码装配、表/migration登记对齐及真实联合链，汇总失败和Finding，由用户审阅G1。通过后再推进下一批Phase7。

## 验证与停点

本地修复及客户端自动验证已完成，等待用户最终复审/发布。[完整证据索引](phase7-contract14-evidence/verification.json)记录原始日志、固定SHA、命令及边界。

| 检查 | 实际结果 |
| --- | --- |
| 协议 | 1049/1049 Schema例；18/18破坏控制；243/243合成查询向量；生成两次字节一致；结构/Redocly/封存检查通过 |
| Web | Portal1599/1599（原247+新1352）；学生92/92；0失败/0跳过；类型检查及构建通过 |
| Android本机 | 327个模型两次生成一致；1213/1213 Schema例、255/255 Mapper例、30条共享Mock边界通过；AAR/APK构建通过 |
| Android模拟器 | Android17/API37、x86_64、16KB页：77/77仪器测试，设备内含1213条Schema例；安装后APK回读SHA一致 |

Android仅独立验证模块/测试页面，尚未做新1.4真机人工复审；Web是运行校验器、Mapper和SSR验证，不是完整浏览器/真实后端联调。各运行时共享用例，数字不能相加成独立业务场景。

首次尝试的生成依赖、Windows测试工具调用、旧追溯SHA引用与lint退出问题均已诊断、修复并按受影响层复跑；详见证据 diagnoses，未跳过断言。没有后端、真实学校资料、COS、全产品E2E或上线验收。本次不启动Phase8旧API/Mock清理，不部署，不对外发送消息。

**G1继续PARTIAL / NOT_TRACK_READY，直至H/Z新协议适配及联合验收完成。** 正式发布前用户须审阅本轮交付；PR15的“候选资料”性质不变，不能把它当作可直接合并的完整后端。
