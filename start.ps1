# ============================================================================
# Thermal Printer Application - Production Startup Script (PowerShell)
# ============================================================================
# Usage:
#   .\start.ps1              - Install & run both frontend and backend (default)
#   .\start.ps1 frontend     - Install & run frontend only
#   .\start.ps1 backend      - Install & run backend only
#   .\start.ps1 install      - Install dependencies only
# ============================================================================

param(
    [Parameter(Position=0)]
    [ValidateSet('both', 'frontend', 'backend', 'install')]
    [string]$Mode = 'both'
)

# Configuration
$FRONTEND_PORT = 5173
$BACKEND_PORT = 3001
$LOG_DIR = "logs"
$TIMESTAMP = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"

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
    Write-Banner "Starting Backend Server"
    
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
    
    Write-ColorOutput "  Starting backend on http://localhost:$BACKEND_PORT" $COLOR_GREEN
    Write-ColorOutput "  Log: $LOG_DIR\backend-$TIMESTAMP.log" $COLOR_YELLOW
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
    Write-Banner "Starting Frontend Server"
    
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
    
    Write-ColorOutput "  Starting frontend on http://localhost:$FRONTEND_PORT" $COLOR_GREEN
    Write-ColorOutput "  Log: $LOG_DIR\frontend-$TIMESTAMP.log" $COLOR_YELLOW
    Write-Host ""
    
    $job = Start-Job -ScriptBlock {
        param($logPath)
        npm run dev 2>&1 | Tee-Object -FilePath $logPath
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
        "backend" {
            Install-Dependencies "backend"
            Start-Backend
            Write-ColorOutput "
╔═══════════════════════════════════════════════════════════╗
║  Backend Server Running                                   ║
║                                                           ║
║  API:  http://localhost:$BACKEND_PORT                           ║
║  Logs: $LOG_DIR\backend-$TIMESTAMP.log       ║
║                                                           ║
║  Press Ctrl+C to stop                                     ║
╚═══════════════════════════════════════════════════════════╝" $COLOR_GREEN
            Read-Host "`nPress Enter to stop"
        }
        "frontend" {
            Install-Dependencies "frontend"
            Start-Frontend
            Write-ColorOutput "
╔═══════════════════════════════════════════════════════════╗
║  Frontend Server Running                                  ║
║                                                           ║
║  Web:  http://localhost:$FRONTEND_PORT                          ║
║  Logs: $LOG_DIR\frontend-$TIMESTAMP.log      ║
║                                                           ║
║  Press Ctrl+C to stop                                     ║
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
║  Application Running                                      ║
║                                                           ║
║  Frontend: http://localhost:$FRONTEND_PORT                      ║
║  Backend:  http://localhost:$BACKEND_PORT                       ║
║                                                           ║
║  Logs: $LOG_DIR\                                         ║
║                                                           ║
║  Press Ctrl+C or Enter to stop                            ║
╚═══════════════════════════════════════════════════════════╝" $COLOR_GREEN
            Read-Host "`nPress Enter to stop"
        }
    }
} finally {
    Stop-Services
}

