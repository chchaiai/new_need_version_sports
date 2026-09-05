# P2A Android 学生端 UI：运动、证据、上传恢复与记录

交付日期：2026-09-05  
原 15 步计划：第 6 步  
分支：`codex/phase2-android-student-ui`  
固定基线：`49d992a1333294ea561923cfea0b7d25864a4d91`  
设计版本：`P2A-UI-2026.09.04-draft1`  
业务版本：v8.0  
Contract：`1.2.0-contract` / `RC`  
OpenAPI SHA-256：`667ae751f3e623e3d603db4d68e6e9314d4b3fd6da433a1def8c36b81597d74a`

## 1. 完成状态

**PARTIAL（UI 完成，接口与业务功能未验收）。**

本步覆盖 `PAGE-STU-040—043` 与 `PAGE-STU-050—051` 的 Compose 展示、状态语义和本地草稿/单媒体检查点恢复表达。未修改 Contract、Backend、Gateway、上传协议、服务器计时、计入算法或数据库。当前没有新 Backend，因此不能把编译、单测或 UI 页面视为真实会话、游泳限时受理、审核或计入功能通过。

Web 离线交付固定为 `codex/web-ui-local-preview` / `74b616653cbae36670c8c9b284c240be7438d480`；其中 `2026-09-04-web-v8-compliance-audit.md` 明确把 30/45/60 分钟、提交后审核、游泳前后照与 15 分钟规则列为冲突或缺口。本步只采用 Web 的卡片层级、媒体预览和信息分组，不复制其旧 1/2 小时计算。

## 2. 已完成 UI

### `PAGE-STU-040` 运动会话

- 保留 `ACTIVE ↔ PAUSED → COMPLETED` 的现有页面承载。
- 主计时只显示实际 ACTIVE 时长和完整分钟，不再显示“预计学时”。
- 展示教师开课前配置 30/45/60 分钟门槛、完整实际分钟、单次最多计入 60 分钟。
- 明确日/周/分类/总目标只限制计入，不禁止继续记录真实运动。
- 从可达 Compose UI 移除“直达 2 小时”和“增加 60 分钟”入口；核心旧代码未改。
- 恢复态说明会交叉核对服务器会话与本地媒体草稿，恢复中不冒充已提交。

### `PAGE-STU-041` 证据采集

- 新增首版材料卡：6 张 JPEG/PNG、1 段有声 MP4、照片 10 MB、视频 1—15 秒/100 MB、版本合计 250 MB。
- 材料显示本地草稿、锁定待处理、锁定可用或锁定失败状态。
- 上传前可预览/删除；存在服务器媒体检查点后删除按钮禁用，并说明恢复继续相同文件。
- 游泳显示独立“运动前照片/运动后照片”槽位、2—6 图和禁拍区域提示。
- 当前模型没有前/后阶段字段，因此不把普通照片自动归类，正式游泳提交保持禁用。

### `PAGE-STU-042` 提交、上传与恢复

- 提交前明确“上传开始后锁定，不可删除或替换”。
- 有服务器媒体检查点时显示“继续同一锁定批次”，沿用现有单媒体检查点恢复。
- 上传进度区分锁定、上传、等待受理、上传中断。
- 成功页改为“材料已受理 / 待系统检查”，不再显示“提交成功即已计入小时”。
- 受理状态明确不等于有效、通过或已计入分钟。

### `PAGE-STU-043` 游泳延迟说明

- 新增完全离线延迟说明页和可恢复的 `rememberSaveable` 文本草稿。
- 说明 24 小时、教师异常队列、不会自动通过、不得补造会话/时长/业务日期/前照。
- 因无资格、截止和提交接口，正式提交按钮禁用并展示准确原因；没有 Fake Success。

### `PAGE-STU-050—051` 打卡记录

- 列表和详情改为实际分钟、可计分钟、实际计入分钟与处理阶段。
- `VALID + 0` 单独显示“有效 · 未计入”，不再误标为无效。
- `reviewStatus` 缺失显示“待检查”；未知状态显示“状态待确认”。
- 当前 Contract 未提供可计分钟，页面显示“待提供”，不从本地计时或旧小时字段推算。
- 首版媒体标明只读；公开原因/说明可见，教师内部备注和内部模型分数不展示。
- 移除旧“无效后重新补交/提交链”UI；v8 唯一一次补充留到原 15 步计划第 7 步处理。

## 3. 本步修改文件

```text
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseCheckInScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/CheckInRecords.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/SessionMediaManager.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseEvidenceScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseSubmissionScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/SwimmingDelayExplanationScreen.kt
BNBU-ANDROID/app/src/main/java/edu/bnbu/student/mvp/feature/checkin/ExerciseReviewUiModel.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/checkin/ExerciseReviewUiModelTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/checkin/ExerciseV8UiStaticPolicyTest.kt
BNBU-ANDROID/app/src/test/java/edu/bnbu/student/mvp/feature/checkin/session/AcceptedContractStaticPolicyTest.kt
docs/rebuild/handoffs/phase-2-p2a-android-student-ui-exercise-evidence.md
```

`ExerciseVideoRecorder.kt` 已核对现有 15 秒、有声、暂停不计录制时间和重拍交互，本步不需要修改。`ExerciseSessionState.kt` 与 `ExerciseVideoRecordingState.kt` 未修改。

## 4. 自动验证

```text
:app:compileDebugKotlin   PASS
:app:testDebugUnitTest   PASS — 360 tests / 0 failures / 0 errors / 0 skipped
:app:lintDebug           PASS — 0 errors / 5 existing warnings
:app:assembleDebug       PASS
```

APK：`BNBU-ANDROID/app/build/outputs/apk/debug/app-debug.apk`  
大小：`26,719,092` bytes  
SHA-256：`d13db36604e73816132df1035fd999468251ad40f69c259bb71f0bd80fba25cd`

Lint 的 5 项均位于既有豁免/设计系统/矢量与字符串文件，不在本步新增的运动 UI 文件中。

## 5. 明确缺口与冲突

| 编号 | 证据 | 影响 | 当前处理 |
|---|---|---|---|
| `GAP-P2A-D-01` | `ExerciseSessionState.kt` 仍是未满 60 分钟清除、2 小时封顶和 0/1/2 小时旧算法 | 实际结束行为不能按 v8 验收 | 核心文件未改；UI 不再宣传旧规则，等待业务核心/服务端阶段统一 |
| `GAP-P2A-D-02` | 当前媒体核心仍以 8 MB 校验图片，且缺少 100 MB 视频和 250 MB 版本总量字段 | UI 展示 v8 上限，但当前本地核心预检不一致 | 未改核心；接口与媒体策略阶段必须统一后再功能验收 |
| `GAP-P2A-D-03` | `SessionMediaDraft` 没有材料版本、游泳前/后阶段、正式 batch ID 与 deadline | 不能可靠归类前后照，也不能完整证明同批 15/30 分钟恢复 | 页面明确“待阶段标记”，游泳正式提交禁用 |
| `GAP-P2A-D-04` | `CheckInRecord` 只有 `hours`、`VALID/INVALID` 和实际秒数 | 缺可计分钟、实际计入分钟原因、待 AI/待教师/技术处理中/待补证等完整状态 | UI 只映射可证明状态，缺失值不推算 |
| `GAP-P2A-D-05` | 无游泳延迟说明资格、截止和提交接口 | 不能形成正式异常队列记录 | 仅保留本地 UI 草稿，提交禁用 |
| `RISK-P2A-D-01` | Web `74b6166` 审计确认正式 Web 仍有相同旧会话冲突 | Android 与 Web 的视觉结构可核对，但业务功能不能以 Web 旧实现为权威 | 继续以 v8.0 四份正文为唯一业务权威 |

上述缺口均未通过 Mock、TODO 成功页、客户端推算或修改 Contract 关闭。

## 6. 人工验收待办

由用户在 Android Studio 模拟器和真机核对：

- 中英文、浅色/深色、大字体与 TalkBack；
- 运动进行/暂停/结束确认与系统返回；
- 普通运动与游泳证据卡差异；
- 相机、麦克风首次拒绝/永久拒绝和系统返回；
- 本地照片/视频预览、删除、锁定后不可删除；
- 上传中断重进、进程重建、本地草稿恢复；
- 受理页不出现“有效/通过/已计入”；
- 记录的待检查、有效已计入、有效未计入、无效与未知状态。

在新 Backend、Contract 字段、Owner/Reviewer 和人工证据到位前，本步不得标记为接口接入或完整业务验收完成。

## 7. 结束项

- 是否修改业务规则：**否；只按 v8.0 修改 UI 表达并记录旧核心冲突**
- 是否修改 Contract：**否**
- 是否修改 Backend / 数据库 / 部署 / Web：**否**
- 是否仍有旧 API：**是；现有会话、媒体、记录 API 与核心模型仍为旧基线**
- 是否有 Mock / TODO / 空接口：**无新增 Fake Success 或空接口；游泳延迟说明为明确禁用的本地 UI 草稿**
- 是否更新 `docs/rebuild/STATUS.md`：**否；按领导要求由指定汇总人更新**
- 下一阶段前置条件：**用户说“开始第七步”；第 7 步处理一次补充、原始耐力和免测/认证 UI，不在本步提前修改**
