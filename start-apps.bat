@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 启动蹄斗族群助手（本地开发）...
echo.

echo [1/3] 管理系统 Spring Boot :8081
start "TFHers management :8081" cmd /k "cd /d ""%~dp0tfhers-web-management"" && mvn spring-boot:run"

echo 等待管理端约 10 秒...
timeout /t 10 /nobreak >nul

echo [2/3] 用户端 Spring Boot :8080
start "TFHers app :8080" cmd /k "cd /d ""%~dp0tfhers-web-app"" && mvn spring-boot:run"

echo [3/3] Vue 前端 Vite :5173
if not exist "%~dp0frontend\node_modules\" (
  echo frontend\node_modules 不存在，先 npm install...
  start "TFHers Vue install" cmd /k "cd /d ""%~dp0frontend"" && npm install && npm run dev"
) else (
  start "TFHers Vue :5173" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"
)

echo.
echo 已打开 3 个窗口。请等 Maven / Vite 启动完成后再打开浏览器：
echo   Vue 新前端（日常开发用这个）: http://127.0.0.1:5173/
echo   Vue 管理端登录:               http://127.0.0.1:5173/admin/login
echo   旧静态用户端（Spring）:       http://127.0.0.1:8080/
echo   旧静态管理端（Spring）:       http://127.0.0.1:8081/
echo.
echo 说明：Vite 会把 /api 代理到 8080，管理相关 API 代理到 8081。
echo 不需要再单独开 IDEA，除非你要断点调试；IDEA Run 与本脚本二选一即可，不要重复起同一端口。
echo.
pause