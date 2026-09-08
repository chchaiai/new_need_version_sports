# Phase6A Android 交付与验收

2026-09-08。完成状态：**本地 Android 7/7 DONE，用户已接受第6步；上传待用户操作**。
新版 Phase6 全名为「Android / Web Contract + Mock 验证」。6A 是 Android，6B 是 Web，6C 是两端结果汇总与阶段验收。
这里“第七步”指本地 Android 七步计划收尾，不是 Phase6 Word 中的跨端汇总 T07；本次未执行 6C，整个 Phase6 仍为 IN_PROGRESS。

## 固定身份与职责

- 仓库：`https://github.com/chchaiai/new_need_version_sports.git`。
- 开发基线：`2ba9355e38373b8d2350eb8efe4071048337c320`；分支：`codex/phase6a-contract-mock`。基线不是本次交付 Commit，本地交付尚未提交，实际 Commit 以用户上传后的完整 SHA 为准。
- 唯一输入：`1.3.0-contract / RC`，SHA-256 `5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed`；Contract 来源 `f702c590ff10b11f7de038332868c988ab4cec11`。157 paths /176 operations /316 schemas /99 errors，公开路径 `/api/v1`。未升为 APPROVED，未部署。
- Android Owner、架构负责人、人类 Reviewer、Contract Owner 及 6C 汇总均由用户担任；Codex 执行与自检。本次没有另一个独立人类 Reviewer，不代填陈昊的通过记录。
- Web Owner 为甘洛夷。PR [#11](https://github.com/chchaiai/new_need_version_sports/pull/11)，报送完整提交 `c3d42be6cd60f8dd1194736e22e861bca2a22cd4`，本次只核对远端引用，未审核代码、复跑测试或接受 Web 成果。
- [用户接收记录](new-req-phase-6-android-evidence/acceptance.json)引用实际对话。用户说“我手机上查看完了……我同意第6步审阅通过”，随后授权“完成第七步”。不将用户接收推断为运行了每一个自动化用例。

## 本次实际交付

1. 独立 `BNBU-ANDROID/contract-validation` Android library：绑定原始 Contract 字节、生成配置和依赖；两次生成所有 324 个 DTO，禁止手工改生成物。仅调整 settings 以便隔离验证；正式 `:app` 未依赖本模块。
2. 严格序列化、反序列化及负向校验：union、required/null/omitted、整数范围、无损日期字符串、枚举与99错误码。真实 Android 编译类与 AAR 的700项条目一致。
3. 学生数据 Mapper：进度/检查点、记录/审核、首材/原链/计时、邀请课程、原始耐力、申请认证、通知账户、媒体帮助反馈和版本策略。41个 Phase2 页面对应数据映射或校内/本地流程，**不代表41个正式页面均已渲染**。
4. 本地 Mock HTTP →严格解析→生成 DTO→Mapper→Compose 验证界面，覆盖正常、加载、空、错误、禁止、维护、恢复与只读。Mock 只接受 literal `127.0.0.1`，使用合成数据。
5. JVM 和真实 Android instrumentation 入口、原始结果、命令/退出码、生成及源哈希；独立人工审查 APK 及逐场景指导另存证据包。正式 App 不因本次测试获得新 API 网络链路。

## 真实验证结果

| 验证 | 最终结果 | 证据与限制 |
|---|---|---|
| 生成和 Android 库构建 | 324模型两次逐字节一致；AAR324模型齐全 | [构建结果](new-req-phase-6-android-evidence/host/result.json)；实际AGP8.7.3/Kotlin2.0.21/compile35/min26/target35 |
| 严格协议 | 1156/1156；286合法往返、870应拒绝输入正确拒绝 | 992发布用例原样消费，加164针对性用例；不等于穷举316schemas/176operations |
| Mapper / Mock | 255 /71通过 | Mock为44场景+27边界；17烟测、6构造DTO、9入口负控另记，不加成独立完整协议覆盖 |
| Android模拟器 | 74/74通过，0失败 | [运行结果](new-req-phase-6-android-evidence/device/result.json)；44 UI+1实际Retry+27边界+2语料组，同一已安装APK SHA核验 |
| 横屏/字体2.0 | 1/1通过 | 同一APK，Retry重新HTTP→正常首页；不冒充再一次全套74例 |
| 人工审查启动器 | 模拟器2/2通过；用户手机查看并接受 | iQOO12Pro；未取得手机系统版本、逐项导出或ADB安装哈希，不写真机自动化46/46 |
| 第七步 | 原始证据、源字节、范围、交接及发布清单核验 | 修复历史状态文件导致的主机复现入口报错，新增5项门禁回归；完整主机/构建重跑，Android产物与第6步比较；见随包 `closeout-check.json` |

最终验证 AAR SHA：`108a0020306fb42cd7b603b0aaec4f9b6d62911e216bd14cd4ceefb4b8458987`。
instrumentation APK SHA：`ddbe0bca890646a81d485b50d6191a3199f9f1beaceb6dd78e01e677740b2e3d`。
人工审查 APK SHA：`f1045c441b95fd83806f3be65406b14cb3afe78328d7e41a7b96ae014e944814`。
人工 APK 是独立 `edu.bnbu.phase6.manualreview / 1.0-review`，内部46项指导不是46项人工结果。它复用已封存AAR与Mock源；按钮中未接真实业务的操作会明确提示，不产生真实提交。

复现入口见 [Android验证README](../../../BNBU-ANDROID/contract-validation/README.md)，原始数据与分发方式见 [证据说明](new-req-phase-6-android-evidence/README.md)。新复现应生成自己的源/工具/设备记录；不能复制旧PASS作为新运行结果。

## Finding、CR和已知限制

[Finding清单](new-req-phase-6-android-evidence/findings.json)包含第3～6步15项及第7步1项复现入口问题，共16项已关闭，开放Android Finding为0；本次发现的阻塞Contract CR为0。
主要问题包括日期精度/int64、缓存冒充当前状态、首材续传使用旧回执、JSON错误分类、构造请求未被局部拦截、Android正则/DNS、系统栏遮挡及截图时序。修复发生在源配置、Mapper、Mock与验证工具，不改协议或业务规则。
旧失败输出和原始PENDING状态保留；本次接收记录补充其后发生的设备验证与用户确认，不重写历史结果。

继承问题 `VALIDATION_SCRIPT_GATE_SCOPE_MISMATCH`：Phase5 `verify_release.py --require-published` 仍把已明确后移的 Backend7.0 接收人算作当期门禁，旧脚本直接检查当前工作区还会因正常推进后的STATUS字节改变而失败；固定发布快照的一致性检查通过。用户作为Contract Owner在另行授权的工具维护任务对齐该检查；本次未降低断言或改Contract。它不单独阻塞6A/6B；真实新协议缺陷仍按CR处理。Backend7.0实际选型兼容门禁保留，未通过不得进7.1。

第7步F6A-07-01已修复：Android主机入口先核验当前所有不可变发布输入，唯独发布时STATUS从完整入场Commit `2ba9355e38373b8d2350eb8efe4071048337c320` 取原字节，再在外部显式快照运行未经修改的Phase5校验器。两份STATUS哈希均记录；当前状态不冒充旧发布产物。5项回归证明当前状态推进可通过，但Contract、fixture、manifest或历史STATUS篡改仍拒绝。修复仅涉及主机验证入口与新增辅助/测试脚本；完整重跑主机/构建，比较编译产物后沿用第6步设备证据，不重写旧结果。

未执行正式App完整构建/迁移、所有支持的Android版本、真实后端鉴权/事务/学校日历/上传/OCR/计时恢复、全出口缓存通知隐私、生产E2E或Web/6C。前端 `canAttempt` 只是允许尝试，不能替代服务器身份、所有权、当前模式、截止点、媒体及并发检查。不能据此保证产品零Bug。

## Legacy与后续责任

以下均非“本次漏修的新协议Bug”。Android执行和跟踪Owner为用户；涉及Backend的实现Owner/Reviewer在7.0入场时具名，不能用未具名掩盖验收。

| 库存或未实施项 | 接收阶段 / 验收要求 |
|---|---|
| 正式App的旧3.0 snapshot、手写DTO、Gson/Gateway及旧错误/Endpoint | 用户负责Phase8迁移实际网络链路与页面；以1.3原始字节和Phase6严格校验方案验收，不能仅替换版本文本 |
| `app/build.gradle.kts` 历史 `phase5ga` 仍锁1.2.0 /667ae… | 用户在Phase8整合旧构建/测试入口。本次隔离验证不关闭旧门禁，不声称全App可构建；历史5A/5GA不是新版Phase5/6编号 |
| 旧立即VALID、小时/状态兼容与缓存当前状态 | Phase8消费新计时、审核与检查点事实；不得在客户端推断终局或把1199/1200四舍五入显示100%当作达标 |
| 历史学生成绩/排名/备注入口、旧 `getOwnFinalGrade` 建议 | Phase8按已接受1.3业务删除或隔离全部学生出口；Phase9验证缓存/通知/导出。旧库存文件中的“应迁移学生成绩”已失效，不能复活进新Contract |
| 真正首材上传/同批续传/补证、OTP入班、并发幂等及错误恢复 | Backend7实现服务器门禁，用户Phase8接实际命令链，Phase9E2E；本次补证Mock只证明限定命令样例，不覆盖完整媒体生命周期 |
| 正式41页导航、权限变化、离线/缓存和系统版本兼容 | 用户Phase8接入完整产品；Phase9按设备矩阵与E2E验收；现有验证页不是可上线App |
| DEV_ONLY add-sixty-minutes等、旧Mock/TODO/占位 | 用户Phase8清点删除或限制正式入口；本次增加的验证Mock须保持验证用途，不能连真实域名或数据 |

原 [历史Legacy库存](android/legacy-migration-findings.md)保留作线索，其中旧CR、学生成绩、立即有效和旧编号不代表当前待办或权威要求。当前四份业务正文与1.3Contract优先。本次未修改业务、Contract、Web、Backend、数据库、部署或旧仓库。

## 分开审核，再进入6C

1. 用户提交本Android分支并建立到main的PR；上传后固定完整交付SHA、确认diff仅允许范围及原始字节，再由用户执行GitHub审核/合并。此处尚无交付Commit，禁止预填为基线SHA。
2. 另起已获授权的Web审查，固定PR#11实际最新完整HEAD、基线、Contract Version/Status/SHA；核验甘洛夷交付及证据，所报完成不等于已接受。两端不捆绑一个审查结论。
3. 两端各自接受后，由用户主持6C：对齐同一SHA、相同输入的状态/日期/null/union/错误码/只读/隐私、P01～04与原链/截止点/学校SLA；汇总真正跨端Finding，关闭阻塞CR，登记Legacy Owner与目标阶段。只比较计数不能证明两端语义一致。
4. 6C完成并获用户阶段验收，才可宣布Phase6 DONE、解锁Phase7.0；后续Backend7.0兼容未通过仍不能进7.1。不得因为6A完成而直接开始后端实现或上线。

main的共享 `STATUS.md` 可能随Web合并变化。发布脚本若发现基线变化应停下做定向合并核验，保留两端真实记录；禁止强推或用旧状态覆盖Web成果。GitHub操作继续由用户完成。
