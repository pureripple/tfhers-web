@echo off
setlocal
cd /d "%~dp0"
echo Starting TFHers local stack...
echo.
echo [1/3] management :8081
start "TFHers-management-8081" /D "%~dp0tfhers-web-management" cmd /k mvn spring-boot:run
echo Waiting 10s...
timeout /t 10 /nobreak >nul
echo [2/3] app :8080
start "TFHers-app-8080" /D "%~dp0tfhers-web-app" cmd /k mvn spring-boot:run
echo [3/3] Vue Vite :5173
if not exist "%~dp0frontend\node_modules\" (
  start "TFHers-Vue-5173" /D "%~dp0frontend" cmd /k "npm install && npm run dev"
) else (
  start "TFHers-Vue-5173" /D "%~dp0frontend" cmd /k npm run dev
)
echo.
echo Open after Maven/Vite are ready:
echo   Vue UI:    http://127.0.0.1:5173/
echo   Vue admin: http://127.0.0.1:5173/admin/login
echo   Old app:   http://127.0.0.1:8080/
echo   Old admin: http://127.0.0.1:8081/
echo.
echo Vite proxies /api to 8080 and admin APIs to 8081.
echo Do not also Run the same ports in IDEA.
echo.
pause
