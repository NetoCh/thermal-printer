# ✨ Dynamic API Configuration - Complete Guide

Your frontend is now **fully dynamic** and automatically adapts to different network environments!

---

## 🎯 What Changed

### ✅ **New File: `src/config.ts`**

Smart configuration system that automatically determines the backend API URL:

```typescript
export function getApiBaseUrl(): string {
  // 1. Check environment variable
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // 2. Production: use same host as frontend
  if (import.meta.env.PROD) {
    return `${protocol}//${hostname}:3001`;
  }
  
  // 3. Development: use localhost
  return 'http://localhost:3001';
}
```

### ✅ **Updated: `src/App.tsx`**

All 6 API calls now use the dynamic `API_BASE_URL`:
- ✅ Serial port discovery
- ✅ Network printer discovery
- ✅ Serial port connection
- ✅ Network printer connection
- ✅ Printer disconnection
- ✅ Print job submission

---

## 🚀 How It Works

### **Automatic Detection**

The frontend intelligently selects the API URL based on context:

| Environment | API URL Used | Example |
|-------------|-------------|---------|
| **Dev mode** (`npm run dev`) | `localhost:3001` | `http://localhost:3001` |
| **Production build** | Same as frontend host | `http://192.168.1.100:3001` |
| **With .env.local** | Custom URL | User-defined |

### **Smart Behavior Examples**

#### Example 1: Local Development
```bash
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:3001 ✅ (automatic)
```

#### Example 2: Network Access (Production Build)
```bash
# Build and serve from 192.168.1.100
npm run build
# Serve dist/ with nginx

# Client opens: http://192.168.1.100
# Frontend automatically uses: http://192.168.1.100:3001 ✅
```

#### Example 3: Custom Configuration
```bash
# Create .env.local
echo "VITE_API_URL=http://192.168.1.200:3001" > .env.local

npm run dev
# Frontend: http://localhost:5173
# Backend:  http://192.168.1.200:3001 ✅ (custom server)
```

---

## 📋 Usage Scenarios

### Scenario 1: Same Machine Development (No Config Needed!)

```bash
# Terminal 1: Backend
./start.sh backend

# Terminal 2: Frontend  
npm run dev

# Access: http://localhost:5173
# Uses API: http://localhost:3001 ✅ Automatic!
```

### Scenario 2: Backend on Server, Frontend Local

**On Server (192.168.1.100):**
```bash
./start.sh backend
# Backend running at http://192.168.1.100:3001
```

**On Your Dev Machine:**
```bash
# Create .env.local
echo "VITE_API_URL=http://192.168.1.100:3001" > .env.local

# Start frontend
npm run dev

# Frontend: http://localhost:5173
# API calls go to: http://192.168.1.100:3001 ✅
```

### Scenario 3: Both on Server, Access from Clients

**On Server (192.168.1.100):**
```bash
# Start both services
./start.sh both
```

**From Any Client Device:**
```
Open browser: http://192.168.1.100:5173

Frontend automatically detects:
- Loaded from: http://192.168.1.100:5173
- Uses API: http://192.168.1.100:3001 ✅ Automatic!
```

### Scenario 4: Production Deployment

**Build:**
```bash
npm run build
# Creates dist/ folder
```

**Deploy:**
```bash
# Serve dist/ with nginx/apache on port 80
# Backend runs on port 3001

# Client accesses: http://printer-server.local
# Frontend automatically uses: http://printer-server.local:3001 ✅
```

---

## 🛠️ Configuration Methods

### Method 1: No Configuration (Recommended)

**For:** Local development, simple deployments

```bash
# Just run it!
npm run dev
```

✅ **Pros:**
- Zero configuration
- Works immediately
- Adapts automatically

❌ **Cons:**
- Frontend and backend must be on same machine (dev)
- Or same hostname (production)

### Method 2: Environment Variable

**For:** Network testing, different servers, custom setups

```bash
# Create .env.local
cat > .env.local << EOF
VITE_API_URL=http://192.168.1.100:3001
EOF

# Run
npm run dev
```

✅ **Pros:**
- Flexible
- Easy to change
- Per-developer settings

❌ **Cons:**
- Requires file creation
- Must restart dev server

### Method 3: Build-time Variable

**For:** Different deployment environments

```bash
# Development build
VITE_API_URL=http://dev-server:3001 npm run build

# Production build  
VITE_API_URL=https://api.production.com:3001 npm run build
```

✅ **Pros:**
- Different builds for different environments
- No runtime configuration

❌ **Cons:**
- Need separate builds
- Can't change without rebuilding

---

## 🔍 Verification

### Check Active API URL

**Method 1: Browser Console**
```javascript
// Open DevTools (F12)
// In development mode, you'll see:
🌐 API Base URL: http://192.168.1.100:3001
```

**Method 2: Network Tab**
```
1. Open DevTools (F12)
2. Go to Network tab
3. Click any printer operation
4. Check Request URL
```

**Method 3: Code Inspection**
```typescript
// Add this temporarily in App.tsx
useEffect(() => {
  console.log('API Base URL:', API_BASE_URL);
}, []);
```

---

## 📝 Environment File Reference

### `.env.local` Format

```bash
# .env.local (git-ignored, personal settings)

# Backend API URL
VITE_API_URL=http://192.168.1.100:3001
```

### Multiple Environments

```
.env                    # Default values
.env.local              # Local overrides (git-ignored)
.env.development        # Development mode only
.env.production         # Production builds only
```

**Example Setup:**

```bash
# .env (committed to git)
# No VITE_API_URL - uses automatic detection

# .env.development (committed to git)
VITE_API_URL=http://localhost:3001

# .env.production (committed to git)
# No VITE_API_URL - uses automatic detection

# .env.local (NOT committed, personal)
VITE_API_URL=http://192.168.1.200:3001
```

---

## 🐛 Troubleshooting

### Issue: Frontend can't connect to backend

**1. Check what URL is being used:**
```
Open browser console (F12)
Look for: 🌐 API Base URL: ...
```

**2. Test backend directly:**
```bash
curl http://192.168.1.100:3001/api/health
```

**3. Check firewall:**
```bash
# Must allow port 3001
# See NETWORK_SETUP.md
```

### Issue: .env.local changes not working

**Solution: Restart dev server**
```bash
# Stop (Ctrl+C)
# Start
npm run dev
```

Vite only reads .env files on startup!

### Issue: Wrong API URL in production

**Check:** Production uses same hostname as frontend

```
If frontend is at: http://192.168.1.100
Backend must be at: http://192.168.1.100:3001
```

**Solution:** Either:
1. Use same server for both
2. Set `VITE_API_URL` before building
3. Configure reverse proxy

### Issue: CORS errors

```
Access-Control-Allow-Origin error
```

**Check:**
1. Backend is running
2. Backend has CORS enabled (already done!)
3. Using correct URL (check console)

---

## 🎓 Understanding the Logic

### Development Mode
```
npm run dev
→ import.meta.env.DEV = true
→ Uses: http://localhost:3001
```

### Production Build
```
npm run build
→ import.meta.env.PROD = true
→ Uses: window.location.hostname + :3001

If user opens: http://192.168.1.100:5173
API becomes: http://192.168.1.100:3001
```

### With Environment Variable
```
.env.local: VITE_API_URL=http://custom:3001
→ Overrides everything
→ Uses: http://custom:3001
```

---

## 🎯 Best Practices

### For Development
```bash
# Option 1: Same machine (recommended)
./start.sh both
# No configuration needed!

# Option 2: Remote backend
echo "VITE_API_URL=http://server:3001" > .env.local
npm run dev
```

### For Testing
```bash
# Test on network
# Create .env.local with test server IP
VITE_API_URL=http://192.168.1.100:3001 npm run dev
```

### For Production
```bash
# Let it auto-detect (recommended)
npm run build

# Or specify explicitly
VITE_API_URL=https://api.company.com:3001 npm run build
```

### For Team
```bash
# Commit .env.example with documentation
cat > .env.example << EOF
# Backend API URL (optional)
# VITE_API_URL=http://localhost:3001
# VITE_API_URL=http://192.168.1.100:3001
EOF

git add .env.example
```

---

## 📊 Configuration Matrix

| Dev Location | Backend Location | Configuration Needed |
|-------------|------------------|---------------------|
| Localhost | Localhost | ❌ None (automatic) |
| Localhost | Remote server | ✅ `.env.local` |
| Network | Same server | ❌ None (automatic) |
| Network | Different server | ✅ `.env.local` or build variable |

---

## ✅ Quick Checklist

- [x] Frontend uses dynamic API_BASE_URL ✅
- [x] Automatic detection in dev/prod ✅
- [x] Environment variable support ✅
- [x] Console logging in dev mode ✅
- [ ] Create .env.local if needed
- [ ] Test API connectivity
- [ ] Verify in browser console

---

## 🎉 Benefits

✅ **No hardcoded URLs** - Dynamic detection
✅ **Works locally** - Out of the box
✅ **Works on network** - Automatic adaptation
✅ **Flexible** - Override when needed
✅ **Team-friendly** - Each developer can customize
✅ **Production-ready** - Adapts to deployment environment

---

## 📚 Related Documentation

- **[ENV_CONFIG.md](ENV_CONFIG.md)** - Detailed environment configuration
- **[NETWORK_SETUP.md](NETWORK_SETUP.md)** - Network deployment guide
- **[STARTUP_GUIDE.md](STARTUP_GUIDE.md)** - Application startup guide

---

**Your frontend is now dynamically configured! 🎊**

No more manual URL updates. It just works! ✨

