# P0 卡② JWT type=user|admin 变更说明

## 变更
- `JwtUtil.generateToken` 不再写死 `type=admin`；默认签发 `user`。
- 用户登录（`UserController`）使用 `generateUserToken` → `type=user`。
- 管理登录（`AdminLoginController`）使用 `generateAdminToken` → `type=admin`。
- `LoginInterceptor` 将 `tokenType` / `userType` 写入 request（供卡③管理端鉴权）。

## 旧 Token
- **建议强制重登**（清客户端缓存的 Bearer Token）。
- 旧实现曾把用户 Token 也标成 `admin`，升级后若不重登，用户 Token 仍可能带 `type=admin` 直至过期。
- 解析侧：claim 缺 `type` 或非 `admin` 时 **保守按 `user`**，不信任为管理员。

## 本卡范围
- 只保证签发与 claim 可读正确；管理端拦 USER Token（卡③）未在本卡改完所有 Admin Controller。
