# BNBU-Sports-Web-Teacher-and-Admin

BNBU 体育课程管理平台，提供教师端与管理员端统一入口网站。登录后根据账号身份进入独立职责空间：

- 教师端：课程、学生审核、打卡审核、成绩、免测与组织认证。
- 管理员端：学期、用户账号、全局规则、系统模式、帮助中心与审计日志。

界面使用项目指定的 Material3 语义色值，支持浅色、深色和跟随系统三种主题。

## 本地运行

```bash
npm install
npm run dev
```

本地开发可用登录页「跳过登录」或 `?mock=teacher` / `?mock=admin`（仅 `NODE_ENV=development`）。正式构建不得带该入口。

前端 Contract 接线、仍走旧 `/api/v1` 的流程，以及正式版必须隐藏的预览/藏分表面，见 [`docs/rebuild/handoffs/2026-09-04-frontend-api-and-production-hide.md`](../../docs/rebuild/handoffs/2026-09-04-frontend-api-and-production-hide.md)。

## 验证

```bash
npm run build
npm test
```

当前版本提供完整的前端交互原型与演示数据。正式认证、数据持久化和业务写操作需在后端教师端、管理员端 API 完成后接入。
