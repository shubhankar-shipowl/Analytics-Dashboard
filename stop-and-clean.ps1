# Script to stop all servers, close database connections, and clear cache
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Stopping Servers & Cleaning Cache" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Stop processes on ports 3000 and 5000
Write-Host "🛑 Stopping processes on ports 3000 and 5000..." -ForegroundColor Yellow

$ports = @(3000, 5000)
foreach ($port in $ports) {
    $connections = netstat -ano | findstr ":$port" | findstr "LISTENING"
    if ($connections) {
        foreach ($line in $connections) {
            $parts = $line -split '\s+'
            $pid = $parts[-1]
            if ($pid -and $pid -ne "0") {
                try {
                    Write-Host "  Stopping process on port $port (PID: $pid)..." -ForegroundColor Gray
                    Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                    Write-Host "  ✅ Stopped process $pid" -ForegroundColor Green
                } catch {
                    Write-Host "  ⚠️  Could not stop process $pid (may already be stopped)" -ForegroundColor Yellow
                }
            }
        }
    } else {
        Write-Host "  ✅ No process running on port $port" -ForegroundColor Green
    }
}

Start-Sleep -Seconds 2

# Stop all Node.js processes (if any remain)
Write-Host ""
Write-Host "🛑 Stopping remaining Node.js processes..." -ForegroundColor Yellow
$nodeProcesses = Get-Process -Name "node" -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    foreach ($proc in $nodeProcesses) {
        try {
            Write-Host "  Stopping Node.js process (PID: $($proc.Id))..." -ForegroundColor Gray
            Stop-Process -Id $proc.Id -Force -ErrorAction SilentlyContinue
            Write-Host "  ✅ Stopped Node.js process $($proc.Id)" -ForegroundColor Green
        } catch {
            Write-Host "  ⚠️  Could not stop process $($proc.Id)" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "  ✅ No Node.js processes running" -ForegroundColor Green
}

Start-Sleep -Seconds 1

# Clear npm cache
Write-Host ""
Write-Host "🧹 Clearing npm cache..." -ForegroundColor Yellow
try {
    npm cache clean --force
    Write-Host "  ✅ npm cache cleared" -ForegroundColor Green
} catch {
    Write-Host "  ⚠️  Error clearing npm cache: $_" -ForegroundColor Yellow
}

# Clear React build cache
Write-Host ""
Write-Host "🧹 Clearing React build cache..." -ForegroundColor Yellow
if (Test-Path "build") {
    Remove-Item -Recurse -Force "build" -ErrorAction SilentlyContinue
    Write-Host "  ✅ Build folder removed" -ForegroundColor Green
} else {
    Write-Host "  ✅ No build folder found" -ForegroundColor Green
}

# Clear .cache folder (if exists)
if (Test-Path ".cache") {
    Remove-Item -Recurse -Force ".cache" -ErrorAction SilentlyContinue
    Write-Host "  ✅ .cache folder removed" -ForegroundColor Green
}

# Clear backend logs (optional - keep for debugging)
Write-Host ""
Write-Host "🧹 Clearing backend logs..." -ForegroundColor Yellow
if (Test-Path "backend\logs") {
    Get-ChildItem "backend\logs\*.log" | Remove-Item -Force -ErrorAction SilentlyContinue
    Write-Host "  ✅ Backend log files cleared" -ForegroundColor Green
} else {
    Write-Host "  ✅ No log files to clear" -ForegroundColor Green
}

# Clear backend uploads (optional)
Write-Host ""
Write-Host "🧹 Clearing backend uploads..." -ForegroundColor Yellow
if (Test-Path "backend\uploads") {
    Get-ChildItem "backend\uploads\*" -Exclude ".gitkeep" | Remove-Item -Force -ErrorAction SilentlyContinue
    Write-Host "  ✅ Backend uploads cleared" -ForegroundColor Green
} else {
    Write-Host "  ✅ No uploads to clear" -ForegroundColor Green
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  ✅ Cleanup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "All servers stopped, database connections closed, and cache cleared." -ForegroundColor Green
Write-Host ""

