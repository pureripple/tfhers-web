@echo off
echo 启动蹄斗族群助手应用...

echo.
echo 正在启动管理系统 (端口 8081)...
start "管理系统" cmd /k "cd tfhers-web-management && mvn spring-boot:run"

echo.
echo 等待管理系统启动...
timeout /t 10 /nobreak > nul

echo.
echo 正在启动前端应用 (端口 8080)...
start "前端应用" cmd /k "cd tfhers-web-app && mvn spring-boot:run"

echo.
echo 应用启动完成！
echo 管理系统: http://localhost:8081
echo 前端应用: http://localhost:8080
echo.
echo 按任意键退出...
pause > nul
