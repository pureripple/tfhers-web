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

`TFHERS_DB_URL`、`TFHERS_DB_USERNAME`、`ALIYUN_OSS_BUCKET`、`ALIYUN_OSS_ENDPOINT`、`ALIYUN_OSS_DOMAIN`、`STEAM_RETURN_URL`、`STEAM_REALM`、`TFHERS_MANAGEMENT_BASE_URL`、Green 的 region/endpoint/service/fail-open。

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

## 从 Git 索引移除已跟踪的 node_modules（本任务未执行）

`.gitignore` 已忽略 `node_modules/`，但若历史上已提交，需稍后执行：

```text
git rm -r --cached node_modules
git commit -m "Stop tracking node_modules"
```

## Linux 生产（systemd EnvironmentFile）

见同目录说明中的「Linux CentOS Stream 9」步骤，或父代理给出的操作清单：把密钥写在 `/etc/tfhers/tfhers.env`（权限 600），在 service 里 `EnvironmentFile=-/etc/tfhers/tfhers.env`。
