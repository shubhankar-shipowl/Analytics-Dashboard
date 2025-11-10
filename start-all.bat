@echo off
echo ========================================
echo   Starting Dashboard Application
echo ========================================
echo.

REM Start Backend
echo Starting Backend Server (Port 5000)...
start "Backend Server" cmd /k "cd backend && echo === BACKEND SERVER === && echo Port: 5000 && echo API: http://localhost:5000/api && echo. && node server.js"

timeout /t 2 /nobreak >nul

REM Start Frontend
echo Starting Frontend Server (Port 3000)...
start "Frontend React App" cmd /k "cd /d %~dp0 && echo === FRONTEND REACT APP === && echo Port: 3000 && echo URL: http://localhost:3000 && echo. && npm start"

echo.
echo Both servers are starting...
echo.
echo Backend API:  http://localhost:5000/api
echo Frontend App: http://localhost:3000
echo.
echo Note: Frontend may take 30-60 seconds to compile initially
echo.
pause

