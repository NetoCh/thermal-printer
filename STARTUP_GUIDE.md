# 🚀 Thermal Printer Application - Startup Guide

## Quick Start

### For Linux/macOS (Bash)

```bash
# Make the script executable (first time only)
chmod +x start.sh

# Run both frontend and backend (default)
./start.sh

# Or run specific components
./start.sh frontend   # Frontend only
./start.sh backend    # Backend only
./start.sh install    # Install dependencies only
```

### For Windows (PowerShell)

```powershell
# Run both frontend and backend (default)
.\start.ps1

# Or run specific components
.\start.ps1 frontend   # Frontend only
.\start.ps1 backend    # Backend only
.\start.ps1 install    # Install dependencies only
```

---

## 📋 Prerequisites

Before running the scripts, ensure you have:

- **Node.js** (v14 or higher) - [Download](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Git** (optional, for version control)

### Verify Installation

```bash
node --version    # Should show v14.x.x or higher
npm --version     # Should show 6.x.x or higher
```

---

## 🎯 Script Modes

### 1. **Both Mode** (Default)
Installs all dependencies and runs both frontend and backend servers.

```bash
./start.sh          # Linux/macOS
.\start.ps1         # Windows
```

**Services Started:**
- ✅ Backend API Server → http://localhost:3001
- ✅ Frontend Dev Server → http://localhost:5173

**Use Case:** Full development environment or production simulation

---

### 2. **Frontend Only Mode**
Installs frontend dependencies and starts only the frontend server.

```bash
./start.sh frontend    # Linux/macOS
.\start.ps1 frontend   # Windows
```

**Services Started:**
- ✅ Frontend Dev Server → http://localhost:5173
- ❌ Backend API Server (not started)

**Use Case:** 
- Frontend development without backend changes
- Testing UI components
- Working on styling/UX

**Note:** API calls will fail unless backend is running separately.

---

### 3. **Backend Only Mode**
Installs backend dependencies and starts only the backend server.

```bash
./start.sh backend     # Linux/macOS
.\start.ps1 backend    # Windows
```

**Services Started:**
- ❌ Frontend Dev Server (not started)
- ✅ Backend API Server → http://localhost:3001

**Use Case:**
- Backend development and testing
- API endpoint development
- Printer connection debugging
- Testing with external clients (Postman, curl, etc.)

**Test Endpoints:**
```bash
# Health check
curl http://localhost:3001/api/health

# List serial ports
curl http://localhost:3001/api/printer/serial/list

# Discover network printers
curl http://localhost:3001/api/printer/discover
```

---

### 4. **Install Only Mode**
Only installs dependencies without starting any servers.

```bash
./start.sh install     # Linux/macOS
.\start.ps1 install    # Windows
```

**Use Case:**
- CI/CD pipelines
- Docker image building
- Pre-deployment setup
- Dependency updates

---

## 🔧 Script Features

### Automatic Dependency Installation
- Checks for existing `node_modules`
- Installs frontend and backend dependencies
- Creates production-optimized builds
- Logs installation output to `logs/` directory

### Port Conflict Resolution
- Detects if ports are already in use
- Prompts user to kill existing processes
- Automatically frees ports (Linux/macOS)
- Provides clear error messages

### Process Management
- Runs services in background
- Tracks process IDs (PIDs)
- Handles graceful shutdown on Ctrl+C
- Cleans up resources on exit

### Logging
- Creates timestamped log files
- Logs stored in `logs/` directory
- Separate logs for frontend and backend
- Installation logs preserved

**Log Files:**
```
logs/
├── frontend-2024-01-15_10-30-45.log
├── backend-2024-01-15_10-30-45.log
├── frontend-install-2024-01-15_10-30-45.log
└── backend-install-2024-01-15_10-30-45.log
```

### Colorized Output
- ✅ Green for success messages
- ❌ Red for errors
- ⚠️ Yellow for warnings
- ℹ️ Cyan for info messages

---

## 🛠️ Advanced Usage

### Environment Variables

You can customize ports by editing the script:

**start.sh (Linux/macOS):**
```bash
FRONTEND_PORT=5173
BACKEND_PORT=3001
```

**start.ps1 (Windows):**
```powershell
$FRONTEND_PORT = 5173
$BACKEND_PORT = 3001
```

### Custom Installation

```bash
# Install with specific npm flags
cd server && npm install --legacy-peer-deps
cd .. && npm install --force
```

### Manual Process Control

**Linux/macOS:**
```bash
# View running processes
cat logs/frontend.pid
cat logs/backend.pid

# Kill manually
kill $(cat logs/frontend.pid)
kill $(cat logs/backend.pid)

# Check ports
lsof -i :5173
lsof -i :3001
```

**Windows:**
```powershell
# Check ports
Get-NetTCPConnection -LocalPort 5173
Get-NetTCPConnection -LocalPort 3001

# Kill process on port
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess
```

---

## 🐛 Troubleshooting

### "Permission Denied" (Linux/macOS)

```bash
# Make script executable
chmod +x start.sh

# Or run with bash
bash start.sh
```

### "Execution Policy" Error (Windows)

```powershell
# Run PowerShell as Administrator, then:
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Or bypass for single execution:
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

### Port Already in Use

**Option 1:** Let the script handle it
- Script will prompt to kill the process
- Answer 'y' to automatically free the port

**Option 2:** Manual cleanup
```bash
# Linux/macOS
lsof -ti :5173 | xargs kill -9
lsof -ti :3001 | xargs kill -9

# Windows
Stop-Process -Id (Get-NetTCPConnection -LocalPort 5173).OwningProcess -Force
Stop-Process -Id (Get-NetTCPConnection -LocalPort 3001).OwningProcess -Force
```

### Dependencies Installation Fails

```bash
# Clear npm cache
npm cache clean --force

# Remove node_modules
rm -rf node_modules server/node_modules
rm package-lock.json server/package-lock.json

# Reinstall
./start.sh install
```

### Frontend/Backend Won't Start

1. **Check logs:**
   ```bash
   tail -f logs/frontend-*.log
   tail -f logs/backend-*.log
   ```

2. **Check Node.js version:**
   ```bash
   node --version  # Should be v14+
   ```

3. **Check for missing dependencies:**
   ```bash
   npm list
   cd server && npm list
   ```

4. **Manually test:**
   ```bash
   # Frontend
   npm run dev
   
   # Backend
   cd server && npm start
   ```

---

## 📦 What Gets Installed

### Frontend Dependencies
- React + React Router
- TypeScript
- Vite (build tool)
- TailwindCSS
- Lucide React (icons)

### Backend Dependencies
- Express.js
- CORS middleware
- SerialPort (for COM/USB printers)
- Node.js net module (for network printers)

---

## 🔄 Workflow Examples

### Development Workflow
```bash
# Day 1: Setup
./start.sh install

# Day 2+: Start working
./start.sh

# Frontend only development
./start.sh frontend

# Backend only development
./start.sh backend
```

### Production Deployment
```bash
# 1. Install dependencies
./start.sh install

# 2. Build frontend
npm run build

# 3. Start backend only
./start.sh backend

# 4. Serve frontend with nginx/apache
# (Point to dist/ directory)
```

### Testing Workflow
```bash
# Terminal 1: Backend
./start.sh backend

# Terminal 2: Run tests or manual API testing
curl http://localhost:3001/api/health

# Terminal 3: Frontend (optional)
./start.sh frontend
```

---

## 🎓 Learning Mode

### Understanding the Architecture

```
┌─────────────────────────────────────────┐
│   Frontend (React + Vite)               │
│   Port: 5173                            │
│   - User Interface                      │
│   - Connection Management               │
│   - Print Button UI                     │
└──────────────┬──────────────────────────┘
               │ HTTP Requests
               │ (http://localhost:3001)
               ↓
┌─────────────────────────────────────────┐
│   Backend (Node.js + Express)           │
│   Port: 3001                            │
│   - API Endpoints                       │
│   - Serial Port Manager                 │
│   - Network Printer Manager             │
│   - ESC/POS Command Builder             │
└──────────────┬──────────────────────────┘
               │ Direct Connection
               ↓
┌──────────────────────┬──────────────────┐
│  USB/Serial Printer  │  Network Printer │
│  (COM Port)          │  (IP:9100)       │
└──────────────────────┴──────────────────┘
```

---

## ✅ Best Practices

1. **Always run install after git pull**
   ```bash
   git pull
   ./start.sh install
   ```

2. **Check logs when things go wrong**
   ```bash
   ls -lt logs/    # Show latest logs
   tail -f logs/backend-*.log
   ```

3. **Clean shutdown with Ctrl+C**
   - Don't close terminal window directly
   - Let script clean up PIDs

4. **Regular dependency updates**
   ```bash
   npm outdated
   npm update
   ```

---

## 🆘 Getting Help

### Check Status
```bash
# Are services running?
lsof -i :5173  # Frontend
lsof -i :3001  # Backend

# View recent logs
tail -20 logs/frontend-*.log
tail -20 logs/backend-*.log
```

### Common Issues
- Port conflicts → Use script's auto-kill feature
- Missing dependencies → Run `./start.sh install`
- Permission errors → Run `chmod +x start.sh`

---

## 📞 Support

For issues specific to:
- **Printer connection:** Check `server/README.md`
- **Frontend UI:** Check React/Vite documentation
- **Backend API:** Check API endpoints in `server/printer-api.js`

---

**Happy Coding! 🎉**

