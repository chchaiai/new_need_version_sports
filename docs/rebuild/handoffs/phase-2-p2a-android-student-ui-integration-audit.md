# P2A Android 学生端 UI：第 11 步累计集成与边界审计

日期：2026-09-05  
阶段：Phase 2 / P2A / Android 学生端 UI  
分支：`codex/phase2-android-student-ui`  
基线与当前 HEAD：`49d992a1333294ea561923cfea0b7d25864a4d91`（累计改动尚未提交）  
Contract：`1.2.0-contract` / `RC`  
OpenAPI SHA-256：`667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`

## 1. 本步结论

**第 11 步静态集成审计完成；Phase 2 UI 仍为 PARTIAL，尚未完成人工设计验收、Reviewer 签字或真实业务功能验收。**

本步对第 0—10 步的累计工作执行了路径边界、页面/状态、禁止文案、假成功、本地评审数据、旧 API、Contract 固定性、相关仓库状态和自动构建的集中复核。本步没有修改生产 Compose、资源、测试、Contract、Backend、Web、业务正文或 `STATUS.md`；仅新增本审计 handoff。

## 2. 权威与基线

业务含义继续只以固定 Commit 下四份 v8.0 正文为唯一权威：

- `docs/business/00-overview.md`
- `docs/business/10-student-flow.md`
- `docs/business/20-teacher-flow.md`
- `docs/business/30-admin-flow.md`

P2W 设计交付用于共同页面编号、流程、状态和信息分组；Web 离线交付仅用于视觉层级和学生端呈现参考。旧 Android、旧 Web、旧 Contract、旧 README 和历史 handoff 仍只作迁移证据。

## 3. 写入范围审计

审计时累计改动为 34 个已跟踪文件和 47 个未跟踪文件，共 81 个文件；没有暂存内容。全部位于已批准范围：

| 范围 | 文件数 | 结论 |
|---|---:|---|
| Android `feature/**` Compose/UI 展示模型 | 33 | 在批准范围 |
| Android UI 资源 | 11 | 在批准范围 |
| Android JVM / AndroidTest UI 测试 | 23 | 在批准范围 |
| P2A Android 设计包 | 6 | 在批准范围 |
| P2A Android handoff（本文件写入前） | 8 | 在批准范围 |

以下禁止范围累计差异均为 0：

- `contracts/**`
- `BNBU-Sports-Backend/**`
- `BNBU-Sports-Web-new/**`
- `infra/**`
- `tests/e2e/**`
- `docs/business/**`
- `docs/rebuild/STATUS.md`
- Android `core/model`、`core/data`、`core/network`、`core/exercise`、`core/state`、`core/review`
- 会话 Gateway、Mapper、UploadCoordinator

构建会读取固定 OpenAPI 并在忽略的 `build/` 目录生成代码，但仓库中的 `contracts/openapi.yaml` 未改变；构建后 SHA-256 仍与固定值一致。

## 4. 页面、导航与状态审计

- 页面清单包含 41 个唯一 `PAGE-STU-*` 标识，范围为 `001—010`、`020—025`、`030—035`、`040—043`、`050—052`、`060—061`、`070`、`080—088`。
- 五个主标签仍为“首页 / 课程 / 打卡 / 记录与进度 / 我的”；旧“成绩”主标签没有重新出现。
- 扫码、邀请码、入班确认、独立结果、运动证据、提交/恢复、游泳延迟、原始耐力、一次补充及结果、免测/认证、账户/帮助/反馈等关键二级流程保持接线。
- 设计矩阵继续统一 `NORMAL / LOADING / EMPTY / ERROR / FORBIDDEN / MAINTENANCE / RESUME` 七状态；静态测试确认关键入班和运动页面共同保留这些状态的可达表达。
- 以上是源码和策略门禁结论，不等于 41 页已在模拟器/真机逐页渲染、截图或完成可访问性验收。

## 5. 禁止披露、假成功与评审数据

### 已满足的边界

- 可达学生汇总 UI 未重新引用 `enduranceRunScore`、`totalScore`、`totalDisplay`、`publishedTotalGrade`、`FinalGradePanel` 或 `studentRank`。
- `PENDING` 学生成员状态继续显示“已退班”。
- 运动材料“已受理”和补充材料“已接收”均明确不等于有效、通过或已计入分钟。
- 正式扫码源码不含模拟扫码成功控件、模拟入班信息或本地延时成功。
- 一次补充、入班结果和帮助文章的合成内容只在明确的本地 UI 评审模式出现；页面显示“本地/虚构评审样例、无 Backend、不写入后端”，正式写入保持禁用。
- 本轮 UI 改动没有新增 TODO、FIXME、空 Repository、空 Gateway 或 Fake Success。豁免证明预览中的 `mock://` 是本地图片 URI 类型判断，不是业务成功路径。
- 对本轮 81 个改动文件进行敏感值形态检查，没有发现私钥块、GitHub Token、OpenAI 风格 Token、腾讯云 SecretId 或 JDBC 连接串。

### 仍不能证明的事项

- 静态源码检查不能证明所有运行时组合都不会因旧缓存或旧接口返回而显示不完整信息。
- 本地评审模式只能用于设计评审，不能作为接口、持久化、权限、并发或审核结果证据。

## 6. 已知缺口、冲突与移交方向

| 编号 | 证据与现状 | 影响 | 当前处理 / 后续 Owner |
|---|---|---|---|
| `PENDING-P2A-BE-01` | 领导确认当前完全没有新 Backend；现有正式页面仍有旧 V1 API/Repository 调用 | 真实加载、写入、权限、并发、上传、审核和恢复均无法验收 | Phase 2 只完成 UI；留给后续 Contract/Backend/Android 接入阶段 |
| `PENDING-P2A-CONTRACT-01` | 固定 Contract 未完整表达 v8.0 的分钟、审核、补充版本、邀请宽限、游泳截止、耐力日期、认证分配和通知投影 | UI 展示模型不能作为正式 wire schema | Android 不修改 Contract；由 Contract Owner 发布后续版本 |
| `PENDING-P2A-JOIN-CONTRACT-01` | 聚合 Contract、Android 旧入班快照与 v8.0 入班结果/宽限语义不一致 | 正式扫码、邮箱 proof、预览和结果未知处理不能集成完成 | 保留独立结果 UI；后续按权威 Contract 迁移 |
| `RISK-P2A-EXERCISE-01` | 旧核心会话仍含小于 60 分钟清理、2 小时上限和旧 0/1/2 小时计入逻辑 | 运行时业务行为尚不符合 v8.0 的 30/45/60 门槛及最多计入 60 分钟 | UI 只显示 v8.0 规则，不改核心；后续领域/接口阶段处理 |
| `RISK-P2A-MEDIA-01` | 旧媒体核心仍以 8 MB 为主，且缺少运动证据 6 图 + 1 MP4、图片 10 MB、视频 100/250 MB、版本/锁定批次/游泳阶段完整字段 | UI 限制和真实上传校验可能不一致 | UI 已按 v8.0 表达；后续 Contract、上传和媒体阶段处理 |
| `RISK-P2A-SUPPLEMENT-01` | 没有一次补充任务、截止、原因、版本、唯一机会和受理接口；固定退回原因分类也未最终确认 | 只能展示明确标识的评审态，不能完成提交 | 不创建客户端枚举，不制造第二机会；等待业务/Contract 确认 |
| `RISK-P2A-PROGRESS-01` | 进度仍从旧小时聚合和旧成绩容器读取后在 UI 层安全投影；旧成绩 DTO/页面文件仍在树中但不可达 | 数据口径仅为过渡适配，不能视为服务端事实 | 保持禁止披露门禁；后续改为正式分钟投影 |
| `BLOCK-P2A-PUSH-01` | Android Manifest、Firebase 依赖、FCM 注册/服务仍启用系统 Push，而 v8.0 只允许站内通知 | 当前 App 行为和隐私披露无法同时满足目标规则 | 需领导建立独立的 Push 移除任务；不在 UI 阶段越界处理 |
| `BLOCK-P2A-PRIVACY-01` | 现有双语隐私政策仍含 FCM、旧成绩/申诉和待定正式公示字段，英文版本待法律审阅 | 不能作为最终发布法律文本验收 | 由正式运营/隐私负责人给出确认文本、版本和生效日期，Android 只展示确认稿 |
| `CROSS-P2A-WEB-01` | Web 来自未上传 GitHub 的 macOS 压缩包，且其审计仍记录旧时长、提交即有效、重提/Push 等遗留冲突 | 不能把 Web 旧逻辑当业务权威，也暂时没有可引用的 Web PR Commit | Android 只参考其视觉和已评审信息分组；跨端 Reviewer 后续核对差异 |
| `PENDING-P2A-OWNER-01` | Android Owner、Android Reviewer、Web 跨端 Reviewer 仍是占位符 | 阻塞正式设计签字和 PR Reviewer 记录 | 等用户或领导提供真实姓名 |

## 7. 相关仓库保护快照

| 仓库 | 分支 / HEAD | 状态 | 本步动作 |
|---|---|---|---|
| Phase 2 任务 worktree | `codex/phase2-android-student-ui` / `49d992a…` | 审计前 34 tracked + 47 untracked，0 staged | 只读审计、构建并新增本 handoff |
| 聚合仓库主克隆 | `main` / `49d992a…` | clean | 未修改 |
| Web 离线交付 | `codex/web-ui-local-preview` / `74b6166…` | 1 tracked + 634 untracked（macOS AppleDouble 等） | 未修改、未清理 |
| Week 9 Android | `fix/android-contract-4.0.1-alignment-20260827` / `9506a8a…` | 34 tracked + 1 untracked，共 35 项 | 未修改、未 reset/clean/stash/回退/覆盖 |

## 8. 第 11 步自动验证

执行范围：

```text
:app:testDebugUnitTest
:app:compileDebugAndroidTestKotlin
:app:assembleDebugAndroidTest
:app:lintDebug
:app:assembleDebug
git diff --check
```

真实结果：

- JVM：73 个 suite、388 个 test，0 failure、0 error、0 skipped。
- AndroidTest Kotlin 编译及测试 APK 组装：通过；没有连接设备执行。
- Lint：0 error、5 warning；分别为 `DiscouragedApi` 1、`MutableCollectionMutableState` 1、`TypographyDashes` 1、`VectorPath` 2，未发现新增阻塞错误。
- Debug 构建：通过。
- `git diff --check`：通过。
- 主 Debug APK：`26,720,739` bytes，SHA-256 `365f2ea62f41e1a427979abe4da286d708e860cc64827cd5b3278c63f63d0a12`。
- AndroidTest APK：`974,028` bytes，SHA-256 `d3b29de2cd542e01132404bbed1e815bcd05957d8853912f5486f7a923f18d81`。

首次命令因当前 PowerShell 进程未配置 Java 而未进入 Gradle，第二次因未配置 Android SDK 而在依赖解析前停止；随后仅对构建进程设置 Android Studio 自带 JDK 和本机 SDK 路径，完整命令成功。两次环境失败都不是源码测试失败，也没有修改系统环境或项目配置。

## 9. 未执行与验收边界

- 未在模拟器或真机运行 AndroidTest。
- 未做逐页中英文、浅色/深色、大字体、横屏、TalkBack、键盘、系统返回、相机、麦克风、文件选择和权限拒绝测试。
- 未接入 Backend，未做 API、上传、持久化、权限、并发、中断恢复或端到端业务测试。
- 未生成最终 41 页截图证据，未填写 Reviewer 验收记录。
- 未 commit、push、创建 PR 或合并。

因此本步只能证明当前累计源码通过静态门禁、编译、单测和 Lint；不能表述为 UI 人工验收完成，更不能表述为业务功能通过。

## 10. 下一步建议

按用户再次确认的原 15 步计划，后续顺序固定为：

1. **第 12 步：全局七态和无障碍核查**。逐页核对源码、状态、返回、安全区、主题、布局、字体和无障碍；设备效果留到第 14 步。
2. **第 13 步：自动测试和本地构建**。执行单测、Lint、Debug 构建及相应自动化覆盖核对。
3. **第 14 步：用户模拟器/真机评审**。使用已提前准备的人工验收指南和记录表取证。
4. **第 15 步：交接和 PR 准备**。用户手动提交、Push、创建 PR。

更正说明：本 handoff 原来把人工验收写成第 12 步，属于编号对应错误。已有第 11 步证据保留，不替代原计划第 12—15 步。
