# 原计划第 13 步：自动测试和本地构建

日期：2026-09-05。Phase 2 / Android 学生端 UI。

**R10 本地自动验证：COMPLETE。JVM、Lint、Debug 与 AndroidTest 构建均通过；R11 指定真机回归随后通过。整体交付仍有明确限制，因为设备 instrumentation、未触发页面/七态、Reviewer 签认和 Release APK 产物检查尚未完成。**

这不是 Backend、接口或完整业务测试通过，也不是 41 页七态全部通过。第 12 步登记的 UI/业务缺口继续保留。

## 1. 基线与保护

- Git 根：`D:\DT\soprts\start3\worktrees\phase2-android-student-ui`。
- Android 根：上述目录下 `BNBU-ANDROID`。
- 分支：`codex/phase2-android-student-ui`。
- 当前 HEAD：`f39c29dad2ddd3c2eb1d5924cff67d2ff825601d`；R3—R10 工作树改动均未提交。
- origin：`https://github.com/chchaiai/new_need_version_sports.git`。
- 已读根 AGENTS.md、STATUS、第 12 步 handoff、实施范围和现有相关测试；Android/设计包未发现下级 AGENTS。
- 本轮开始保存了 91 个已有差异文件的 SHA-256 快照，保护既有未提交内容。
- main 克隆仍 clean；Web 离线交付仍为 `74b616653cbae36670c8c9b284c240be7438d480` / 635 个默认状态项，未上传 GitHub；Mac 附属 pack 索引警告未清理。
- Week 9 仍为 `9506a8a491d091ff9be4936995b92184c007fc11` / 35 个未提交状态项；没有清理、stash、reset、删除、回退或覆盖。
- Contract 仍为 `1.2.0-contract` / RC。OpenAPI SHA-256：`667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`，执行前后相同。

## 2. 原计划第 13 步实际执行（历史）

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

## 3. 原计划第 13 步补充的自动覆盖（历史）

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

## 4. 原计划第 13 步 Lint 与编译警告（历史）

本次 5 个 Lint warning 与此前类型一致，未新增 error：

| ID | 位置 | 内容 |
|---|---|---|
| MutableCollectionMutableState | ExemptionScreen.kt:1054 | 可变集合存入 MutableState |
| DiscouragedApi | core/designsystem/InterfaceText.kt:38 | 资源名反射查找 |
| VectorPath | res/drawable/bnbu_emblem.xml:10 | 过长矢量路径 |
| VectorPath | res/drawable/ic_launcher_foreground.xml:15 | 过长矢量路径 |
| TypographyDashes | res/values/strings.xml:134 | 短横线排版建议 |

另有既存 Kotlin/Compose 弃用、旧网络类型兼容性、OpenAPI 生成器与 Gradle 弃用提示，以及部分 native 库无法 strip 的打包提示。不能将“0 Lint error”写成“全流程零警告”。本轮没有为消除这些提示修改生产源码、图标或依赖。

## 5. 原计划第 13 步产物（已失效）

| 产物 | 字节数 | SHA-256 |
|---|---:|---|
| app/build/outputs/apk/debug/app-debug.apk | 25,795,039 | e5cf24ad6b6ef6c1bc4d43c25e68947c4104296f2d01f03133f4763a599cc7f1 |
| app/build/outputs/apk/androidTest/debug/app-debug-androidTest.apk | 976,168 | d9a4550038b04114129ce04409e73aa87595cf2bf77363ea6a09da0fdb7d7d8e |

这些是原计划第 13 步历史指纹，不得用于 R11。当前 R10 指纹见后文，并已同步到 [人工复测指南](../phase-2/android/p2a-student-ui/manual-acceptance-guide.md) 和 [记录](../phase-2/android/p2a-student-ui/manual-acceptance-record.md)。

第 11 步历史包 SHA `365f2ea62f41e1a427979abe4da286d708e860cc64827cd5b3278c63f63d0a12` 不再作为当前源码的验收依据。R10 候选后来已由用户传至自有真机并全新安装；设备端未独立计算指纹，证据边界见人工验收记录。

## 6. 未完成验证与 Release 缺口

### S13-DEVICE-01：设备 Compose 导航未执行

本步没有启动 Android Studio、模拟器、真机，未运行 connectedDebugAndroidTest。14 项 instrumentation 仅编译，其中 9 项 CoreJourney 的实际结果均为 NOT_RUN。

CoreJourney 的既有 setup/teardown 会清空被测 App 本地状态。以后执行前必须确认使用可重置、没有历史数据/手工评审草稿的专用测试安装；不能直接在 Week 9 或留有评审证据的安装上执行。用户手工测试仍在原计划第 14 步，设备自动化另行确认时再由 Codex 运行。

### S13-RELEASE-01：R8 已关闭源码隔离，Release 产物检查仍阻塞

R8 将运行时评审数据集中到 `app/src/debug/.../feature/review/LocalReviewUiFixtureProvider.kt`：一次补证任务、帮助文章和原始耐力样例只由 Debug provider 创建；Staging/Release 同名 provider 分别返回 `null` 或空列表。两处包含虚构课程、教师、日期和维护时间的 Compose Preview 也移入 Debug source set。通用页面、状态模型和“这是评审样例”的防误导文案仍保留在 main，它们不是学生记录或服务器结果。

构建变体门禁现检查：main 不含上述运行时 payload 或 `@Preview`；Debug 含明确合成样例；Staging/Release provider 不构造 `HelpArticleContent`、补证任务或耐力结果。该门禁是源文件证据，不是 Release APK 反编译证明。

R8 没有构建/检查 Release APK。Release 构建仍要求真实 HTTPS 配置、Firebase 配置与外部签名材料；不读取或索取真实密钥，不绕过正式构建门禁，也不把 Debug 改成伪 Release 验证。故 `S13-RELEASE-01A`（源码隔离）关闭，`S13-RELEASE-01B`（正式产物检查）继续由发布环境负责人关闭。

R8 增量验证命令：`gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest`。结果为 **BUILD SUCCESSFUL in 2m 28s**；431 项 JVM 测试全部通过，0 failure / error / skipped；Lint 0 error / 5 个既存 warning；Debug APK 和 AndroidTest APK 均编译成功。AndroidTest 没有在设备运行。源集扫描结果为 main 中 `@Preview` 文件 0、已迁移运行时 fixture 特征 0；Contract SHA-256 保持不变。Debug APK SHA-256 为 `0005e4a013a2053ebf97ba95b1445ce54b1139a2b21ed38765d9f1ac442710f0`，仅为 R8 中间构建，不替代 R10 最终候选。

### S14-DEVICE-01：R9 启动可见状态源码门禁

R9 将 Android 系统 Splash 的条件缩小为“首个 Compose 画面已完成布局”。会话恢复、隐私检查和首次系统模式请求继续按原安全边界执行，但等待期间显示双语 Loading；首次系统模式请求失败显示双语 Error 和 Retry，失败分支不调用 fallback、也不自动进入 NORMAL。

Debug 的 source-set provider 非空时，错误页还会显示“本地 UI 评审”入口并加载明确标识的合成学生；Staging/Release provider 为 `null`，不显示该入口。真实系统模式、服务地址、超时和 Contract 均未更改。

R9 聚焦验证命令：`gradlew.bat :app:testDebugUnitTest --tests 'edu.bnbu.student.mvp.StartupReadinessTest' --tests 'edu.bnbu.student.mvp.feature.ui.StartupGateStaticPolicyTest' :app:compileDebugAndroidTestKotlin --no-daemon --offline`。最终结果为 **BUILD SUCCESSFUL in 40s**；聚焦 JVM 8/8，0 failure / error / skipped；Debug 与 AndroidTest Kotlin 编译通过。新增 Loading 和 Error/Retry Compose instrumentation 场景只完成编译，未在设备运行。

### R10：V8.1 复审后完整本地自动验证

最终命令：`gradlew.bat :app:testDebugUnitTest :app:lintDebug :app:assembleDebug :app:assembleDebugAndroidTest --no-daemon --offline`。首次运行发现 R9 新增整数 Compose state 的 1 条 `AutoboxingStateCreation` information；改用 `mutableIntStateOf` 后执行相同完整命令复跑，最终结果为 **BUILD SUCCESSFUL in 2m 13s**。

| 项目 | R10 最终结果 | 边界 |
|---|---|---|
| Debug JVM | 437 tests / 78 suites；0 failures、0 errors、0 skipped | 全量本地 JVM；不是 Backend 或设备测试 |
| Lint Debug | 0 errors、5 个既有 warnings、0 informational | 新增 information 已消除；5 个 warning 类型与此前一致 |
| Debug APK | 27,459,431 bytes；SHA-256 `a2c6a49a5e54830cec3b123ee3ebe03a7ceb4ea28dc3b1291687f5f20c97ecdb` | R11 已由用户在自有真机全新安装并完成指定回归；设备端未独立计算指纹 |
| AndroidTest APK | 997,437 bytes；SHA-256 `3aac4e39ce7666836f9e25c0e9638bae031b9b41d01209b0b26dbb9db52ef62c` | 19 项 instrumentation 源码已编译，未在设备运行 |
| APK 签名/元数据 | v2 debug 签名验证通过；`edu.bnbu.student.mvp.debug` / `0.1.0-mvp-debug` / minSdk 26 / targetSdk 35 / debuggable | 不是生产签名或发布批准 |

R10 后续范围核查：Contract SHA-256 保持 `667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`；禁止路径为 0；`git diff --check` 通过。R11 由用户在自有真机安装主 Debug APK并完成指定手工回归，AndroidTest APK 未用于手工评审、也未在设备执行。

### 其他继续保留的缺口

- 第 12 步的异常态、评审入口、安全草稿、配色与实际无障碍问题；
- 没有 Backend，旧运动门槛、材料限制、服务器截止与上传恢复仍待后续阶段；
- Owner / Android Reviewer / Web Reviewer 尚未具名；
- 不把已通过 JVM 门禁当作 Reviewer 签认、全业务或跨端一致性通过。

## 7. 原计划第 13 步的历史修改文件

以下清单只追溯原计划第 13 步，不代表 R3—R10 的完整差异。

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

## 8. R10 结束声明与下一步

- R10 只消除了 R9 新代码的一条 Lint information 并执行完整验证；R3—R9 的 UI 改动按各自 handoff 追溯。Contract、Backend、Web、业务正文、数据库和部署配置未改。
- STATUS：按用户要求未改，仍由指定汇总人维护。
- 旧 API：仍存在，本轮未新增或修改。
- Mock/样例：已有客户端隔离测试和 debug 合成数据继续存在；新增测试只用虚构输入，没有新增生产 Mock、TODO 或空接口。
- Git：没有 commit、push、PR、合并或外部操作。
- R10 当时停在本地验证结果汇报；用户随后明确开始 R11，并完成指定真机回归。

R11 结果见更新后的人工验收记录；上述缺测与发布阻塞继续保留，不把构建成功、指定真机回归或本地评审样例等同于完整业务验收。Commit、Push 和 PR 更新仍由用户手动执行。
