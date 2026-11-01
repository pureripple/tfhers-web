# 鐜鍙橀噺涓庡瘑閽ラ厤缃鏄?
浠撳簱鍐呯殑 `application.yml` 宸叉敼涓洪€氳繃 `${鐜鍙橀噺}` 璇诲彇瀵嗛挜锛?*涓嶅啀鎻愪氦鏄庢枃瀵嗙爜 / AccessKey / JWT / Steam Key**銆?
鍙橀噺鍚嶄竴瑙堣浠撳簱鏍圭洰褰?`ENV.example`銆?
## 蹇呭～锛堟棤榛樿鍊硷紝缂轰簡鍚姩浼氬け璐ワ級

| 鍙橀噺 | 鐢ㄤ簬 |
|------|------|
| `TFHERS_DB_PASSWORD` | app + management 鏁版嵁搴撳瘑鐮?|
| `JWT_SECRET` | management JWT 绛惧悕 |
| `ALIYUN_OSS_ACCESS_KEY_ID` / `ALIYUN_OSS_ACCESS_KEY_SECRET` | OSS |
| `ALIYUN_GREEN_ACCESS_KEY_ID` / `ALIYUN_GREEN_ACCESS_KEY_SECRET` | 鍐呭瀹夊叏 |
| `LANGCHAIN4J_API_KEY` | AI锛堥€氫箟鍏煎鎺ュ彛锛?|
| `STEAM_API_KEY` | Steam |

## 鍙€夛紙鏈夊畨鍏ㄩ粯璁ゅ€硷級

`TFHERS_DB_URL`銆乣TFHERS_DB_USERNAME`銆乣ALIYUN_OSS_BUCKET`銆乣ALIYUN_OSS_ENDPOINT`銆乣ALIYUN_OSS_DOMAIN`銆乣STEAM_RETURN_URL`銆乣STEAM_REALM`銆乣TFHERS_MANAGEMENT_BASE_URL`銆丟reen 鐨?region/endpoint/service/fail-open銆?
## 涓ょ鏈湴鍋氭硶锛堜簩閫変竴鎴栨贩鐢級

### A. 绯荤粺 / IDE 鐜鍙橀噺锛堟帹鑽愯创杩戠敓浜э級

鍦?Windows 鐢ㄦ埛鐜鍙橀噺鎴?IntelliJ Run Configuration 鈫?Environment variables 涓～鍏ヤ笂琛ㄥ彉閲忥紝鐩存帴鍚姩锛屾棤闇€ `application-local.yml`銆?
### B. Spring profile `local`

1. 澶嶅埗 `application-local.yml.example` 鈫?鍚岀洰褰?`application-local.yml`锛堝凡琚?gitignore锛?2. 濉叆鐪熷疄鍊?3. 鍚姩鍙傛暟鍔?`--spring.profiles.active=local`锛屾垨 IDE Active profiles 濉?`local`

娉ㄦ剰锛歚local` 鏂囦欢閲岀殑鏄庢枃浼氳鐩栧悓鍚嶉厤缃紱涓嶈鎶婅鏂囦欢鎻愪氦鍒?Git銆?
## 杞崲瀵嗛挜锛堥噸瑕侊級

鏃у瘑閽ユ浘鍑虹幇鍦?Git 鍘嗗彶涓殑 `application.yml` 閲屻€傞厤缃幆澧冨彉閲忓悗璇峰敖蹇細

1. 鍦ㄩ樋閲屼簯 RAM **杞崲 / 绂佺敤** 鏃?AccessKey锛圤SS + Green锛?2. 鏇存崲鏁版嵁搴撳瘑鐮併€乣JWT_SECRET`銆丼team API Key銆侀€氫箟 API Key
3. 鍙€夎繘闃讹細鐢?`git filter-repo` / BFG 娓呯悊鍘嗗彶锛堜細鏀瑰啓鎻愪氦锛岄渶鍏ㄥ憳閰嶅悎锛?
浠呮敼褰撳墠鏂囦欢**涓嶈兘**浠庢棫 commit 閲屾姽鎺夊凡娉勯湶鐨勬槑鏂囥€?
## node_modules

鏍圭洰褰曟浘缁忚鎻愪氦杩囦竴浠?`node_modules/`锛堟棫鍓嶇娈嬬暀锛屾病鏈夐厤濂楃殑 `package.json`锛夈€傚畠宸蹭粠 Git 绱㈠紩绉婚櫎銆俙.gitignore` 蹇界暐鏍圭洰褰曞拰 `frontend/` 涓嬬殑 `node_modules/`銆備緷璧栧彧瀹夎鍦?`frontend/`銆?
## Linux 鐢熶骇锛坰ystemd EnvironmentFile锛?
瑙佸悓鐩綍璇存槑涓殑銆孡inux CentOS Stream 9銆嶆楠わ紝鎴栫埗浠ｇ悊缁欏嚭鐨勬搷浣滄竻鍗曪細鎶婂瘑閽ュ啓鍦?`/etc/tfhers/tfhers.env`锛堟潈闄?600锛夛紝鍦?service 閲?`EnvironmentFile=-/etc/tfhers/tfhers.env`銆?

## CORS 白名单（P0）

| 变量 | 说明 |
|------|------|
| `CORS_ALLOWED_ORIGINS` | 逗号分隔的允许 Origin。生产**不要**写 `*`。 |

- 未设环境变量时：`application.yml` 默认放行常见 localhost（Vite/本机端口）。
- `--spring.profiles.active=dev`：默认 `*`（便于本地联调），仍可用环境变量收紧。
- `--spring.profiles.active=prod`：默认 `http://8.155.136.50`（演示站），正式前端域名务必写入 `CORS_ALLOWED_ORIGINS`。
- 控制器上的 `@CrossOrigin(origins="*")` 已移除，只走中央 `WebConfig`。


## Steam bind success redirect (FRONTEND_BASE_URL)

Production must set:

`
STEAM_RETURN_URL=http://8.155.136.50/api/user/steam/callback
STEAM_REALM=http://8.155.136.50
FRONTEND_BASE_URL=http://8.155.136.50
`

FRONTEND_BASE_URL maps to 	fhers.frontend.base-url. After a successful Steam bind, Location is {FRONTEND_BASE_URL}/settings. Local default is http://localhost:5173.
