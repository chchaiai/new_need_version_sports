# P2A Android 学生端 UI：自动测试与策略门禁

- 交付日期：2026-09-05
- 原 15 步计划：第 10 步
- 分支：`codex/phase2-android-student-ui`
- 固定基线：`49d992a1333294ea561923cfea0b7d25864a4d91`
- 设计版本：`P2A-UI-2026.09.04-draft1`
- 业务版本：v8.0（历史执行记录）
- Contract：`1.2.0-contract` / `RC`
OpenAPI SHA-256：`667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`

## 1. 完成状态

**DONE（第 10 步自动测试与策略门禁）；Phase 2 Android 全量交付仍为 PARTIAL。**

本步没有修改生产 UI 或业务实现。它更新了一个已经与第五步正式扫码边界冲突的设备测试，并新增两组 JVM 静态策略测试，集中保护第 0—9 步的学生端 UI 规则。

旧 `CoreJourneyUiTest.scanEntry_offersAnIsolatedSimulatedSuccessPreview` 仍期待正式扫码页出现 `courseJoin.scan.simulateSuccess`，但第五步已按 v8.0 删除该路径。本步将其更新为：正式扫码页不存在模拟成功入口；点击手动输入后进入独立邀请码页；未查询服务器前不得进入确认页。

## 2. 测试门禁覆盖

| 既定重点 | 自动证据 |
|---|---|
| 禁止学生成绩披露 | 可达首页、课程、记录、原始耐力、通知、我的页面不得引用旧分数/总评/排名字段；主导航不得恢复“成绩”或旧耐力换算入口 |
| 分钟口径 | 既有 `CheckInHoursPresentationPolicyTest`、进度模型测试与运动 UI 策略测试继续验证 1,200 分钟、实际/可计/计入三种分钟和 30/45/60 门槛 |
| `PENDING → 已退班` | 新策略门禁核对唯一显示投影及 Profile/账户详情复用该投影 |
| 提交/受理不等于有效 | 运动提交与补充结果必须显示待检查/待复核、最终仍可能有效或无效，不得出现假“打卡成功/审核通过” |
| 九类运动图标 | 第九步 `ExerciseSportGridLayoutTest` 继续验证九资源、三列布局、选择角色和 selected 语义 |
| 页面/状态可达性 | 新策略门禁验证 41 个 `PAGE-STU-*`、七状态词汇、五个底部标签、关键 SubScreen、运动证据/提交/恢复与新增页面连接 |
| 无演示成功进入正式路径 | Scan 源码和设备测试都禁止模拟成功；一次补充评审只在本地评审模式开放、写入禁用并明确不会生成成功记录 |

静态策略测试用于阻止源码回退，不能替代 Compose 实际渲染、TalkBack、导航和设备生命周期测试。

## 3. 本步修改文件

```text
BNBU-ANDROID/app/src/androidTest/java/edu/bnbu/student/mvp/CoreJourneyUiTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/ui/StudentUiForbiddenCopyPolicyTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/ui/StudentUiPageStatePolicyTest.kt
docs/rebuild/handoffs/phase-2-p2a-android-student-ui-test-policy.md
```

## 4. 自动验证

```text
新增策略测试（8 项）              PASS — 8/8
:app:compileDebugAndroidTestKotlin PASS
:app:assembleDebugAndroidTest      PASS
:app:testDebugUnitTest             PASS — 388 tests / 0 failures / 0 errors / 0 skipped
:app:lintDebug                     PASS — 0 errors / 5 warnings
:app:assembleDebug                 PASS
git diff --check                   PASS
```

第一次定向执行时，1 项新断言因期待了补充结果页中不存在的固定句式而失败。核对页面后确认实际 UI 已通过“等待责任教师复核”“最终仍可能有效或无效”“没有第二轮补充”表达正确业务边界，因此修正测试为验证这三项语义，没有为了测试修改生产文案。最终定向和全量结果均为 PASS。

Lint 的 5 项仍为此前已记录的 1 项豁免页面可变集合状态、1 项设计系统资源反射、2 项既有矢量路径与 1 项字符串短横线 warning，没有新增 error 或 warning。

- 主 APK：`BNBU-ANDROID/app/build/outputs/apk/debug/app-debug.apk`
- 大小：`26,720,739` bytes
SHA-256：`365f2ea62f41e1a427979abe4da286d708e860cc64827cd5b3278c63f63d0a12`

- AndroidTest APK：`BNBU-ANDROID/app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk`
- 大小：`974,028` bytes
SHA-256：`d3b29de2cd542e01132404bbed1e815bcd05957d8853912f5486f7a923f18d81`

主 APK 与第九步相同，因为第十步没有修改生产源码或资源。

## 5. 未执行测试

本轮没有启动 Android Studio 模拟器或真机，也没有执行 `connectedDebugAndroidTest`。设备测试由用户负责，因此本步只编译并打包 AndroidTest APK；不能把 instrumentation 源码编译成功表述为 6 项设备测试已通过。

用户后续至少需要执行：

- 正式登录页只显示服务器支持的入口；
- 正式扫码页无模拟成功，手动输入进入独立邀请码页；
- 强制邮箱绑定不能越过激活门控；
- 入班确认表单只含已确认的性别选择且初始提交禁用；
- 已验证邮箱换绑页面；
- 免测详情图片材料展示。

第 0—9 步 handoff 中列出的完整模拟器/真机视觉、深色主题、大字体、TalkBack 和返回/恢复场景仍须另外人工执行。

## 6. 缺口与风险

| 编号 | 证据 | 影响 | 当前处理 |
|---|---|---|---|
| `PENDING-P2A-T-01` | AndroidTest APK 已编译，但没有连接设备执行 | 不能确认实际 Compose 导航、权限、焦点和渲染行为 | 由用户在模拟器/真机阶段运行并保留结果 |
| `PENDING-P2A-BE-01` | 当前没有新 Backend | 无法验证真实加载、权限、入班、上传、审核或中断恢复 | 测试只保护 UI 边界，不用 Mock 宣称功能通过 |
| `RISK-P2A-T-01` | 静态策略测试依赖受控源码标识和文案语义 | 可阻止明显回退，但不能证明所有运行时组合 | 后续 Reviewer 与设备验收必须保留 |
| `PENDING-P2A-OWNER-01` | Android Owner、Android Reviewer、Web 跨端 Reviewer 真实姓名仍未填写 | 不能完成正式 Reviewer 记录 | 等待用户或领导提供 |

本步没有发现新的业务规则冲突；发现并清理的是旧测试对已删除模拟成功路径的错误期待。

## 7. 结束项

- 是否修改生产业务规则：**否**
- 是否修改生产 UI：**否**
- 是否修改 Contract：**否；SHA-256 保持固定值**
- 是否修改 Backend / 数据库 / 部署 / Web：**否**
- 是否存在旧 API：**是；项目原有旧 API 仍在，本步没有新增或修改**
- 是否存在 Mock、TODO、空接口：**设备测试使用隔离测试数据；本步未向生产代码新增 Mock、TODO 或空接口**
- 是否更新 `docs/rebuild/STATUS.md`：**否；按领导要求由指定汇总人维护**
- 是否提交、推送或创建 PR：**否**
- 下一阶段前置条件：**用户明确说“开始第十一步”；不得提前进入后续步骤**
