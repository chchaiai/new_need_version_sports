# Phase 4 PR #8 本轮修复候选核验记录

> 记录版本：`P4-HZ-FINAL-REVIEW-1.1-CANDIDATE`；本轮标识：`PR8-DOC-FIX-01`。
>
> 当前状态：`PATCH_PREPARED / OWNER_REVIEW_PENDING`。本轮由本对话助手制作候选并自检，提交给负责人验收；未取得针对本候选的新H/Z互审回执，不沿用历史回执冒充新审核。
>
> 来源PR：[PR #8](https://github.com/chchaiai/new_need_version_sports/pull/8)；源分支：`codex/phase4-h-f-governance-design`；源提交：`25bc20dcf19ac4646a16a1e27f076ac360e27da0`；已合入main来源：`73945754a8dbd490709a0a92fda696febf6433eb`。本候选尚未形成新的Git提交，不把来源提交写成候选完成提交。未修改`WI-0029`控制面，原工作项完成状态仅作为收到的历史报告。

## 1. 原决定与本轮边界

P-02依据`BNBU_Phase4_Decisions_20260907_v1.0.docx`，SHA-256 `c65edff3d13184804130b623ff16e42460b0712f1e4d4bb98ca2199ea18a4034`，第四节“跨关闭和成员变化的处理”与P02 F/G。原决定保护生命周期边界前服务器已确认的合法会话，包括尚未首次受理材料的链；本轮只是补齐该已批准分支。

仅修改原PR中的9份Phase 4文档；不修改业务规则原件、Contract、客户端、Backend、数据库、Migration、部署或真实数据。不重新裁定P-01/P-03/P-04/GAP-H13，也不发布新Contract。模块责任划分保持原约定，本轮候选由负责人接收；H/Z的历史Owner/Reviewer标签不等于本候选已由他们复审。

## 2. 本轮修复与验收状态

| Finding | 本轮处理 | 当前状态 |
|---|---|---|
| `PR8-DOC-FIX-01-01`：P-02首次受理前的合法会话保护未写清 | Z §12.2以服务器合法Session/Record识别旧链；C放行仍在原首次窗口的本人请求，E等待两类合法未完链；H/G2/矩阵/联合汇总/交接同步；Z §12.2.1列10个设计案例 | `PATCH_PREPARED / OWNER_REVIEW_PENDING` |
| `PR8-DOC-FIX-01-02`：最终互审清单4项SHA不符 | 逐项保存来源Git原始SHA；本表按修改后候选的UTF-8/LF原始字节重新计算；旧不符清单留作历史证据 | `PATCH_PREPARED / OWNER_REVIEW_PENDING` |

原`P4-FINAL-R2-001`～`007`的CLOSED和H/Z视角复核记录保留在[来源提交的原记录](https://github.com/chchaiai/new_need_version_sports/blob/25bc20dcf19ac4646a16a1e27f076ac360e27da0/docs/rebuild/handoffs/phase-4-final-alignment-review.md)，只说明当时自报状态；本次发现使其中002/007对应结论需要补充，不能据旧“0 OPEN”自动接受本候选。原Phase 4 DONE / Phase 5 READY为收到的阶段决定，本记录不代负责人撤回该决定，也不以候选准备完成自动确认Phase 5正式开工。

## 3. 修改后候选文件的完整SHA-256

以下绑定候选原始字节（UTF-8，无BOM，LF）；在GitHub落盘后必须从实际新提交重新核对，不能用经换行归一化的文本哈希冒称Git原始文件SHA。若下面任何文件在验收中再改动，先复核差异，再重算对应SHA。

| 文件 | 候选文档版本 | 原始字节SHA-256 |
|---|---|---|
| `docs/architecture/new-requirements/p4-design-huang-v81.md` | `P4H-FINAL-ALIGN-1.4` | `e29e2aef7b374a26050fe9c99cc5ad3a1e091f448dd96b03392ec8915c8a7509` |
| `docs/architecture/new-requirements/p4-design-zhou-v81.md` | `P4Z-FINAL-ALIGN-1.2` | `d0dd08c8bb99d17c3084fe965550cd6eca03a350a4f17924ddd8f8f7b4d9dc6a` |
| `docs/architecture/new-requirements/p4-migration-note.md` | `P4Z-G2-FINAL-ALIGN-1.2` | `065a513e11cc0f852e8e2940baa32e188cb2eb215d16c8039eff471473a31bd7` |
| `docs/architecture/new-requirements/p4-traceability-matrix-v81.md` | `P4-TRACE-V8.1-1.3` | `6fb2d4c76aa7495876d48392dde526568f2ac98fcfb7df892718d8e674ecd677` |
| `docs/architecture/new-requirements/p4-design-deltas-v81.md` | `P4-HZ-FINAL-ALIGN-1.1` | `a6e9947014e73ec63d510d3adb52c6d1e06a9b6d0010f901494cb03a93fd8d5f` |
| `docs/rebuild/STATUS.md` | `PR8-DOC-FIX-01` | `4e50d43c8b27ba35703113debd2381308546803ba5c627708f1c4b051776b36b` |
| `docs/rebuild/handoffs/new-req-phase-4.md` | `FINAL-ALIGN-REPAIR-1` | `e953e7704c196bf618026b6c8ffc11bc1ef482d1af38c334382e0ece4182b803` |
| `docs/rebuild/phase-4-final-report-20260907.md` | `FINAL-ALIGN-REPAIR-1` | `abc9fccb4ca39b297f2aebdc7aea31af998632dc8272191f87fe3e385f051e7e` |

本记录不自引用自身SHA；本地分发清单包含本记录的SHA，正式发布后以新的完整Git提交及路径固定本记录。避免文档互相回填SHA造成循环。

## 4. 来源SHA核验与历史差异

此次来源均直接取固定提交`25bc20dcf19ac4646a16a1e27f076ac360e27da0`的原始文件，并逐项核对Git blob ID。原记录8项中4项匹配、4项不匹配：

| 文件 | 原记录声称的SHA-256 | 来源提交原始SHA-256 | 结果 |
|---|---|---|---|
| `docs/architecture/new-requirements/p4-design-huang-v81.md` | `236b1efb22109b065f34cd54febbb68e97514d39bc1307af79c14d4c34502d99` | `c9ec54433e92e098b7b31d6738c6584882ee393678c5fe3627aed9fa0f044b08` | 不一致 |
| `docs/architecture/new-requirements/p4-design-zhou-v81.md` | `033cd20442380e79e04d2cc2bbf076f256e376f6bd6cdba99b7df22df3b23cfd` | `033cd20442380e79e04d2cc2bbf076f256e376f6bd6cdba99b7df22df3b23cfd` | 一致 |
| `docs/architecture/new-requirements/p4-migration-note.md` | `4f7a1db9af3935348e9f8d2d92b9584280a5df9dfa318b60939765c0fd27e400` | `4f7a1db9af3935348e9f8d2d92b9584280a5df9dfa318b60939765c0fd27e400` | 一致 |
| `docs/architecture/new-requirements/p4-traceability-matrix-v81.md` | `2020c2e333ad3b48e7b666f8c0662b1ebfe7e0493c7f4e184a7d6c1ad6051b8c` | `2020c2e333ad3b48e7b666f8c0662b1ebfe7e0493c7f4e184a7d6c1ad6051b8c` | 一致 |
| `docs/architecture/new-requirements/p4-design-deltas-v81.md` | `c837f6063490dc0c92db5e19a9952509024ae71740077b5a2a4d9dc1e19d94bb` | `70c18255d3232619343ab4702a4d463d4555ed81dc9a4fca38821a63cafae3e2` | 不一致 |
| `docs/rebuild/STATUS.md` | `fd8d0ea3b6818e64f17a3060deed88834fad9baa0c22badd72015efa22f2f60b` | `b35e81dbcff91299ce8b9712509acfcd15e3637f9dae5162d885b678e92f260f` | 不一致 |
| `docs/rebuild/handoffs/new-req-phase-4.md` | `f88222fb7c7833a5b14eeb68c98e8061a6dd33357b67c86a472905518e3b4e4f` | `53a0b18372bc4853ca6b4c0749cbfea02352c84c59e0e4b98c3a4872abf79b78` | 不一致 |
| `docs/rebuild/phase-4-final-report-20260907.md` | `2634fc207a4cd39b86e4abddf057250e6359ea0b88adeabd93147ae796d3cca7` | `2634fc207a4cd39b86e4abddf057250e6359ea0b88adeabd93147ae796d3cca7` | 一致 |

不能仅因SHA不符判断内容被恶意修改。H、联合汇总、STATUS和Handoff的差异未能用简单LF/CRLF及常见BOM变体解释；本轮不虚构确切成因，保留来源与对照，候选以可复核的原始字节清单交付。

## 5. 本轮核验与未执行项

- 本轮核验：来源9个Git blob身份；原记录8项SHA；候选8项表内SHA及9文件分发清单；变更路径范围；UTF-8/LF；差异可应用性和空白检查。机器结果随本地`verification.json`交付。
- 设计核对：Z §12.2.1的P02-R1～R10逐项对照原决定，涵盖首次受理前关闭/移出、结算等待、严格端点、伪造草稿、归属校验、新运动禁止和幂等重试。这是设计推演，不是已执行的服务测试。
- 原83/30/109项有限模型结果只作为此前交接报告保留；本轮未重新运行，也不把这些旧数字当作对本次新增分支的执行验证。
- 新H/Z互审、负责人验收、远端提交/PR更新、PR批准/合并均尚未执行。产品测试、Contract生成/校验、真实上传、数据库/迁移/恢复、部署和E2E均`NOT_EXECUTED`，因为本次仅修文档。

## 6. 验收及后续操作

负责人应核对P02-R1/R2/R3与原决定的一致性，以及本候选的SHA清单。验收结论须明确所接受版本和分发清单，不代填签名、日期或新的互审结论。若需要另一位Reviewer，由负责人指定；本记录不虚构独立Review。

由用户按既有边界更新原PR分支。操作前核对最新HEAD；若不再是`25bc20dcf19ac4646a16a1e27f076ac360e27da0`，先检查新增差异再应用，不能直接覆盖同事后续修改。保留main已有Web修复。发布后的完整Commit、9份实际文件SHA、PR状态及负责人验收记录核对完成后，再确认Phase 5具体角色、Owner/Reviewer、可写路径与首个小任务。本轮到候选交付即停止。
