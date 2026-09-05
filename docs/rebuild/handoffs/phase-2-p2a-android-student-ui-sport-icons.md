# P2A Android 学生端 UI：九类运动图标资源

交付日期：2026-09-05  
原 15 步计划：第 9 步  
分支：`codex/phase2-android-student-ui`  
固定基线：`49d992a1333294ea561923cfea0b7d25864a4d91`  
设计版本：`P2A-UI-2026.09.04-draft1`  
业务版本：v8.0  
Contract：`1.2.0-contract` / `RC`  
OpenAPI SHA-256：`667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`

## 1. 完成状态

**DONE（第 9 步九类运动图标与选择控件无障碍语义）；Phase 2 Android 全量交付仍为 PARTIAL。**

本步将运动选择网格中混用的 Material 图标与两个旧自制图标统一为九个独立 Android VectorDrawable。运动值、中文/英文名称、顺序和三列布局没有变化；没有修改计时、课程运动推断、材料、提交、Contract、Backend、Repository 或核心业务模型。

Web 参考来自未上传 GitHub 的 Mac 离线交付，固定本地 HEAD `74b616653cbae36670c8c9b284c240be7438d480`。其 `frontend/student/js/screens/checkin.js` 定义九类运动，其 `frontend/student/js/icons.js` 提供 24×24 圆角线性语义图形。本步将相同运动语义适配为 Android 24dp 矢量资源；按领导确认，不要求像素级一致。

## 2. 九类资源映射

| wire / UI value | 中文 | English | Android 资源 |
|---|---|---|---|
| `running` | 跑步 | Running | `ic_sports_running.xml` |
| `basketball` | 篮球 | Basketball | `ic_sports_basketball.xml` |
| `football` | 足球 | Football | `ic_sports_football.xml` |
| `badminton` | 羽毛球 | Badminton | `ic_sports_badminton.xml` |
| `table_tennis` | 乒乓球 | Table tennis | `ic_sports_table_tennis.xml` |
| `swimming` | 游泳 | Swimming | `ic_sports_swimming.xml` |
| `fitness` | 健身 | Fitness | `ic_sports_fitness.xml` |
| `cycling` | 骑行 | Cycling | `ic_sports_cycling.xml` |
| `other` | 其他 | Other | `ic_sports_other.xml` |

未知课程名称仍沿用既有课程运动推断回退：显示课程提供的名称，并使用“其他”语义图标。本步没有新增或改变运动类别，也没有将图标选择视为服务端业务事实。

## 3. 交互与无障碍

- 每个运动选项继续显示可见的中英文当前语言名称；图标为同一控件内的装饰图形，不重复朗读。
- 选择控件向无障碍服务暴露 `RadioButton` 角色、当前 `selected` 状态和“选择某运动 / Select …”操作标签。
- 每个选项增加稳定的 `checkIn.sport.<value>` 测试标签，供后续 Compose UI 人工/自动验收定位。
- 选中颜色、圆形图标容器、最小 88dp 卡片高度与三列布局保持不变。

## 4. 本步修改文件

```text
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseCheckInScreen.kt
BNBU-ANDROID/app/src/main/res/drawable/ic_sports_running.xml
BNBU-ANDROID/app/src/main/res/drawable/ic_sports_basketball.xml
BNBU-ANDROID/app/src/main/res/drawable/ic_sports_football.xml
BNBU-ANDROID/app/src/main/res/drawable/ic_sports_badminton.xml
BNBU-ANDROID/app/src/main/res/drawable/ic_sports_table_tennis.xml
BNBU-ANDROID/app/src/main/res/drawable/ic_sports_swimming.xml
BNBU-ANDROID/app/src/main/res/drawable/ic_sports_fitness.xml
BNBU-ANDROID/app/src/main/res/drawable/ic_sports_cycling.xml
BNBU-ANDROID/app/src/main/res/drawable/ic_sports_other.xml
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/checkin/ExerciseSportGridLayoutTest.kt
docs/rebuild/handoffs/phase-2-p2a-android-student-ui-sport-icons.md
```

## 5. 自动验证

```text
定向 ExerciseSportGridLayoutTest  PASS
:app:compileDebugKotlin             PASS
:app:testDebugUnitTest             PASS — 380 tests / 0 failures / 0 errors / 0 skipped
:app:lintDebug                     PASS — 0 errors / 5 warnings
:app:assembleDebug                 PASS
git diff --check                   PASS
```

Lint 的 5 项仍为此前已记录的 1 项豁免页面可变集合状态、1 项设计系统资源反射、2 项既有矢量路径与 1 项字符串短横线 warning；本步九类图标未新增 Lint issue。

APK：`BNBU-ANDROID/app/build/outputs/apk/debug/app-debug.apk`  
大小：`26,720,739` bytes  
SHA-256：`365f2ea62f41e1a427979abe4da286d708e860cc64827cd5b3278c63f63d0a12`

## 6. 人工验收待办

由用户在 Android Studio 模拟器和真机完成：

- 中文与英文下九个名称、图标与三列顺序；
- 浅色/深色主题中未选中与选中颜色、图标清晰度和小屏换行；
- 自主运动九项切换、课程运动单项展示与未知课程“其他”图标回退；
- 大字体、显示缩放、TalkBack 焦点顺序、角色、已选中状态和操作标签；
- 旋转或进程恢复后选择状态的实际表现。

这些人工测试尚未由本轮执行；资源编译和单测通过不能表述为完整 UI 或业务验收通过。

## 7. 缺口与风险

| 编号 | 证据 | 影响 | 当前处理 |
|---|---|---|---|
| `PENDING-P2A-I-01` | 模拟器/真机视觉、深色主题、大字体与 TalkBack 尚未由用户执行 | 不能完成设计 Reviewer 的人工验收 | 提供上方清单，等待用户在后续验收步骤执行 |
| `PENDING-P2A-BE-01` | 当前没有新 Backend，Android 仍保留旧核心与接口 | 只能验证图标选择 UI，不能验证正式打卡会话或提交 | 不用 Mock 关闭缺口；留给后续 Backend/Contract 接入阶段 |
| `PENDING-P2A-OWNER-01` | Android Owner、Android Reviewer、Web 跨端 Reviewer 真实姓名仍未填写 | 不能完成正式 Reviewer 签字 | 等待用户或领导提供 |

本步没有发现新的业务规则矛盾。Web 与 Android 允许按平台采用不同矢量实现，但九类业务含义、状态值、标签和顺序一致。

## 8. 结束项

- 是否修改业务规则：**否**
- 是否修改 Contract：**否；SHA-256 保持固定值**
- 是否修改 Backend / 数据库 / 部署 / Web：**否**
- 是否存在旧 API：**是；项目原有旧 API 仍在，本步未新增或修改**
- 是否存在 Mock、TODO、空接口：**本步未新增**
- 是否更新 `docs/rebuild/STATUS.md`：**否；按领导要求由指定汇总人维护**
- 是否提交、推送或创建 PR：**否**
- 下一阶段前置条件：**用户明确说“开始第十步”；不得提前进入后续步骤**
