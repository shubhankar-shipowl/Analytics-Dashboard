@echo off
echo ========================================
echo   Stopping Servers & Cleaning Cache
echo ========================================
echo.

echo Stopping processes on ports 3000 and 5000...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do (
    echo   Stopping process on port 3000 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! equ 0 (
        echo   Stopped process %%a
    )
)

for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5000" ^| findstr "LISTENING"') do (
    echo   Stopping process on port 5000 (PID: %%a)...
    taskkill /F /PID %%a >nul 2>&1
    if !errorlevel! equ 0 (
        echo   Stopped process %%a
    )
)

timeout /t 2 /nobreak >nul

echo.
echo Stopping remaining Node.js processes...
taskkill /F /IM node.exe >nul 2>&1
if !errorlevel! equ 0 (
    echo   Stopped Node.js processes
) else (
    echo   No Node.js processes running
)

timeout /t 1 /nobreak >nul

echo.
echo Clearing npm cache...
call npm cache clean --force
if !errorlevel! equ 0 (
    echo   npm cache cleared
) else (
    echo   Error clearing npm cache
)

echo.
echo Clearing React build cache...
if exist "build" (
    rmdir /s /q "build" >nul 2>&1
    echo   Build folder removed
) else (
    echo   No build folder found
)

if exist ".cache" (
    rmdir /s /q ".cache" >nul 2>&1
    echo   .cache folder removed
)

echo.
echo Clearing backend logs...
if exist "backend\logs\*.log" (
    del /q "backend\logs\*.log" >nul 2>&1
    echo   Backend log files cleared
) else (
    echo   No log files to clear
)

echo.
echo Clearing backend uploads...
if exist "backend\uploads" (
    for %%f in ("backend\uploads\*") do (
        if not "%%~nxf"==".gitkeep" (
            del /q "%%f" >nul 2>&1
        )
    )
    echo   Backend uploads cleared
) else (
    echo   No uploads to clear
)

echo.
echo ========================================
echo   Cleanup Complete!
echo ========================================
echo.
echo All servers stopped, database connections closed, and cache cleared.
echo.
pause

