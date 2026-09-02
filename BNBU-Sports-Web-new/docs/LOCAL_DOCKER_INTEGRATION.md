# Web + Backend 本地 Docker 联调

本说明适用于 `Eric-xiong1/BNBU-web` 与权威后端
`chchaiai/BNBU-Sports-Backend` 的本机合成数据联调。不要启动本仓库内已弃用的
Express Mock Backend，也不要把真实学生数据、`.env`、密码、Token、数据库连接串、
`storageKey` 或签名 URL 写入日志或提交到 Git。

## 1. 启动 Backend 2.0.2 基础设施

在独立的 `BNBU-Sports-Backend` 仓库根目录执行：

```powershell
npm --prefix backend run local:env:init
npm --prefix backend run local:env:check
docker compose --env-file backend/.env -f backend/docker-compose.yml up -d
docker compose --env-file backend/.env -f backend/docker-compose.yml ps
```

本地基础设施默认包括 PostgreSQL、MinIO 和 Mailpit。必须等待健康检查通过，
且 `docker version` 同时显示 Client 与 Server，才能继续。

## 2. 初始化并启动 Backend

```powershell
npm --prefix backend run db:generate
npm --prefix backend run db:migrate:deploy
npm --prefix backend run db:seed:local
npm --prefix backend run start:dev
```

后端应监听 `http://127.0.0.1:3000`，正式 API 前缀固定为 `/api/v1`。
确认 `/health/live`、`/health/ready` 和 `/health/system-mode` 返回成功后再启动 Web。

## 3. 启动 Web

学生端在 Web 仓库根目录启动：

```powershell
npm ci
npm run preview
```

学生端使用同源 `/api/v1`，预览服务器将 `/api/*` 转发到本地 Backend，
将 `/minio/*` 转发到本地 MinIO。真实模式请求失败时不得回退 Mock。

教师/管理端在 `portal-teacher-admin` 目录启动：

```powershell
npm ci
npm run dev -- --hostname 127.0.0.1 --port 3001
```

门户默认请求同源 `/api/v1`。开发代理读取 `BNBU_LOCAL_BACKEND_ORIGIN`，未设置时使用
`http://127.0.0.1:3000`。不要在浏览器代码中写入远程旧 API 或服务端凭据。

## 4. 固定检查

```powershell
npm run test:web
npm run test:student
npm --prefix portal-teacher-admin run contract:check
npm --prefix portal-teacher-admin run typecheck
npm --prefix portal-teacher-admin run lint
npm --prefix portal-teacher-admin test
```

端到端业务闭环使用 Backend 仓库提供的合成数据工具：

```powershell
npm --prefix backend run local:closure
```

该闭环必须覆盖邮箱验证码、加入课程、运动会话、现场媒体上传、记录提交、教师审核、
成绩发布与学生回读。浏览器相机、麦克风、扫码和权限弹窗仍需在目标真机上人工验收。

## 5. 安全收尾

未经明确确认，不执行 `docker compose down -v`、删除数据库或 Docker volume、
`git reset --hard`、合并、部署或发布。停止本地前台服务时只终止对应终端中的进程，
不要按进程名称批量结束其他开发任务。
