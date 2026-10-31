# TFHers：GitHub Actions 自动部署

目标：本地改代码 → push `main` → Actions 构建并用 SSH 更新服务器。
你平时只跟助手说改什么，不再手动拷文件。

## 你要准备的东西

1. GitHub 账号 + 一个私有仓库（可新建空库，例如 `tfhers-web`）
2. 服务器 SSH 登录权限（`8.155.136.50`，用户一般是 `root`）
3. Cursor 里连上 GitHub（聊天里的连接卡片）

## 一次性步骤（约 15–20 分钟）

### A. 连接 GitHub（现在就能做）

1. 点聊天里的 **GitHub 连接**卡片，用浏览器授权
2. 授权时勾选要给 Cursor 访问的仓库（或之后再建库再开权限）

### B. 新建仓库（电脑开着或网页上都能做）

1. GitHub → New repository → 名如 `tfhers-web` → **Private**
2. 不要勾选自动加 README（若本地已有项目）；空库即可
3. 记下地址：`https://github.com/<你的用户名>/tfhers-web.git`

### C. 电脑开机后：本地接到远程

在 `D:\AAAAA Study\javacode\tfhers-web\`：

```bash
git status
git remote -v
# 若还没有 remote：
git remote add origin https://github.com/<你的用户名>/tfhers-web.git
git branch -M main
git add .
git commit -m "chore: initial import"   # 若已有提交可跳过
git push -u origin main
```

把仓库里的 `.github/workflows/deploy.yml` 放进项目（助手会在你开机后帮你放并 push）。

### D. 生成部署用 SSH 密钥（不要用你日常登录密钥）

在任意机器（或助手电脑）生成一对**仅用于 Actions**的密钥：

```bash
ssh-keygen -t ed25519 -C "tfhers-gha-deploy" -f tfhers-gha-deploy -N ""
```

- **公钥** `tfhers-gha-deploy.pub` → 加到服务器 `root` 的 `~/.ssh/authorized_keys`  
  （可运行 `scripts/server-bootstrap.sh`）
- **私钥** `tfhers-gha-deploy` 全文 → 只放进 GitHub Secrets，不要进仓库

### E. 服务器一次性准备

SSH 登录 ECS 后：

```bash
# 确认路径存在
ls /opt/tfhers/backend /opt/tfhers/frontend/www
systemctl status tfhers-management
# 安装公钥（见 bootstrap 脚本）或手动追加到 authorized_keys
```

确认：

- jar 名：`/opt/tfhers/backend/tfhers-web-management-0.0.1-SNAPSHOT.jar`
- 服务名：`tfhers-management`
- 管理端静态：`/opt/tfhers/backend/www`
- 用户端静态：`/opt/tfhers/frontend/www`
- 密钥文件 `backend.env` **不要**放进 Git

### F. GitHub 仓库 Secrets

仓库 → Settings → Secrets and variables → Actions → New repository secret：

| Name | 值 |
|------|-----|
| `DEPLOY_HOST` | `8.155.136.50` |
| `DEPLOY_USER` | `root`（或你的部署用户） |
| `DEPLOY_SSH_KEY` | 私钥全文（含 `BEGIN`/`END` 行） |
| `DEPLOY_PORT` | 可选，默认 `22` |

### G. 第一次验证

1. 任意小改或手动跑：Actions → Deploy TFHers → Run workflow
2. 看 Job 是否绿；绿了再打开站点强刷
3. 之后：`push main` 就会自动部署

## 日常怎么用

1. 跟助手说要改什么（电脑在线）
2. 助手改本地 → commit → push `main`
3. 你在 GitHub Actions 看结果；成功即上线

## 和「定时 git pull」的区别

- Actions：有构建、有日志、失败能看见，改 Java 会重新打包 jar
- 定时 pull：简单但有延迟、失败不显眼，一般不推荐当主方案

## 注意

- 工作流里的静态目录名若和你本地模块不一致，第一次 push 前让助手对照 `pom.xml` 改一下路径
- 纯静态更新通常**不用** `nginx reload`；只有改了 nginx 配置才 reload
- 表结构变更放进 Flyway（`tfhers-web-management/src/main/resources/db/migration/`），随 jar 重启执行。不要整目录跑 `docs/legacy-sql/`。Actions 不会单独执行 SQL 文件。

## Vue 前端

- 源码：仓库 `frontend/`（Vue 3 + Vite），用户端 `/` 与管理端 `/admin` 同一 SPA。
- CI：变更 `frontend/` 或本 workflow 时，Node 20 → `npm ci && npm run build`，再 rsync `frontend/dist/` → **`/opt/tfhers/frontend/www-vue`**。
- 仓库内旧的 Spring `src/main/resources/static` 已删除。工作流里的 legacy rsync 只有在检出目录仍存在时才会执行，因此不会清空服务器上的 `/opt/tfhers/frontend/www` 或 `/opt/tfhers/backend/www`。
- Java：变更 `pom.xml`、`*.java` 或 `tfhers-web-management/` 时，`mvn -B -DskipTests -f tfhers-web-management/pom.xml package`，jar 发布到 `/opt/tfhers/backend/`。根目录聚合 `pom.xml` 不改变这条命令。
- Nginx 样例：`deploy/nginx/tfhers.conf`（`root` 为 `www-vue`）→ 服务器暂存 `/opt/tfhers/deploy/nginx/`。线上 `/api/` 反代到 management `:8081`。本地 Vite 仍按 `frontend/vite.config.ts` 拆到 `:8080` / `:8081`。
- SPA：`try_files $uri $uri/ /index.html`。

首次启用 SPA 	ry_files：把 deploy/nginx/tfhers.conf 里的 location 合并进现有 HTTPS server，或在服务器执行：

\ash
touch /opt/tfhers/deploy/nginx/.auto_install
cp -a /opt/tfhers/deploy/nginx/tfhers.conf /etc/nginx/conf.d/tfhers.conf
nginx -t && systemctl reload nginx
\\n
（也可在仓库提交空文件 deploy/nginx/.auto_install，之后 Actions 会在 DO_NGINX 时自动安装。）
