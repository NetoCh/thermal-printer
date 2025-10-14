# ============================================================================
# Thermal Printer Application - Production Startup Script (PowerShell)
# ============================================================================
# Usage:
#   .\start.ps1              - Install & run both frontend and backend (PRODUCTION)
#   .\start.ps1 frontend     - Install & run frontend only (PRODUCTION)
#   .\start.ps1 backend      - Install & run backend only
#   .\start.ps1 install      - Install dependencies only
#   .\start.ps1 print        - Print server info to thermal printer
# ============================================================================

param(
    [Parameter(Position=0)]
    [ValidateSet('both', 'frontend', 'backend', 'install', 'print')]
    [string]$Mode = 'both'
)

# Configuration
$FRONTEND_PORT = 4173  # Production preview port
$BACKEND_PORT = 3001
$LOG_DIR = "logs"
$TIMESTAMP = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

# Get local IP address
function Get-LocalIPAddress {
    try {
        $ipConfig = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
            $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*"
        } | Select-Object -First 1
        return $ipConfig.IPAddress
    } catch {
        return "localhost"
    }
}

$LOCAL_IP = Get-LocalIPAddress

# Colors
$COLOR_GREEN = "Green"
$COLOR_RED = "Red"
$COLOR_YELLOW = "Yellow"
$COLOR_CYAN = "Cyan"
$COLOR_WHITE = "White"

# ============================================================================
# Helper Functions
# ============================================================================

function Write-ColorOutput {
    param(
        [string]$Message,
        [string]$Color = "White"
    )
    Write-Host $Message -ForegroundColor $Color
}

function Write-Banner {
    param([string]$Text)
    Write-Host ""
    Write-ColorOutput "╔══════════════════════════════════════════════════════════╗" $COLOR_CYAN
    Write-ColorOutput "║  $Text" $COLOR_CYAN
    Write-ColorOutput "╚══════════════════════════════════════════════════════════╝" $COLOR_CYAN
    Write-Host ""
}

function Test-Command {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

function Test-Port {
    param([int]$Port)
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        return ($null -ne $connection)
    } catch {
        return $false
    }
}

function Stop-ProcessOnPort {
    param([int]$Port)
    try {
        $connections = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
        if ($connections) {
            $processes = $connections | Select-Object -ExpandProperty OwningProcess -Unique
            foreach ($proc in $processes) {
                Stop-Process -Id $proc -Force -ErrorAction SilentlyContinue
                Write-ColorOutput "  ✓ Stopped process $proc on port $Port" $COLOR_GREEN
            }
            Start-Sleep -Seconds 2
        }
    } catch {
        Write-ColorOutput "  ⚠ Could not stop process on port $Port" $COLOR_YELLOW
    }
}

# ============================================================================
# Prerequisite Checks
# ============================================================================

function Test-Prerequisites {
    Write-Banner "Checking Prerequisites"
    
    $allGood = $true
    
    if (Test-Command "node") {
        $nodeVersion = node --version
        Write-ColorOutput "  ✓ Node.js: $nodeVersion" $COLOR_GREEN
    } else {
        Write-ColorOutput "  ✗ Node.js is not installed!" $COLOR_RED
        Write-ColorOutput "    Download from: https://nodejs.org/" $COLOR_YELLOW
        $allGood = $false
    }
    
    if (Test-Command "npm") {
        $npmVersion = npm --version
        Write-ColorOutput "  ✓ npm: v$npmVersion" $COLOR_GREEN
    } else {
        Write-ColorOutput "  ✗ npm is not installed!" $COLOR_RED
        $allGood = $false
    }
    
    if (-not $allGood) {
        Write-Host ""
        Write-ColorOutput "Please install missing prerequisites before continuing." $COLOR_RED
        exit 1
    }
    
    Write-Host ""
}

# ============================================================================
# Installation Functions
# ============================================================================

function Install-Dependencies {
    param([string]$Target = "all")
    
    Write-Banner "Installing Dependencies"
    
    if (-not (Test-Path $LOG_DIR)) {
        New-Item -ItemType Directory -Path $LOG_DIR | Out-Null
        Write-ColorOutput "  ✓ Created logs directory" $COLOR_GREEN
    }
    
    if ($Target -eq "all" -or $Target -eq "backend") {
        Write-ColorOutput "`n[Backend] Installing dependencies..." $COLOR_CYAN
        Push-Location server
        try {
            npm install --production 2>&1 | Tee-Object -FilePath "..\$LOG_DIR\backend-install-$TIMESTAMP.log" | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "  ✓ Backend dependencies installed" $COLOR_GREEN
            } else {
                throw "Installation failed"
            }
        } catch {
            Write-ColorOutput "  ✗ Backend installation failed. Check logs." $COLOR_RED
            Pop-Location
            exit 1
        }
        Pop-Location
    }
    
    if ($Target -eq "all" -or $Target -eq "frontend") {
        Write-ColorOutput "`n[Frontend] Installing dependencies..." $COLOR_CYAN
        try {
            npm install 2>&1 | Tee-Object -FilePath "$LOG_DIR\frontend-install-$TIMESTAMP.log" | Out-Null
            if ($LASTEXITCODE -eq 0) {
                Write-ColorOutput "  ✓ Frontend dependencies installed" $COLOR_GREEN
            } else {
                throw "Installation failed"
            }
        } catch {
            Write-ColorOutput "  ✗ Frontend installation failed. Check logs." $COLOR_RED
            exit 1
        }
    }
    
    Write-Host ""
}

# ============================================================================
# Startup Functions
# ============================================================================

function Start-Backend {
    Write-Banner "Starting Backend Server (Production)"
    
    if (Test-Port $BACKEND_PORT) {
        Write-ColorOutput "  ⚠ Port $BACKEND_PORT is in use" $COLOR_YELLOW
        $response = Read-Host "  Kill existing process? (y/N)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            Stop-ProcessOnPort $BACKEND_PORT
        } else {
            Write-ColorOutput "  ✗ Cannot start - port in use" $COLOR_RED
            exit 1
        }
    }
    
    Write-ColorOutput "  🌐 Local:   http://localhost:$BACKEND_PORT" $COLOR_GREEN
    Write-ColorOutput "  🌐 Network: http://${LOCAL_IP}:$BACKEND_PORT" $COLOR_GREEN
    Write-ColorOutput "  📝 Log: $LOG_DIR\backend-$TIMESTAMP.log" $COLOR_YELLOW
    Write-Host ""
    
    Push-Location server
    $job = Start-Job -ScriptBlock {
        param($logPath)
        npm start 2>&1 | Tee-Object -FilePath $logPath
    } -ArgumentList "..\$LOG_DIR\backend-$TIMESTAMP.log"
    $job.Id | Out-File -FilePath "..\$LOG_DIR\backend.pid"
    Pop-Location
    
    Write-ColorOutput "  Waiting for backend..." $COLOR_CYAN
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Port $BACKEND_PORT) {
            Write-ColorOutput "  ✓ Backend is running!" $COLOR_GREEN
            Write-Host ""
            return
        }
    }
    
    Write-ColorOutput "  ⚠ Backend may not have started. Check logs." $COLOR_YELLOW
    Write-Host ""
}

function Start-Frontend {
    Write-Banner "Starting Frontend Server (Production)"
    
    if (Test-Port $FRONTEND_PORT) {
        Write-ColorOutput "  ⚠ Port $FRONTEND_PORT is in use" $COLOR_YELLOW
        $response = Read-Host "  Kill existing process? (y/N)"
        if ($response -eq 'y' -or $response -eq 'Y') {
            Stop-ProcessOnPort $FRONTEND_PORT
        } else {
            Write-ColorOutput "  ✗ Cannot start - port in use" $COLOR_RED
            exit 1
        }
    }
    
    Write-ColorOutput "  🔨 Building production bundle..." $COLOR_CYAN
    Write-Host ""
    
    # Build first
    npm run build 2>&1 | Tee-Object -FilePath "$LOG_DIR\frontend-build-$TIMESTAMP.log" | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "  ✓ Build completed successfully" $COLOR_GREEN
        Write-Host ""
    } else {
        Write-ColorOutput "  ✗ Build failed. Check logs for details." $COLOR_RED
        exit 1
    }
    
    Write-ColorOutput "  🌐 Local:   http://localhost:$FRONTEND_PORT" $COLOR_GREEN
    Write-ColorOutput "  🌐 Network: http://${LOCAL_IP}:$FRONTEND_PORT" $COLOR_GREEN
    Write-ColorOutput "  📝 Log: $LOG_DIR\frontend-$TIMESTAMP.log" $COLOR_YELLOW
    Write-Host ""
    
    # Start frontend preview in background
    $job = Start-Job -ScriptBlock {
        param($logPath)
        npm run preview 2>&1 | Tee-Object -FilePath $logPath
    } -ArgumentList "$LOG_DIR\frontend-$TIMESTAMP.log"
    $job.Id | Out-File -FilePath "$LOG_DIR\frontend.pid"
    
    Write-ColorOutput "  Waiting for frontend..." $COLOR_CYAN
    for ($i = 0; $i -lt 30; $i++) {
        Start-Sleep -Seconds 1
        if (Test-Port $FRONTEND_PORT) {
            Write-ColorOutput "  ✓ Frontend is running!" $COLOR_GREEN
            Write-Host ""
            return
        }
    }
    
    Write-ColorOutput "  ⚠ Frontend may not have started. Check logs." $COLOR_YELLOW
    Write-Host ""
}

# ============================================================================
# Print to Thermal Printer Function
# ============================================================================

function Print-ToThermalPrinter {
    Write-Banner "Printing Server Info to Thermal Printer"
    
    # Check if backend is running
    if (-not (Test-Port $BACKEND_PORT)) {
        Write-ColorOutput "  ✗ Backend is not running on port $BACKEND_PORT" $COLOR_RED
        Write-ColorOutput "  Start backend first with: .\start.ps1 backend" $COLOR_YELLOW
        return
    }
    
    Write-ColorOutput "  Sending print job to thermal printer..." $COLOR_CYAN
    
    # Get server info and format it for printing
    $printText = "THERMAL PRINTER SERVER`n`n"
    $printText += "Frontend URLs:`n"
    $printText += "Local:   http://localhost:$FRONTEND_PORT`n"
    $printText += "Network: http://${LOCAL_IP}:$FRONTEND_PORT`n`n"
    $printText += "Backend API URLs:`n"
    $printText += "Local:   http://localhost:$BACKEND_PORT`n"
    $printText += "Network: http://${LOCAL_IP}:$BACKEND_PORT`n`n"
    $printText += "Started: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"
    $printText += "IP Address: $LOCAL_IP"
    
    # Prepare JSON payload
    $jsonPayload = @{
        text = $printText
        customText = "Hard Plot Center - Server Info"
        timestamp = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
    } | ConvertTo-Json
    
    try {
        # Send to printer via API
        $response = Invoke-RestMethod -Uri "http://localhost:$BACKEND_PORT/api/printer/print" `
            -Method Post `
            -Headers @{"Content-Type"="application/json"} `
            -Body $jsonPayload `
            -ErrorAction Stop
        
        if ($response.success) {
            Write-ColorOutput "  ✓ Server info printed successfully!" $COLOR_GREEN
            Write-Host ""
            Write-ColorOutput "  Printed information:" $COLOR_WHITE
            Write-ColorOutput "  ─────────────────────────────────────────" $COLOR_CYAN
            Write-ColorOutput "  📱 Frontend: http://${LOCAL_IP}:$FRONTEND_PORT" $COLOR_WHITE
            Write-ColorOutput "  🔌 Backend:  http://${LOCAL_IP}:$BACKEND_PORT" $COLOR_WHITE
            Write-ColorOutput "  ─────────────────────────────────────────" $COLOR_CYAN
        } else {
            Write-ColorOutput "  ✗ Failed to print server info" $COLOR_RED
            Write-ColorOutput "  Make sure a printer is connected" $COLOR_YELLOW
        }
    } catch {
        Write-ColorOutput "  ✗ Failed to print server info" $COLOR_RED
        Write-ColorOutput "  Make sure a printer is connected" $COLOR_YELLOW
        Write-ColorOutput "  Error: $($_.Exception.Message)" $COLOR_YELLOW
    }
    
    Write-Host ""
}

# ============================================================================
# Cleanup
# ============================================================================

function Stop-Services {
    Write-ColorOutput "`nShutting down services..." $COLOR_YELLOW
    
    if (Test-Path "$LOG_DIR\frontend.pid") {
        $jobId = Get-Content "$LOG_DIR\frontend.pid"
        Stop-Job -Id $jobId -ErrorAction SilentlyContinue
        Remove-Job -Id $jobId -ErrorAction SilentlyContinue
        Remove-Item "$LOG_DIR\frontend.pid" -ErrorAction SilentlyContinue
        Write-ColorOutput "  ✓ Frontend stopped" $COLOR_GREEN
    }
    
    if (Test-Path "$LOG_DIR\backend.pid") {
        $jobId = Get-Content "$LOG_DIR\backend.pid"
        Stop-Job -Id $jobId -ErrorAction SilentlyContinue
        Remove-Job -Id $jobId -ErrorAction SilentlyContinue
        Remove-Item "$LOG_DIR\backend.pid" -ErrorAction SilentlyContinue
        Write-ColorOutput "  ✓ Backend stopped" $COLOR_GREEN
    }
}

# ============================================================================
# Main
# ============================================================================

try {
    Clear-Host
    
    Write-ColorOutput "╔═══════════════════════════════════════════════════════════╗" $COLOR_CYAN
    Write-ColorOutput "║                                                           ║" $COLOR_CYAN
    Write-ColorOutput "║         Thermal Printer Application Manager              ║" $COLOR_CYAN
    Write-ColorOutput "║                   Production Script                      ║" $COLOR_CYAN
    Write-ColorOutput "║                                                           ║" $COLOR_CYAN
    Write-ColorOutput "╚═══════════════════════════════════════════════════════════╝" $COLOR_CYAN
    
    Write-Host ""
    Write-ColorOutput "Mode: $Mode" $COLOR_GREEN
    Write-ColorOutput "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" $COLOR_GREEN
    Write-Host ""
    
    Test-Prerequisites
    
    switch ($Mode) {
        "install" {
            Install-Dependencies "all"
            Write-ColorOutput "Installation complete! Run '.\start.ps1' to start." $COLOR_GREEN
        }
        "print" {
            Print-ToThermalPrinter
        }
        "backend" {
            Install-Dependencies "backend"
            Start-Backend
            Write-ColorOutput "
╔═══════════════════════════════════════════════════════════╗
║  Backend Server Started (Production)                      ║
║                                                           ║
║  🌐 Local:   http://localhost:$BACKEND_PORT                     ║
║  🌐 Network: http://${LOCAL_IP}:$BACKEND_PORT           ║
║                                                           ║
║  📝 Logs: $LOG_DIR\backend-$TIMESTAMP.log    ║
║                                                           ║
║  💡 Access from other devices at:                         ║
║     http://${LOCAL_IP}:$BACKEND_PORT                  ║
║                                                           ║
║  Press Ctrl+C or Enter to stop                            ║
╚═══════════════════════════════════════════════════════════╝" $COLOR_GREEN
            
            # Ask if user wants to print server info
            Write-Host ""
            $printResponse = Read-Host "Print server info to thermal printer? (y/N)"
            if ($printResponse -eq 'y' -or $printResponse -eq 'Y') {
                Start-Sleep -Seconds 2
                Print-ToThermalPrinter
            }
            
            Read-Host "`nPress Enter to stop"
        }
        "frontend" {
            Install-Dependencies "frontend"
            Start-Frontend
            Write-ColorOutput "
╔═══════════════════════════════════════════════════════════╗
║  Frontend Server Started (Production)                     ║
║                                                           ║
║  🌐 Local:   http://localhost:$FRONTEND_PORT                    ║
║  🌐 Network: http://${LOCAL_IP}:$FRONTEND_PORT          ║
║                                                           ║
║  📝 Logs: $LOG_DIR\frontend-$TIMESTAMP.log   ║
║                                                           ║
║  💡 Access from other devices at:                         ║
║     http://${LOCAL_IP}:$FRONTEND_PORT                 ║
║                                                           ║
║  📱 Scan QR code or share URL with mobile devices         ║
║                                                           ║
║  Press Ctrl+C or Enter to stop                            ║
╚═══════════════════════════════════════════════════════════╝" $COLOR_GREEN
            Read-Host "`nPress Enter to stop"
        }
        "both" {
            Install-Dependencies "all"
            Start-Backend
            Start-Sleep -Seconds 3
            Start-Frontend
            Write-ColorOutput "
╔═══════════════════════════════════════════════════════════╗
║  🎉 Application Started Successfully! (Production)        ║
║                                                           ║
║  📱 Frontend (Web UI):                                    ║
║     Local:   http://localhost:$FRONTEND_PORT                    ║
║     Network: http://${LOCAL_IP}:$FRONTEND_PORT          ║
║                                                           ║
║  🔌 Backend (API):                                        ║
║     Local:   http://localhost:$BACKEND_PORT                     ║
║     Network: http://${LOCAL_IP}:$BACKEND_PORT           ║
║                                                           ║
║  📝 Logs: $LOG_DIR\                          ║
║                                                           ║
║  💡 NETWORK ACCESS:                                       ║
║     Open http://${LOCAL_IP}:$FRONTEND_PORT on any device   ║
║     connected to your WiFi network!                       ║
║                                                           ║
║  🖨️  To print this info, press 'p' then Enter             ║
║  📖 Full API docs: http://${LOCAL_IP}:$BACKEND_PORT/api/server/info    ║
║                                                           ║
║  Press Ctrl+C or Enter to stop                            ║
╚═══════════════════════════════════════════════════════════╝" $COLOR_GREEN
            
            # Ask if user wants to print server info
            Write-Host ""
            $printResponse = Read-Host "Print server info to thermal printer? (y/N)"
            if ($printResponse -eq 'y' -or $printResponse -eq 'Y') {
                Start-Sleep -Seconds 2
                Print-ToThermalPrinter
            }
            
            Read-Host "`nPress Enter to stop"
        }
    }
} finally {
    Stop-Services
}

