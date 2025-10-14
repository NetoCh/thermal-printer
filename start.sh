#!/bin/bash

# ============================================================================
# Thermal Printer Application - Production Startup Script (Bash)
# ============================================================================
# Usage:
#   ./start.sh              - Install & run both frontend and backend (PRODUCTION)
#   ./start.sh frontend     - Install & run frontend only (PRODUCTION)
#   ./start.sh backend      - Install & run backend only
#   ./start.sh install      - Install dependencies only
#   ./start.sh print        - Print server info to thermal printer
# ============================================================================

set -e  # Exit on error

# Configuration
FRONTEND_PORT=4173  # Production preview port
BACKEND_PORT=3001
LOG_DIR="logs"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
MODE="${1:-both}"

# Get local IP address
get_local_ip() {
    if command -v ip >/dev/null 2>&1; then
        # Linux
        ip route get 1 2>/dev/null | awk '{print $7}' | head -n 1
    elif command -v ifconfig >/dev/null 2>&1; then
        # macOS/BSD
        ifconfig | grep -Eo 'inet (addr:)?([0-9]*\.){3}[0-9]*' | grep -Eo '([0-9]*\.){3}[0-9]*' | grep -v '127.0.0.1' | head -n 1
    else
        echo "localhost"
    fi
}

LOCAL_IP=$(get_local_ip)

# Colors for output
COLOR_RESET='\033[0m'
COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[0;33m'
COLOR_BLUE='\033[0;34m'
COLOR_CYAN='\033[0;36m'
COLOR_WHITE='\033[0;37m'

# ============================================================================
# Helper Functions
# ============================================================================

print_color() {
    local color=$1
    shift
    echo -e "${color}$@${COLOR_RESET}"
}

print_banner() {
    echo ""
    print_color "$COLOR_CYAN" "╔══════════════════════════════════════════════════════════╗"
    print_color "$COLOR_CYAN" "║  $1"
    print_color "$COLOR_CYAN" "╚══════════════════════════════════════════════════════════╝"
    echo ""
}

command_exists() {
    command -v "$1" >/dev/null 2>&1
}

check_port() {
    local port=$1
    
    # Try lsof first (Unix/Linux/Mac)
    if command_exists lsof; then
        lsof -i :"$port" >/dev/null 2>&1
        return $?
    fi
    
    # Try netstat
    if command_exists netstat; then
        # Detect OS and use appropriate flags
        if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
            # Windows (Git Bash/MSYS/Cygwin)
            netstat -an 2>/dev/null | grep -q "LISTENING.*:$port"
            return $?
        else
            # Linux/Mac
            netstat -tuln 2>/dev/null | grep -q ":$port "
            return $?
        fi
    fi
    
    # Fallback to nc (netcat)
    if command_exists nc; then
        nc -z localhost "$port" 2>/dev/null
        return $?
    fi
    
    # If nothing works, return false
    return 1
}

kill_port() {
    local port=$1
    print_color "$COLOR_YELLOW" "  ⚠ Killing process on port $port..."
    
    # Windows (Git Bash/MSYS/Cygwin)
    if [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        # Find PID using netstat on Windows
        local pid=$(netstat -ano 2>/dev/null | grep "LISTENING.*:$port" | awk '{print $5}' | head -n 1)
        if [ ! -z "$pid" ] && [ "$pid" != "0" ]; then
            print_color "$COLOR_YELLOW" "  Stopping process PID: $pid"
            taskkill //F //PID "$pid" >/dev/null 2>&1 || true
            sleep 2
            print_color "$COLOR_GREEN" "  ✓ Port $port freed"
        else
            print_color "$COLOR_YELLOW" "  ⚠ Could not find process. Port may not be in use."
        fi
    # Unix/Linux/Mac
    elif command_exists lsof; then
        local pid=$(lsof -ti :"$port")
        if [ ! -z "$pid" ]; then
            print_color "$COLOR_YELLOW" "  Stopping process PID: $pid"
            kill -9 "$pid" 2>/dev/null || true
            sleep 2
            print_color "$COLOR_GREEN" "  ✓ Port $port freed"
        fi
    else
        print_color "$COLOR_YELLOW" "  ⚠ Cannot automatically kill process. Please free port $port manually."
        read -p "Press Enter when ready..." dummy
    fi
}

wait_for_port() {
    local port=$1
    local max_retries=30
    local retry_count=0
    
    print_color "$COLOR_CYAN" "  Waiting for service on port $port to start..."
    
    while [ $retry_count -lt $max_retries ]; do
        if check_port "$port"; then
            print_color "$COLOR_GREEN" "  ✓ Service is running on port $port!"
            return 0
        fi
        sleep 1
        retry_count=$((retry_count + 1))
    done
    
    print_color "$COLOR_YELLOW" "  ⚠ Service may not have started properly. Check logs."
    return 1
}

# ============================================================================
# Prerequisite Checks
# ============================================================================

check_prerequisites() {
    print_banner "Checking Prerequisites"
    
    local all_good=true
    
    # Check Node.js
    if command_exists node; then
        local node_version=$(node --version)
        print_color "$COLOR_GREEN" "  ✓ Node.js: $node_version"
    else
        print_color "$COLOR_RED" "  ✗ Node.js is not installed!"
        print_color "$COLOR_YELLOW" "    Download from: https://nodejs.org/"
        all_good=false
    fi
    
    # Check npm
    if command_exists npm; then
        local npm_version=$(npm --version)
        print_color "$COLOR_GREEN" "  ✓ npm: v$npm_version"
    else
        print_color "$COLOR_RED" "  ✗ npm is not installed!"
        all_good=false
    fi
    
    # Check for process management tools
    if command_exists lsof; then
        print_color "$COLOR_GREEN" "  ✓ lsof: available"
    elif command_exists netstat; then
        print_color "$COLOR_GREEN" "  ✓ netstat: available"
    elif command_exists nc; then
        print_color "$COLOR_GREEN" "  ✓ nc (netcat): available"
    else
        print_color "$COLOR_YELLOW" "  ⚠ No port checking tool found (lsof/netstat/nc)"
    fi
    
    if [ "$all_good" = false ]; then
        echo ""
        print_color "$COLOR_RED" "Please install missing prerequisites before continuing."
        exit 1
    fi
    
    echo ""
}

# ============================================================================
# Installation Functions
# ============================================================================

install_dependencies() {
    local target="${1:-all}"
    
    print_banner "Installing Dependencies"
    
    # Create logs directory
    if [ ! -d "$LOG_DIR" ]; then
        mkdir -p "$LOG_DIR"
        print_color "$COLOR_GREEN" "  ✓ Created logs directory"
    fi
    
    # Install backend dependencies
    if [ "$target" = "all" ] || [ "$target" = "backend" ]; then
        print_color "$COLOR_CYAN" "\n[Backend] Installing dependencies..."
        (
            cd server
            if npm install --production 2>&1 | tee "../$LOG_DIR/backend-install-$TIMESTAMP.log"; then
                print_color "$COLOR_GREEN" "  ✓ Backend dependencies installed successfully"
            else
                print_color "$COLOR_RED" "  ✗ Backend installation failed. Check logs for details."
                exit 1
            fi
        )
    fi
    
    # Install frontend dependencies
    if [ "$target" = "all" ] || [ "$target" = "frontend" ]; then
        print_color "$COLOR_CYAN" "\n[Frontend] Installing dependencies..."
        if npm install 2>&1 | tee "$LOG_DIR/frontend-install-$TIMESTAMP.log"; then
            print_color "$COLOR_GREEN" "  ✓ Frontend dependencies installed successfully"
        else
            print_color "$COLOR_RED" "  ✗ Frontend installation failed. Check logs for details."
            exit 1
        fi
    fi
    
    echo ""
}

# ============================================================================
# Startup Functions
# ============================================================================

start_backend() {
    print_banner "Starting Backend Server (Production)"
    
    # Check if port is already in use
    if check_port "$BACKEND_PORT"; then
        read -p "$(print_color "$COLOR_YELLOW" "  Port $BACKEND_PORT is in use. Kill it? (y/N): ")" -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill_port "$BACKEND_PORT"
        else
            print_color "$COLOR_RED" "  ✗ Cannot start backend - port already in use"
            exit 1
        fi
    fi
    
    print_color "$COLOR_GREEN" "  🌐 Local:   http://localhost:$BACKEND_PORT"
    print_color "$COLOR_GREEN" "  🌐 Network: http://$LOCAL_IP:$BACKEND_PORT"
    print_color "$COLOR_YELLOW" "  📝 Log file: $LOG_DIR/backend-$TIMESTAMP.log"
    echo ""
    
    # Start backend in background
    (
        cd server
        npm start 2>&1 | tee "../$LOG_DIR/backend-$TIMESTAMP.log" &
        echo $! > "../$LOG_DIR/backend.pid"
    )
    
    # Wait for backend to start
    wait_for_port "$BACKEND_PORT"
    echo ""
}

start_frontend() {
    print_banner "Starting Frontend Server (Production)"
    
    # Check if port is already in use
    if check_port "$FRONTEND_PORT"; then
        read -p "$(print_color "$COLOR_YELLOW" "  Port $FRONTEND_PORT is in use. Kill it? (y/N): ")" -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            kill_port "$FRONTEND_PORT"
        else
            print_color "$COLOR_RED" "  ✗ Cannot start frontend - port already in use"
            exit 1
        fi
    fi
    
    print_color "$COLOR_CYAN" "  🔨 Building production bundle..."
    echo ""
    
    # Build first
    if npm run build 2>&1 | tee "$LOG_DIR/frontend-build-$TIMESTAMP.log"; then
        print_color "$COLOR_GREEN" "  ✓ Build completed successfully"
        echo ""
    else
        print_color "$COLOR_RED" "  ✗ Build failed. Check logs for details."
        exit 1
    fi
    
    print_color "$COLOR_GREEN" "  🌐 Local:   http://localhost:$FRONTEND_PORT"
    print_color "$COLOR_GREEN" "  🌐 Network: http://$LOCAL_IP:$FRONTEND_PORT"
    print_color "$COLOR_YELLOW" "  📝 Log file: $LOG_DIR/frontend-$TIMESTAMP.log"
    echo ""
    
    # Start frontend preview in background
    npm run preview 2>&1 | tee "$LOG_DIR/frontend-$TIMESTAMP.log" &
    echo $! > "$LOG_DIR/frontend.pid"
    
    # Wait for frontend to start
    wait_for_port "$FRONTEND_PORT"
    echo ""
}

# ============================================================================
# Cleanup Functions
# ============================================================================

cleanup() {
    echo ""
    print_color "$COLOR_YELLOW" "Shutting down..."
    
    # Kill frontend
    if [ -f "$LOG_DIR/frontend.pid" ]; then
        local frontend_pid=$(cat "$LOG_DIR/frontend.pid")
        if ps -p "$frontend_pid" > /dev/null 2>&1; then
            print_color "$COLOR_YELLOW" "  Stopping frontend (PID: $frontend_pid)"
            kill "$frontend_pid" 2>/dev/null || true
            rm "$LOG_DIR/frontend.pid"
        fi
    fi
    
    # Kill backend
    if [ -f "$LOG_DIR/backend.pid" ]; then
        local backend_pid=$(cat "$LOG_DIR/backend.pid")
        if ps -p "$backend_pid" > /dev/null 2>&1; then
            print_color "$COLOR_YELLOW" "  Stopping backend (PID: $backend_pid)"
            kill "$backend_pid" 2>/dev/null || true
            rm "$LOG_DIR/backend.pid"
        fi
    fi
    
    print_color "$COLOR_GREEN" "  ✓ Cleanup complete"
    exit 0
}

# Trap Ctrl+C and call cleanup
trap cleanup INT TERM

# ============================================================================
# Print to Thermal Printer Function
# ============================================================================

print_to_thermal_printer() {
    print_banner "Printing Server Info to Thermal Printer"
    
    # Check if backend is running
    if ! check_port "$BACKEND_PORT"; then
        print_color "$COLOR_RED" "  ✗ Backend is not running on port $BACKEND_PORT"
        print_color "$COLOR_YELLOW" "  Start backend first with: ./start.sh backend"
        return 1
    fi
    
    print_color "$COLOR_CYAN" "  Sending print job to thermal printer..."
    
    # Get server info and format it for printing
    local print_text="THERMAL PRINTER SERVER\n\n"
    print_text+="Frontend URLs:\n"
    print_text+="Local:   http://localhost:$FRONTEND_PORT\n"
    print_text+="Network: http://$LOCAL_IP:$FRONTEND_PORT\n\n"
    print_text+="Backend API URLs:\n"
    print_text+="Local:   http://localhost:$BACKEND_PORT\n"
    print_text+="Network: http://$LOCAL_IP:$BACKEND_PORT\n\n"
    print_text+="Started: $(date '+%Y-%m-%d %H:%M:%S')\n"
    print_text+="IP Address: $LOCAL_IP"
    
    # Send to printer via API
    local response=$(curl -s -X POST "http://localhost:$BACKEND_PORT/api/printer/print" \
        -H "Content-Type: application/json" \
        -d "{
            \"text\": \"$print_text\",
            \"customText\": \"Hard Plot Center - Server Info\",
            \"timestamp\": \"$(date '+%Y-%m-%d %H:%M:%S')\"
        }" 2>&1)
    
    if echo "$response" | grep -q '"success":true'; then
        print_color "$COLOR_GREEN" "  ✓ Server info printed successfully!"
        echo ""
        print_color "$COLOR_WHITE" "  Printed information:"
        print_color "$COLOR_CYAN" "  ─────────────────────────────────────────"
        print_color "$COLOR_WHITE" "  📱 Frontend: http://$LOCAL_IP:$FRONTEND_PORT"
        print_color "$COLOR_WHITE" "  🔌 Backend:  http://$LOCAL_IP:$BACKEND_PORT"
        print_color "$COLOR_CYAN" "  ─────────────────────────────────────────"
    else
        print_color "$COLOR_RED" "  ✗ Failed to print server info"
        print_color "$COLOR_YELLOW" "  Make sure a printer is connected"
        print_color "$COLOR_YELLOW" "  Response: $response"
        return 1
    fi
    
    echo ""
}

# ============================================================================
# Main Execution
# ============================================================================

main() {
    clear
    
    print_color "$COLOR_CYAN" "╔═══════════════════════════════════════════════════════════╗"
    print_color "$COLOR_CYAN" "║                                                           ║"
    print_color "$COLOR_CYAN" "║         Thermal Printer Application Manager              ║"
    print_color "$COLOR_CYAN" "║                   Production Script                      ║"
    print_color "$COLOR_CYAN" "║                                                           ║"
    print_color "$COLOR_CYAN" "╚═══════════════════════════════════════════════════════════╝"
    
    echo ""
    print_color "$COLOR_GREEN" "Mode: $MODE"
    print_color "$COLOR_GREEN" "Time: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    # Validate mode
    if [[ ! "$MODE" =~ ^(both|frontend|backend|install|print)$ ]]; then
        print_color "$COLOR_RED" "Invalid mode: $MODE"
        print_color "$COLOR_YELLOW" "Valid modes: both, frontend, backend, install, print"
        exit 1
    fi
    
    # Check prerequisites
    check_prerequisites
    
    # Handle different modes
    case "$MODE" in
        install)
            install_dependencies "all"
            print_color "$COLOR_GREEN" "Installation complete! Run './start.sh' to start the application."
            ;;
        print)
            print_to_thermal_printer
            ;;
        backend)
            install_dependencies "backend"
            start_backend
            print_color "$COLOR_GREEN" "
╔═══════════════════════════════════════════════════════════╗
║  Backend Server Started (Production)                      ║
║                                                           ║
║  🌐 Local:   http://localhost:$BACKEND_PORT                     ║
║  🌐 Network: http://$LOCAL_IP:$BACKEND_PORT           ║
║                                                           ║
║  📝 Logs: $LOG_DIR/backend-$TIMESTAMP.log    ║
║                                                           ║
║  💡 Access from other devices at:                         ║
║     http://$LOCAL_IP:$BACKEND_PORT                  ║
║                                                           ║
║  Press Ctrl+C to stop                                     ║
╚═══════════════════════════════════════════════════════════╝"
            
            # Ask if user wants to print server info
            echo ""
            read -p "$(print_color "$COLOR_CYAN" "  Print server info to thermal printer? (y/N): ")" -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                sleep 2
                print_to_thermal_printer
            fi
            
            # Wait for user to press Ctrl+C
            while true; do sleep 1; done
            ;;
        frontend)
            install_dependencies "frontend"
            start_frontend
            print_color "$COLOR_GREEN" "
╔═══════════════════════════════════════════════════════════╗
║  Frontend Server Started (Production)                     ║
║                                                           ║
║  🌐 Local:   http://localhost:$FRONTEND_PORT                    ║
║  🌐 Network: http://$LOCAL_IP:$FRONTEND_PORT          ║
║                                                           ║
║  📝 Logs: $LOG_DIR/frontend-$TIMESTAMP.log   ║
║                                                           ║
║  💡 Access from other devices at:                         ║
║     http://$LOCAL_IP:$FRONTEND_PORT                 ║
║                                                           ║
║  📱 Scan QR code or share URL with mobile devices         ║
║                                                           ║
║  Press Ctrl+C to stop                                     ║
╚═══════════════════════════════════════════════════════════╝"
            # Wait for user to press Ctrl+C
            while true; do sleep 1; done
            ;;
        both)
            install_dependencies "all"
            start_backend
            sleep 3
            start_frontend
            print_color "$COLOR_GREEN" "
╔═══════════════════════════════════════════════════════════╗
║  🎉 Application Started Successfully! (Production)        ║
║                                                           ║
║  📱 Frontend (Web UI):                                    ║
║     Local:   http://localhost:$FRONTEND_PORT                    ║
║     Network: http://$LOCAL_IP:$FRONTEND_PORT          ║
║                                                           ║
║  🔌 Backend (API):                                        ║
║     Local:   http://localhost:$BACKEND_PORT                     ║
║     Network: http://$LOCAL_IP:$BACKEND_PORT           ║
║                                                           ║
║  📝 Logs: $LOG_DIR/                          ║
║                                                           ║
║  💡 NETWORK ACCESS:                                       ║
║     Open http://$LOCAL_IP:$FRONTEND_PORT on any device   ║
║     connected to your WiFi network!                       ║
║                                                           ║
║  🖨️  To print this info, press 'p' then Enter             ║
║  📖 Full API docs: http://$LOCAL_IP:$BACKEND_PORT/api/server/info    ║
║                                                           ║
║  Press Ctrl+C to stop both services                       ║
╚═══════════════════════════════════════════════════════════╝"
            
            # Ask if user wants to print server info
            echo ""
            read -p "$(print_color "$COLOR_CYAN" "  Print server info to thermal printer? (y/N): ")" -n 1 -r
            echo ""
            if [[ $REPLY =~ ^[Yy]$ ]]; then
                sleep 2
                print_to_thermal_printer
            fi
            
            # Wait for user to press Ctrl+C
            while true; do sleep 1; done
            ;;
    esac
}

# Run the application
main

