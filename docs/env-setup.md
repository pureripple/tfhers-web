# 环境变量与密钥配置说明

仓库内的 `application.yml` 已改为通过 `${环境变量}` 读取密钥，**不再提交明文密码 / AccessKey / JWT / Steam Key**。

变量名一览见仓库根目录 `ENV.example`。

## 必填（无默认值，缺了启动会失败）

| 变量 | 用于 |
|------|------|
| `TFHERS_DB_PASSWORD` | app + management 数据库密码 |
| `JWT_SECRET` | management JWT 签名 |
| `ALIYUN_OSS_ACCESS_KEY_ID` / `ALIYUN_OSS_ACCESS_KEY_SECRET` | OSS |
| `ALIYUN_GREEN_ACCESS_KEY_ID` / `ALIYUN_GREEN_ACCESS_KEY_SECRET` | 内容安全 |
| `LANGCHAIN4J_API_KEY` | AI（通义兼容接口） |
| `STEAM_API_KEY` | Steam |

## 可选（有安全默认值）

`TFHERS_DB_URL`、`TFHERS_DB_USERNAME`、`ALIYUN_OSS_BUCKET`、`ALIYUN_OSS_ENDPOINT`、`ALIYUN_OSS_DOMAIN`、`STEAM_RETURN_URL`、`STEAM_REALM`、`FRONTEND_BASE_URL`、`TFHERS_MANAGEMENT_BASE_URL`、Green 的 region/endpoint/service/fail-open。

未设置时 `STEAM_RETURN_URL` / `STEAM_REALM` 默认为 `http://localhost:8081`，`FRONTEND_BASE_URL`（`tfhers.frontend.base-url`）默认为 `http://localhost:5173`。这只适合本机。生产若留空，Steam 跳回和绑定成功后的 `Location` 都会指向 localhost，浏览器显示 connection refused。

## 生产 Steam 绑定（tfhers.cn）

写入 `/opt/tfhers/backend/backend.env`（systemd `EnvironmentFile`，线上实际路径）：

```
STEAM_RETURN_URL=http://tfhers.cn/api/user/steam/callback
STEAM_REALM=http://tfhers.cn
FRONTEND_BASE_URL=http://tfhers.cn
```

| 变量 | 配置键 | 作用 |
|------|--------|------|
| `STEAM_RETURN_URL` | `steam.return-url` | OpenID `return_to`，须是外网能访问的回调 |
| `STEAM_REALM` | `steam.realm` | OpenID `realm`，须与站点源一致 |
| `FRONTEND_BASE_URL` | `tfhers.frontend.base-url` | 绑定成功后 `Location` 为 `{FRONTEND_BASE_URL}/settings` |

Nginx 把 `http://tfhers.cn/api/` 反代到 management `:8081`，所以上面的回调路径不用带端口。`FRONTEND_BASE_URL` 只写站点根，不要带 `/settings`。

## 两种本地做法（二选一或混用）

### A. 系统 / IDE 环境变量（推荐贴近生产）

在 Windows 用户环境变量或 IntelliJ Run Configuration → Environment variables 中填入上表变量，直接启动，无需 `application-local.yml`。

### B. Spring profile `local`

1. 复制 `application-local.yml.example` → 同目录 `application-local.yml`（已被 gitignore）
2. 填入真实值
3. 启动参数加 `--spring.profiles.active=local`，或 IDE Active profiles 填 `local`

注意：`local` 文件里的明文会覆盖同名配置；不要把该文件提交到 Git。

## 轮换密钥（重要）

旧密钥曾出现在 Git 历史中的 `application.yml` 里。配置环境变量后请尽快：

1. 在阿里云 RAM **轮换 / 禁用** 旧 AccessKey（OSS + Green）
2. 更换数据库密码、`JWT_SECRET`、Steam API Key、通义 API Key
3. 可选进阶：用 `git filter-repo` / BFG 清理历史（会改写提交，需全员配合）

仅改当前文件**不能**从旧 commit 里抹掉已泄露的明文。

## node_modules

根目录曾经误提交过一份 `node_modules/`（旧前端残留，没有配套的 `package.json`）。它已从 Git 索引移除。`.gitignore` 忽略根目录和 `frontend/` 下的 `node_modules/`。依赖只安装在 `frontend/`。

## Linux 生产（systemd EnvironmentFile）

**线上实际位置是 `/opt/tfhers/backend/backend.env`**（不是 `/etc/tfhers/tfhers.env`，后者在这台服务器上并不存在）。
systemd unit 用 `EnvironmentFile=/opt/tfhers/backend/backend.env` 注入。改完必须 `systemctl restart tfhers-management` 才生效。

```bash
# 确认真正生效的注入方式（EnvironmentFile 还是内联 Environment）
systemctl cat tfhers-management | grep -iE 'Environment|ExecStart'

# 权限必须是 600，且只有 root 可读
chmod 600 /opt/tfhers/backend/backend.env
ls -l /opt/tfhers/backend/backend.env
```

> 这个文件在**服务器上**，不在仓库里（`.gitignore` 已忽略）。轮换任何 AccessKey / 密码后，
> 除了改这里，还要重启服务；否则进程内存里仍是旧值，上传等功能会报 `InvalidAccessKeyId`。

## CORS 白名单（P0）

| 变量 | 说明 |
|------|------|
| `CORS_ALLOWED_ORIGINS` | 逗号分隔的允许 Origin。生产**不要**写 `*`。 |

- 未设环境变量时：`application.yml` 默认放行常见 localhost（Vite/本机端口）。
- `--spring.profiles.active=dev`：默认 `*`（便于本地联调），仍可用环境变量收紧。
- `--spring.profiles.active=prod`：默认 `http://8.155.136.50`（演示站），正式前端域名务必写入 `CORS_ALLOWED_ORIGINS`。
- 控制器上的 `@CrossOrigin(origins="*")` 已移除，只走中央 `WebConfig`。
