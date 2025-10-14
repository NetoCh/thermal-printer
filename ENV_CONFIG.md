# Environment Configuration

## Frontend API Configuration

The frontend now dynamically determines the backend API URL based on the environment.

### How It Works

The app automatically selects the correct API URL using this priority:

1. **Environment Variable** (if set): `VITE_API_URL`
2. **Production Mode**: Uses the same hostname as the frontend
3. **Development Mode**: Uses `http://localhost:3001`

### Configuration Options

#### Option 1: Environment Variable (Recommended)

Create a `.env.local` file in the project root:

```bash
# .env.local
VITE_API_URL=http://192.168.1.100:3001
```

**When to use:**
- Testing on different networks
- Development with remote backend
- Custom deployment scenarios

#### Option 2: Automatic Detection (Default)

No configuration needed! The app automatically:
- **Dev mode** (`npm run dev`): Uses `localhost:3001`
- **Production** (`npm run build`): Uses same host as frontend

**When to use:**
- Standard local development
- Production deployment where frontend and backend share same host

#### Option 3: Build-time Configuration

Set environment variable before building:

```bash
# Linux/macOS
VITE_API_URL=http://192.168.1.100:3001 npm run build

# Windows (PowerShell)
$env:VITE_API_URL="http://192.168.1.100:3001"; npm run build
```

---

## Usage Scenarios

### Scenario 1: Local Development (Default)
```bash
# No configuration needed
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001
```

### Scenario 2: Network Testing
```bash
# Create .env.local
echo "VITE_API_URL=http://192.168.1.100:3001" > .env.local

# Run frontend
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://192.168.1.100:3001 (your server)
```

### Scenario 3: Access Frontend from Other Devices

**On Server (192.168.1.100):**
```bash
# Start both services
./start.sh both

# Frontend will be at: http://192.168.1.100:5173
# Backend will be at:  http://192.168.1.100:3001
```

**From Client Device:**
```
Open browser: http://192.168.1.100:5173
Frontend automatically uses: http://192.168.1.100:3001
```

### Scenario 4: Production Build
```bash
# Build the frontend
npm run build

# Serve with nginx/apache pointing to dist/
# Frontend URL: http://192.168.1.100
# Backend URL:  http://192.168.1.100:3001

# App automatically uses the same hostname!
```

---

## Environment Variable Format

Create `.env.local` in project root:

```bash
# .env.local

# Option 1: Use localhost (default)
VITE_API_URL=http://localhost:3001

# Option 2: Use specific IP
VITE_API_URL=http://192.168.1.100:3001

# Option 3: Use hostname
VITE_API_URL=http://printer-server:3001

# Option 4: Use HTTPS (production)
VITE_API_URL=https://api.example.com:3001
```

**Important Notes:**
- File must be named exactly `.env.local`
- Prefix must be `VITE_` for Vite to expose it
- Restart dev server after creating/modifying `.env.local`

---

## Verification

Check which API URL is being used:

1. **Open Browser Console** (F12)
2. **Look for log message:**
   ```
   🌐 API Base URL: http://192.168.1.100:3001
   ```

This appears in development mode showing the active API URL.

---

## Multiple Environment Files

Vite supports different environment files:

```
.env                # Loaded in all cases
.env.local          # Loaded in all cases, ignored by git
.env.development    # Only loaded in development
.env.production     # Only loaded in production
```

**Example Setup:**

```bash
# .env.development
VITE_API_URL=http://localhost:3001

# .env.production
VITE_API_URL=http://192.168.1.100:3001

# .env.local (overrides everything)
VITE_API_URL=http://192.168.1.200:3001
```

---

## Troubleshooting

### Frontend can't connect to backend

**1. Check the API URL being used:**
```javascript
// Open browser console (F12)
// Type:
console.log(window.location.hostname)
```

**2. Check environment variables:**
```bash
# In your .env.local file
cat .env.local

# Make sure format is correct:
VITE_API_URL=http://192.168.1.100:3001
```

**3. Restart dev server:**
```bash
# Stop current server (Ctrl+C)
# Start again
npm run dev
```

**4. Test API directly:**
```bash
curl http://192.168.1.100:3001/api/health
```

### Changes to .env.local not working

- **Restart dev server** - Vite only reads .env files on startup
- **Check spelling** - Must be `VITE_API_URL` (not `API_URL`)
- **Check file name** - Must be `.env.local` (note the dot)

### CORS errors

If you see CORS errors in console:
```
Access to fetch at 'http://192.168.1.100:3001/api/...' from origin 
'http://localhost:5173' has been blocked by CORS policy
```

**Solution:** The backend already has CORS enabled, but check:
1. Backend is running: `curl http://192.168.1.100:3001/api/health`
2. Firewall allows port 3001
3. Both devices on same network

---

## Quick Reference

| Scenario | Configuration | Command |
|----------|--------------|---------|
| **Local dev** | None needed | `npm run dev` |
| **Network testing** | Create `.env.local` | `npm run dev` |
| **Production build** | Set before build | `VITE_API_URL=... npm run build` |
| **Check active URL** | Console logs | Open DevTools (F12) |

---

## Example .env.local Files

### For Home Network
```bash
# My home server IP
VITE_API_URL=http://192.168.1.100:3001
```

### For Office Network
```bash
# Office printer server
VITE_API_URL=http://10.0.0.50:3001
```

### For Development
```bash
# Local development
VITE_API_URL=http://localhost:3001
```

### For Production
```bash
# Production server
VITE_API_URL=https://printer.company.com:3001
```

---

**Your frontend is now dynamically configured! 🎉**

The app will automatically use the correct backend URL based on your environment.

