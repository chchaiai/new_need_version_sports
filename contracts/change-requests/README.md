# Contract Change Requests

当前 Contract 已进入 `RC`。从本版本开始，任何外部行为变化都必须先复制 [TEMPLATE.md](TEMPLATE.md) 建立 Change Request，再修改 Contract。

Change Request 至少必须：

1. 引用已更新且状态为 ACCEPTED 的业务权威；
2. 列出 Method/Path/operationId、角色/权限、RequestDTO/ResponseDTO、错误、状态码、分页、上传、幂等、认证和 null/time 影响；
3. 评估 Android、学生 Web、Portal、Backend、数据库、Mock、Staging 和兼容性；
4. 标明破坏性/非破坏性及迁移/回滚方案；
5. 提升仓库 Contract 版本并重新生成 SHA-256；
6. 通过结构校验、OpenAPI lint 和 RC readiness；
7. 在下游重新加载前保持旧版本可识别，禁止静默覆盖。

命名：`CR-YYYYMMDD-NNN-short-slug.md`。状态建议使用 `PROPOSED / ACCEPTED / REJECTED / IMPLEMENTED`，不得把 `PROPOSED` 当作已授权行为。
