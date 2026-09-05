# 原计划第 13 步：自动测试和本地构建

日期：2026-09-05。Phase 2 / Android 学生端 UI。

**完成状态：PARTIAL。允许在本机、不启动设备的 JVM 测试、Lint、Debug 与 AndroidTest 构建已完成且通过；设备导航测试的实际执行，以及 Release 样例包体隔离尚未验收。**

这不是 Backend、接口或完整业务测试通过，也不是 41 页七态全部通过。第 12 步登记的 UI/业务缺口继续保留。

## 1. 基线与保护

- Git 根：`D:\DT\soprts\start3\worktrees\phase2-android-student-ui`。
- Android 根：上述目录下 `BNBU-ANDROID`。
- 分支：`codex/phase2-android-student-ui`。
- HEAD：`49d992a1333294ea561923cfea0b7d25864a4d91`；前步和本步实现均未提交。
- origin：`https://github.com/chchaiai/new_need_version_sports.git`。
- 已读根 AGENTS.md、STATUS、第 12 步 handoff、实施范围和现有相关测试；Android/设计包未发现下级 AGENTS。
- 本轮开始保存了 91 个已有差异文件的 SHA-256 快照，保护既有未提交内容。
- main 克隆仍 clean；Web 离线交付仍为 `74b616653cbae36670c8c9b284c240be7438d480` / 635 个默认状态项，未上传 GitHub；Mac 附属 pack 索引警告未清理。
- Week 9 仍为 `9506a8a491d091ff9be4936995b92184c007fc11` / 35 个未提交状态项；没有清理、stash、reset、删除、回退或覆盖。
- Contract 仍为 `1.2.0-contract` / RC。OpenAPI SHA-256：`667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`，执行前后相同。

## 2. 实际执行

目录：`BNBU-ANDROID`。使用已安装 Android Studio JBR 和本机 Android SDK，没有升级依赖或安装新工具。

```powershell
.\gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest --no-daemon --offline --no-build-cache --rerun-tasks
```

结果：**BUILD SUCCESSFUL in 4m 14s；88 actionable tasks: 88 executed**。强制重跑且禁用构建缓存，没有将前步 UP-TO-DATE 结果当本轮执行结果。

| 项目 | 实际结果 | 证据边界 |
|---|---|---|
| Debug JVM 单测 | 405 tests / 75 suites；0 failures、0 errors、0 skipped | 来自本次 TEST-*.xml；不是设备或真实服务测试 |
| Lint Debug | 0 errors / 5 warnings | 静态检查，不证明像素、触控或 TalkBack 正确 |
| Debug APK | 构建通过 | 仅编译/打包成功，未安装或运行 |
| AndroidTest APK | 编译/打包通过 | 14 个 instrumentation @Test 未执行；其中 CoreJourney 为 9 项 |
| Debug APK 签名检查 | apksigner verify 通过，v2=true | Debug 签名，不是生产签名或发布批准 |
| 包元数据 | 包名 edu.bnbu.student.mvp.debug，版本 0.1.0-mvp-debug，versionCode=1，targetSdk=35，debuggable | 磁盘 APK 检查，不是设备兼容性验收 |
| git diff --check | 退出码 0 | 对本轮新增文本另行检查尾随空白/冲突标记 |

单测 XML 的本次时间范围为 UTC 2026-09-05 03:01:34.998—03:01:52.473（北京时间 11:01）。Gradle 命令包含代码生成依赖，生成输出仅在 build/generated；没有修改 Contract 源文件或旧 API 绑定。

本地报告（构建输出可能被下次运行覆盖）：

- [JVM 测试报告](../../../BNBU-ANDROID/app/build/reports/tests/testDebugUnitTest/index.html)
- [Lint 报告](../../../BNBU-ANDROID/app/build/reports/lint-results-debug.html)
- XML：`BNBU-ANDROID/app/build/test-results/testDebugUnitTest/TEST-*.xml`
- Lint XML：`BNBU-ANDROID/app/build/reports/lint-results-debug.xml`

## 3. 本轮补充的自动覆盖

新增 17 项 JVM 测试，累计从 388 项增至 405 项；另新增 3 项设备 Compose 测试源码。

| 范围 | 本轮新增 | 验证内容 |
|---|---:|---|
| StudentUiAccessibilityStaticPolicyTest | 9 | 48dp 与换行；根安全区/IME；自适应底栏；维护/错误播报；返回路由；busy 返回不穿透；会话返回不结束；补充 Open 状态编辑；帮助恢复与类别选中语义 |
| StudentUiBuildVariantPolicyTest | 3 | Release 工作区工厂为空；正式构建关闭测试工具；登录评审入口要求 local 环境及工厂 |
| ExerciseReviewUiModelTest | 3 | 整分钟边界（负值、59,999/60,000ms、长时长）；未知状态不捏造计入/有效分钟；实际时长缺失/不足一分钟 |
| SupplementUiModelTest | 2 | 所有非 Open 状态不能提交；Open 仍需写权限和非空说明 |
| CoreJourneyUiTest（设备） | 3 | 邮箱登录系统返回；五个主标签选择与返回首页；一次补充明确预览及两级返回，不执行正式提交 |

源码断言只是回归门禁。例如检查到 41 个 PAGE-ID 或七个状态词，不等于 41 页七态均可达；检查 BackHandler 声明，不等于实际手势或焦点已验证。

既有测试也在本轮真实重跑：

- 禁止分数/排名等旧字段披露、成员状态投影与导航入口；
- 分钟显示与原始耐力结果；
- 通知白名单、提交/受理不等于有效；
- 运动证据 UI 与补充任务状态模型；
- 旧 API/Contract 的隔离客户端与 Mock 测试。

这些测试使用合成输入或隔离 Mock，不构成新 Backend 验收。无真实服务时未发送验证码、未执行真实入班、材料上传、审核或注销。

## 4. Lint 与编译警告

本次 5 个 Lint warning 与此前类型一致，未新增 error：

| ID | 位置 | 内容 |
|---|---|---|
| MutableCollectionMutableState | ExemptionScreen.kt:1054 | 可变集合存入 MutableState |
| DiscouragedApi | core/designsystem/InterfaceText.kt:38 | 资源名反射查找 |
| VectorPath | res/drawable/bnbu_emblem.xml:10 | 过长矢量路径 |
| VectorPath | res/drawable/ic_launcher_foreground.xml:15 | 过长矢量路径 |
| TypographyDashes | res/values/strings.xml:124 | 短横线排版建议 |

另有既存 Kotlin/Compose 弃用、旧网络类型兼容性、OpenAPI 生成器与 Gradle 弃用提示，以及部分 native 库无法 strip 的打包提示。不能将“0 Lint error”写成“全流程零警告”。本轮没有为消除这些提示修改生产源码、图标或依赖。

## 5. 本次产物

| 产物 | 字节数 | SHA-256 |
|---|---:|---|
| app/build/outputs/apk/debug/app-debug.apk | 25,795,039 | e5cf24ad6b6ef6c1bc4d43c25e68947c4104296f2d01f03133f4763a599cc7f1 |
| app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk | 976,168 | d9a4550038b04114129ce04409e73aa87595cf2bf77363ea6a09da0fdb7d7d8e |

Debug BuildConfig：environment=local，BNBU_TEST_TOOLS_ENABLED=false。手工评审使用主 Debug APK，不需安装 AndroidTest APK。候选指纹已经同步到 [第 14 步指南](../phase-2/android/p2a-student-ui/manual-acceptance-guide.md) 和 [记录](../phase-2/android/p2a-student-ui/manual-acceptance-record.md)。

第 11 步历史包 SHA `365f2ea62f41e1a427979abe4da286d708e860cc64827cd5b3278c63f63d0a12` 不再作为当前源码的验收依据。未安装过新包，人工实际安装指纹仍待确认。

## 6. 未完成验证与 Release 缺口

### S13-DEVICE-01：设备 Compose 导航未执行

本步没有启动 Android Studio、模拟器、真机，未运行 connectedDebugAndroidTest。14 项 instrumentation 仅编译，其中 9 项 CoreJourney 的实际结果均为 NOT_RUN。

CoreJourney 的既有 setup/teardown 会清空被测 App 本地状态。以后执行前必须确认使用可重置、没有历史数据/手工评审草稿的专用测试安装；不能直接在 Week 9 或留有评审证据的安装上执行。用户手工测试仍在原计划第 14 步，设备自动化另行确认时再由 Codex 运行。

### S13-RELEASE-01：入口隔离不等于样例包体隔离

已通过的 3 项构建变体静态测试只证明源码中的这些限制：

- debug 工作区工厂位于 debug 源集；
- release 对应工厂为 null，测试工具 flag 为 false；
- 正式登录入口不开放 local 评审操作。

但 `app/src/main/java/edu/bnbu/student/mvp/feature/checkin/SupplementUiModel.kt` 仍定义 `localReviewSupplementTask()` 和合成记录样例，并由主源集 UI 引用。故不能声称“所有演示样例均已物理移出 release 源集”，更不能猜测 R8 一定会删掉它。

本轮没有构建/检查 Release APK。Release 构建还要求正式 HTTPS 配置、Firebase 配置与外部签名材料；不读取或索取真实密钥，不绕过正式构建门禁，也不把 Debug 改成伪 Release 验证。

关闭条件：另行确认 UI 样例源集隔离方案和准确可写路径，完成对应调整，再在授权的发布构建环境检查实际 Release 产物。该项影响发布验收，不阻止当前 Debug UI 人工评审。

### 其他继续保留的缺口

- 第 12 步的异常态、评审入口、安全草稿、配色与实际无障碍问题；
- 没有 Backend，旧运动门槛、材料限制、服务器截止与上传恢复仍待后续阶段；
- Owner / Android Reviewer / Web Reviewer 尚未具名；
- 不把已通过 JVM 门禁当作 Reviewer 签认、全业务或跨端一致性通过。

## 7. 本轮修改文件

没有修改生产源码。

测试：

1. `BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/ui/StudentUiAccessibilityStaticPolicyTest.kt`（新增）
2. `BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/ui/StudentUiBuildVariantPolicyTest.kt`（新增）
3. `BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/checkin/ExerciseReviewUiModelTest.kt`
4. `BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/checkin/SupplementUiModelTest.kt`
5. `BNBU-ANDROID/app/src/androidTest/java/edu/bnbu/student/mvp/CoreJourneyUiTest.kt`

文档：

1. 本 handoff：`docs/rebuild/handoffs/phase-2-p2a-android-student-ui-automated-validation.md`（新增）
2. `docs/rebuild/phase-2/android/p2a-student-ui/manual-acceptance-guide.md`
3. `docs/rebuild/phase-2/android/p2a-student-ui/manual-acceptance-record.md`
4. `docs/rebuild/handoffs/phase-2-p2a-android-student-ui-manual-acceptance.md`

## 8. 结束声明与下一步

- 业务规则、生产 UI、Contract、Backend、Web、数据库、部署配置：未改。
- STATUS：按用户要求未改，仍由指定汇总人维护。
- 旧 API：仍存在，本轮未新增或修改。
- Mock/样例：已有客户端隔离测试和 debug 合成数据继续存在；新增测试只用虚构输入，没有新增生产 Mock、TODO 或空接口。
- Git：没有 commit、push、PR、合并或外部操作。
- 停在第 13 步本地验证结果汇报，不自动进入第 14 步。

用户确认“开始第 14 步”后，可按更新的指南逐页评审当前 Debug UI；上述缺测与发布阻塞继续保留，不把进入人工评审等同于所有门禁已关闭。第 15 步仍是交接/PR 准备，提交、Push、PR 由用户手动执行。

