# Script to start both Backend and Frontend servers
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Starting Dashboard Application" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js is not installed or not in PATH" -ForegroundColor Red
    exit 1
}

# Start Backend Server
Write-Host ""
Write-Host "🚀 Starting Backend Server (Port 5000)..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot\backend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '=== BACKEND SERVER ===' -ForegroundColor Green; Write-Host 'Port: 5000' -ForegroundColor Cyan; Write-Host 'API: http://localhost:5000/api' -ForegroundColor Cyan; Write-Host ''; node server.js" -WindowStyle Normal

Start-Sleep -Seconds 2

# Start Frontend Server
Write-Host "🚀 Starting Frontend Server (Port 3000)..." -ForegroundColor Yellow
Set-Location "$PSScriptRoot"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Write-Host '=== FRONTEND REACT APP ===' -ForegroundColor Cyan; Write-Host 'Port: 3000' -ForegroundColor Yellow; Write-Host 'URL: http://localhost:3000' -ForegroundColor Yellow; Write-Host ''; npm start" -WindowStyle Normal

Write-Host ""
Write-Host "✅ Both servers are starting..." -ForegroundColor Green
Write-Host ""
Write-Host "Backend API:  http://localhost:5000/api" -ForegroundColor Cyan
Write-Host "Frontend App: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""
Write-Host "Note: Frontend may take 30-60 seconds to compile initially" -ForegroundColor Gray
Write-Host ""
Write-Host "Press Ctrl+C in each window to stop the servers" -ForegroundColor Gray

