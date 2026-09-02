# BNBU Sports Web

本目录是当前仓库唯一保留的产品代码，包含 Web 学生端以及 Web 教师/管理员门户。当前仓库没有 Backend Runtime、独立 API 定义仓库、Android 客户端或根级发布工具；网页中的接口快照、生成类型和 Mock 只能说明网页当前依赖，不能证明服务端已经实现。

## 目录

| 目录 | 当前用途 |
| --- | --- |
| `frontend/student/` | Web 学生端 |
| `portal-teacher-admin/` | Web 教师端与管理员端 |
| `frontend/` | 学生端本地预览服务与运行时配置检查 |
| `docs/LOCAL_DOCKER_INTEGRATION.md` | 当前独立 Backend 的本地 Docker 联调说明 |

## 当前边界

- 统一业务规则只以仓库根目录 `docs/business/` 下四份业务流程文件为准。
- Web 当前调用前缀为 `/api/v1`；接口地址、字段、Mock、浏览器存储和旧 Contract 耦合见根目录 `docs/rebuild/inventories/web-legacy-api.md`。
- 学生、教师和管理员的权限及业务边界以对应的 `docs/business/` 文档为准。
- 网页内的 OpenAPI 快照、生成类型和校验脚本仅用于保持网页代码内部一致，不能冒充独立权威 API 文件或真实服务端能力。
- Mock、静态展示、构建成功或校验脚本通过，都不等于真实业务闭环已经完成。

## 本地预览

Web 学生端：

```bash
npm install
npm run preview
```

默认入口：`http://127.0.0.1:4174/student/`。

Web 教师/管理员门户：

```bash
cd portal-teacher-admin
npm install
npm run dev -- --port 4300
```

默认入口：`http://127.0.0.1:4300/`。

没有真实 Backend 时，只能进行静态页面、Portal 开发预览模式以及前端自检，不能把 API 模式标记为已验收。Web 工作区不再包含可运行的旧 Backend；历史实现只通过 Git 历史查阅。
旧数据库、联调脚本、历史产品文档和验收截图同样只通过 Git 历史查阅，不再保留在当前上线源码树。

## 常用检查

```bash
npm run test:student
npm run test:web
cd portal-teacher-admin && npm run typecheck
cd portal-teacher-admin && npm run lint
cd portal-teacher-admin && npm test
```

`portal-teacher-admin` 中仍保留以 `contract:*` 命名的兼容脚本及相关文件名。它们是现有构建链的一部分，名称本身不代表当前仓库存在独立权威接口定义；如需改名，应作为单独的构建链迁移任务处理。
