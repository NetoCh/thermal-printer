#!/bin/bash

# ============================================================================
# Thermal Printer Application - Production Startup Script (Bash)
# ============================================================================
# Usage:
#   ./start.sh              - Install & run both frontend and backend (default)
#   ./start.sh frontend     - Install & run frontend only
#   ./start.sh backend      - Install & run backend only
#   ./start.sh install      - Install dependencies only
# ============================================================================

set -e  # Exit on error

# Configuration
FRONTEND_PORT=5173
BACKEND_PORT=3001
LOG_DIR="logs"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
MODE="${1:-both}"

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
    if command_exists lsof; then
        lsof -i :"$1" >/dev/null 2>&1
    elif command_exists netstat; then
        netstat -tuln | grep -q ":$1 "
    else
        nc -z localhost "$1" 2>/dev/null
    fi
}

kill_port() {
    local port=$1
    print_color "$COLOR_YELLOW" "  ⚠ Port $port is already in use"
    
    if command_exists lsof; then
        local pid=$(lsof -ti :"$port")
        if [ ! -z "$pid" ]; then
            print_color "$COLOR_YELLOW" "  ⚠ Killing process $pid on port $port"
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
    print_banner "Starting Backend Server"
    
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
    
    print_color "$COLOR_GREEN" "  Starting backend on http://localhost:$BACKEND_PORT"
    print_color "$COLOR_YELLOW" "  Log file: $LOG_DIR/backend-$TIMESTAMP.log"
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
    print_banner "Starting Frontend Development Server"
    
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
    
    print_color "$COLOR_GREEN" "  Starting frontend on http://localhost:$FRONTEND_PORT"
    print_color "$COLOR_YELLOW" "  Log file: $LOG_DIR/frontend-$TIMESTAMP.log"
    echo ""
    
    # Start frontend in background
    npm run dev 2>&1 | tee "$LOG_DIR/frontend-$TIMESTAMP.log" &
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
    if [[ ! "$MODE" =~ ^(both|frontend|backend|install)$ ]]; then
        print_color "$COLOR_RED" "Invalid mode: $MODE"
        print_color "$COLOR_YELLOW" "Valid modes: both, frontend, backend, install"
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
        backend)
            install_dependencies "backend"
            start_backend
            print_color "$COLOR_GREEN" "
╔═══════════════════════════════════════════════════════════╗
║  Backend Server Started                                   ║
║                                                           ║
║  API:  http://localhost:$BACKEND_PORT                           ║
║  Logs: $LOG_DIR/backend-$TIMESTAMP.log       ║
║                                                           ║
║  Press Ctrl+C to stop                                     ║
╚═══════════════════════════════════════════════════════════╝"
            # Wait for user to press Ctrl+C
            while true; do sleep 1; done
            ;;
        frontend)
            install_dependencies "frontend"
            start_frontend
            print_color "$COLOR_GREEN" "
╔═══════════════════════════════════════════════════════════╗
║  Frontend Server Started                                  ║
║                                                           ║
║  Web:  http://localhost:$FRONTEND_PORT                          ║
║  Logs: $LOG_DIR/frontend-$TIMESTAMP.log      ║
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
║  Application Started Successfully                         ║
║                                                           ║
║  Frontend: http://localhost:$FRONTEND_PORT                      ║
║  Backend:  http://localhost:$BACKEND_PORT                       ║
║                                                           ║
║  Logs Directory: $LOG_DIR/                               ║
║                                                           ║
║  Press Ctrl+C to stop both services                       ║
╚═══════════════════════════════════════════════════════════╝"
            # Wait for user to press Ctrl+C
            while true; do sleep 1; done
            ;;
    esac
}

# Run the application
main

