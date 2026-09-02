# Web 学生端预览层

本目录只保留当前 Web 学生端及其本地预览支持。教师端和管理员端位于
[`portal-teacher-admin/`](../portal-teacher-admin/README.md)。

## 结构

```text
frontend/
├── student/                         Web 学生端静态 SPA
├── preview-server.cjs               本地预览、同源 API 代理与公开运行时配置
└── preview-runtime-config.test.cjs  公开运行时配置边界测试
```

## 启动

在 `BNBU-Sports-Web-new/` 目录运行：

```bash
npm run preview
```

学生端入口为 `http://127.0.0.1:4174/student/`；访问预览根路径会跳转到学生端。

## 验证

```bash
npm run test:web
npm run test:student
```

学生端详细说明见 [student/README.md](student/README.md)。当前重建状态、自动化结果和未执行的产品验证统一记录在仓库根目录 `docs/rebuild/STATUS.md`。
