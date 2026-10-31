# TFHers Web

蹄斗族群（Them's Fightin' Herds）社区站。页面由 Vue 提供，接口由两个 Spring Boot 模块提供。生产环境 Nginx 的站点根目录是 Vue 构建产物对应的 `www-vue`。

## 目录

| 路径 | 作用 |
|------|------|
| `frontend/` | Vue 3 + Vite。用户端 `/` 与管理端 `/admin` 在同一个 SPA 里。静态资源放在 `frontend/public`。依赖只装在 `frontend/`，不要在仓库根目录执行 `npm install`。 |
| `tfhers-web-app/` | 用户端 API，本地端口 `8080`。父 POM 仍是 `spring-boot-starter-parent` `3.5.6`。 |
| `tfhers-web-management/` | 管理端与主业务 API，本地端口 `8081`。生产环境只跑这个 jar。父 POM 仍是 `spring-boot-starter-parent` `3.2.0`。 |
| `pom.xml` | Maven 聚合工程（`packaging` 为 `pom`），只列出上面两个模块，不把它们收成一套微服务，也不替换各自的 Spring Boot parent。 |
| `deploy/nginx/` | Nginx 站点配置。`tfhers.conf` 的 `root` 是 `/opt/tfhers/frontend/www-vue`。 |
| `.github/workflows/deploy.yml` | 推送到 `main` 后构建 management jar 和 Vue，再通过 SSH 发布。 |
| `docs/` | 环境变量、Flyway、部署说明。 |
| `scripts/` | 服务器一次性引导脚本。 |
| `ENV.example` | 环境变量清单。复制后填写，不要提交真实密钥。 |

`groupId` 仍是 `com.example`。仓库里已经去掉旧的 Spring `classpath` 静态站（`src/main/resources/static`）。服务器上的回滚目录 `/opt/tfhers/frontend/www` 和 `/opt/tfhers/backend/www` 不在本仓库的删除范围内；对应源码目录不存在时，Actions 不会去清空它们。

## 本地运行

需要 JDK 17、Maven、Node.js 20。密钥见 `ENV.example` 和 `docs/env-setup.md`。

在仓库根目录打包两个模块（跳过测试）：

```bash
mvn -q -DskipTests package
```

分开启动：

```bash
mvn -f tfhers-web-management/pom.xml spring-boot:run
mvn -f tfhers-web-app/pom.xml spring-boot:run
```

前端：

```bash
cd frontend
npm ci
npm run dev
```

- 页面：http://127.0.0.1:5173/
- 管理端：http://127.0.0.1:5173/admin/login
- Vite 把部分 `/api` 前缀代理到 `:8081`，其余 `/api` 代理到 `:8080`（见 `frontend/vite.config.ts`）
- Windows 可以运行 `start-apps.bat`，它会拉起同样的三个进程

## 与 Actions 一致的生产构建

```bash
mvn -B -DskipTests -f tfhers-web-management/pom.xml package
cd frontend && npm ci && npm run build
```

Actions 把 management jar 放到服务器 `/opt/tfhers/backend/`，把 `frontend/dist` 同步到 `/opt/tfhers/frontend/www-vue`。根目录的 `mvn -q -DskipTests package` 会同时打出两个模块的 jar；日常 CI 仍只构建并发布 management。
