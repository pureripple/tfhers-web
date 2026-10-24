> **更新：** 表结构已改由 Flyway 管理（见 [flyway.md](./flyway.md)）。下次部署含 Flyway 的 jar 并 restart 后，会自动 baseline + 执行 `V2__create_user_feedback`（`IF NOT EXISTS`）。下列手工步骤仅作历史说明。
# 问题反馈功能 — 手动部署说明

## 1. 数据库（先做）

在 MySQL（tfhers 库）执行：

`tfhers-web-management/database/create_user_feedback.sql`

（与 `src/main/resources/sql/create_user_feedback.sql` 内容相同。）

## 2. 后端 jar

```bat
cd /d "D:\AAAAA Study\javacode\tfhers-web\tfhers-web-management"
mvn -DskipTests package
```

把新 jar 拷到服务器 `/opt/tfhers/backend/`，然后：

```bash
sudo systemctl restart tfhers-management
```

## 3. 用户端静态（Nginx www）

同步到 `/opt/tfhers/frontend/www`：

- `tfhers-web-app/src/main/resources/static/index.html`
- `tfhers-web-app/src/main/resources/static/js/main.js`
- `tfhers-web-app/src/main/resources/static/css/main.css`

## 4. 管理端静态（容易漏！）

管理端页面**不会**因为只换 jar 就自动变新，如果你线上用的是独立目录 `/opt/tfhers/backend/www`，必须再拷这两份：

- `tfhers-web-management/src/main/resources/static/index.html` → `/opt/tfhers/backend/www/index.html`
- `tfhers-web-management/src/main/resources/static/js/index.js` → `/opt/tfhers/backend/www/js/index.js`

示例（在服务器上，按你实际传文件方式改）：

```bash
# 假设文件已传到 /tmp/admin-static/
sudo cp /tmp/admin-static/index.html /opt/tfhers/backend/www/index.html
sudo cp /tmp/admin-static/js/index.js /opt/tfhers/backend/www/js/index.js
# 如有 Nginx 缓存，可 reload
sudo nginx -s reload
```

如果管理端其实是直接访问 jar 内嵌 static（classpath:/static/，端口 8081），则只要换 jar + restart 即可；但只要你平时打开的是 Nginx 指到的 www，就以第 4 步为准。

部署后浏览器**强刷**（Ctrl+F5）。

## 5. 自测

1. 用户端头像 →「问题反馈」提交一条  
2. 管理端侧栏点「问题反馈」→ 列表应有记录 →「处理」改状态/写回复  
3. 用户端「我的反馈」应能看到回复  

## API

- `POST /api/feedback` 用户提交（JWT）
- `GET /api/feedback/mine?page=&size=` 我的反馈（JWT）
- `GET /api/admin/feedback/list?page=&size=&status=&category=` 管理列表
- `PUT /api/admin/feedback/{id}/status` body: `{ "status": 0|1|2|3, "adminReply": "..." }`

状态：0 待处理 / 1 处理中 / 2 已处理 / 3 已关闭  
分类：bug / suggestion / other

## 管理端改动位置（本地开发）

- 侧栏入口 + 列表页 + 弹窗：`tfhers-web-management/src/main/resources/static/index.html`（`#feedback`、`#feedbackStatusModal`）
- 逻辑：`.../static/js/index.js`（`loadFeedback` / `confirmFeedbackStatus` 等）
- 接口：`UserFeedbackAdminController` → `/api/admin/feedback/**`

## 管理端 App 壳层（2026-10-23）
本地已把管理端静态壳改成与用户端一致：可收缩侧栏、logo+「tfhers管理端」、顶栏页面标题、头像下拉。

同步到 /opt/tfhers/backend/www/（或你实际管理端 www）：
- index.html / user-management.html / profile.html
- css/index.css / css/profile.css
- js/index.js
缓存参数 ?v=20261023b。浏览器 Ctrl+F5。
侧栏仍含「问题反馈」(data-page=feedback / #feedback)。
