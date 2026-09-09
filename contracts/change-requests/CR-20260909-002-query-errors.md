# P7-Z-CR-QUERY-ERRORS-01：13项查询错误及序列化（正式接受记录）

- 决定状态：ACCEPTED；用户作为 Contract Owner / Reviewer 明确同意序列化规则并授权实施。原12项及第13项 listStudentAccounts 均纳入此次决定，不代填 H 对扩展范围的复审。
- 原提案：[PR15 固定原文](https://github.com/chchaiai/new_need_version_sports/blob/d2d361d76b8f2e59623c49a5dbaf83895a4d2608/docs/rebuild/candidates/g1-20260909/snapshot/coordination/P7-Z-CR-query-errors-01.md)。原 Z 四项失败仍保留，不是已经修复的后端结果。
- 基线 main / f95c3833870fe0da55a297aa28c958ec53e9e935；1.3.0-contract / RC / 5c87eeb9bca39585cea2e3c80c60d58813b4367e1a60b161ed8c7f82af4a19ed。与历史学生 CR 一次生成 1.4.0-contract / RC，新 SHA 按最终字节计算。

## 接受范围

listSemesters、listOwnCourses、listCourseMakeupAuthorizations、listOwnMakeupAuthorizations、listCourseInvitations、listCourseMembers、listPublishedRuleTemplates、listSubAdmins、listTeacherAccounts、listOwnStudentNotifications、listOwnNotifications、listSystemModeTransitions、listStudentAccounts。

以上13项在已有 x-error-codes 补入已有 INVALID_REQUEST，HTTP400/BadRequest及全局错误结构不变。INVALID_CURSOR 只表示游标内容/适用性错误，不能代替页大小、状态或其他查询参数错误。

以上操作已声明的标量查询参数，在参数名 URL 解码后最多出现一次，不先选第一个/最后一个。重复 cursor 也是 INVALID_REQUEST；合法单次 cursor 内容无效仍为 INVALID_CURSOR。

limit 值解码一次后只能是 ASCII 十进制数字字符，数值1–100；省略保持既有20。不得含指数、小数点、正负号、空白或空串。数字字符规则允许前导零，按整数规范化后检查范围；非 ASCII 数字符号不属于 [0-9]。其余枚举、boolean、字符串长度按既有 schema，不扩大为所有176操作的新规则。这关闭原 QUERY_SERIALIZATION_PENDING。

请求/成功响应 DTO、认证权限、资源范围、游标绑定、时间、上传、幂等及数据库业务事实不变；明确传输限制属于外部协议变化，随新版本显式发布。Android/Web 更新绑定和相应错误分支，正常请求仍保持数字编码。H/Z 修复 operation 级允许错误映射，教师/分管理员列表也不能继续伪装 INVALID_CURSOR。

验收覆盖13项全部参数约束和新传输边界，不能只让原四个失败变绿；两端验证按新 SHA，真实HTTP400结果由 H/Z 回归和 G1 联调提供。不得放宽全局 Mapper、跳过测试或把500改为测试期望以绕过缺口。发布/回退遵守同版本消费和用户 GitHub 操作边界。
