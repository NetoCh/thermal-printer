# ⚡ Quick Start - Thermal Printer Application

## 🚀 One Command Setup

### Linux/macOS/WSL (Bash)
```bash
chmod +x start.sh && ./start.sh
```

### Windows (PowerShell)
```powershell
.\start.ps1
```

---

## 📖 Usage

| Command | What it does |
|---------|-------------|
| `./start.sh` or `.\start.ps1` | **Full app** (frontend + backend) |
| `./start.sh frontend` | Frontend only (port 5173) |
| `./start.sh backend` | Backend only (port 3001) |
| `./start.sh install` | Install dependencies only |

---

## 🌐 Access Points

After running the script:

- **Web App:** http://localhost:5173
- **Backend API:** http://localhost:3001
- **API Health:** http://localhost:3001/api/health

---

## 🛑 Stop Services

Press **Ctrl+C** in the terminal (script handles cleanup automatically)

---

## 🔧 Requirements

- Node.js v14+ ([Download](https://nodejs.org/))
- npm (comes with Node.js)

---

## 📁 Project Structure

```
thermal-printer/
├── start.sh              # Bash startup script (Linux/macOS)
├── start.ps1             # PowerShell startup script (Windows)
├── STARTUP_GUIDE.md      # Detailed documentation
├── server/               # Backend (Node.js + Express)
│   ├── printer-api.js   # Main API server
│   └── package.json     # Backend dependencies
├── src/                  # Frontend (React + TypeScript)
│   └── App.tsx          # Main React component
└── logs/                 # Application logs (auto-created)
```

---

## 🎯 Common Tasks

### First Time Setup
```bash
# Make executable (Linux/macOS only)
chmod +x start.sh

# Run
./start.sh
```

### Development Mode
```bash
# Run everything
./start.sh both

# OR separate terminals:
# Terminal 1:
./start.sh backend

# Terminal 2:
./start.sh frontend
```

### Testing Backend Only
```bash
./start.sh backend

# Test in another terminal:
curl http://localhost:3001/api/health
```

---

## 🐛 Quick Fixes

### Port Already in Use
Script will prompt to kill process automatically - just answer **y**

### Permission Denied (Linux/macOS)
```bash
chmod +x start.sh
```

### Execution Policy Error (Windows)
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Dependencies Failed
```bash
# Clear and reinstall
rm -rf node_modules server/node_modules
./start.sh install
```

---

## 📊 Script Features

✅ **Auto-install** dependencies  
✅ **Port conflict** detection & resolution  
✅ **Process management** with PID tracking  
✅ **Graceful shutdown** on Ctrl+C  
✅ **Timestamped logs** in `logs/` directory  
✅ **Colorized output** for better readability  

---

## 🔗 More Info

- **Full Documentation:** [STARTUP_GUIDE.md](STARTUP_GUIDE.md)
- **Backend API:** [server/README.md](server/README.md)
- **Project README:** [README.md](README.md)

---

## 💡 Pro Tips

1. **Always check logs** if something fails:
   ```bash
   ls -lt logs/    # Show latest logs
   tail -f logs/backend-*.log
   ```

2. **Use install mode** for fresh setups:
   ```bash
   ./start.sh install
   ```

3. **Separate terminals** for development:
   - Terminal 1: Backend (`./start.sh backend`)
   - Terminal 2: Frontend (`./start.sh frontend`)
   - Terminal 3: Testing/debugging

4. **Windows users:** Use PowerShell, not CMD

---

**That's it! You're ready to print! 🖨️✨**

For detailed documentation, see [STARTUP_GUIDE.md](STARTUP_GUIDE.md)

