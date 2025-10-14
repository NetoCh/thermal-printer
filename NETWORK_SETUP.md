# 🌐 Network Setup Guide - Expose Backend API

This guide explains how to make your backend API (port 3001) accessible from other devices on your local network.

---

## 📋 Table of Contents

1. [Quick Setup](#quick-setup)
2. [Detailed Steps](#detailed-steps)
3. [Frontend Configuration](#frontend-configuration)
4. [Firewall Configuration](#firewall-configuration)
5. [Testing](#testing)
6. [Security Considerations](#security-considerations)
7. [Troubleshooting](#troubleshooting)

---

## ⚡ Quick Setup

### What Changed

✅ **Backend now listens on `0.0.0.0`** (all network interfaces)
- Before: Only accessible from `localhost`
- After: Accessible from any device on your network

---

## 🔧 Detailed Steps

### Step 1: Find Your Server's IP Address

**Windows:**
```powershell
ipconfig
# Look for "IPv4 Address" under your active network adapter
# Example: 192.168.1.100
```

**Linux/macOS:**
```bash
ip addr show        # Linux
ifconfig            # macOS
hostname -I         # Simple output
# Look for an address like 192.168.1.100
```

**Example Output:**
```
Ethernet adapter:
   IPv4 Address: 192.168.1.100
   Subnet Mask: 255.255.255.0
```

---

### Step 2: Start the Backend Server

The backend is already configured to listen on all network interfaces!

```bash
# Start backend
./start.sh backend    # Linux/macOS
.\start.ps1 backend   # Windows
```

**You'll see:**
```
╔═══════════════════════════════════════════════════════╗
║  Thermal Printer API Server                           ║
║                                                       ║
║  🌐 Local:   http://localhost:3001                    ║
║  🌐 Network: http://192.168.1.100:3001                ║
║                                                       ║
...
╚═══════════════════════════════════════════════════════╝

💡 Other devices can access this API at: http://192.168.1.100:3001
```

✅ **Note the Network URL** - this is what other devices will use!

---

### Step 3: Configure Firewall

#### Windows Firewall

**Option 1: PowerShell (Administrator)**
```powershell
# Run PowerShell as Administrator
New-NetFirewallRule -DisplayName "Thermal Printer API" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

**Option 2: GUI**
1. Open Windows Defender Firewall
2. Click "Advanced settings"
3. Click "Inbound Rules" → "New Rule"
4. Select "Port" → Next
5. Select "TCP" → Specific local ports: `3001` → Next
6. Select "Allow the connection" → Next
7. Check all profiles → Next
8. Name: "Thermal Printer API" → Finish

#### Linux (UFW)
```bash
sudo ufw allow 3001/tcp
sudo ufw status
```

#### Linux (firewalld)
```bash
sudo firewall-cmd --permanent --add-port=3001/tcp
sudo firewall-cmd --reload
```

#### macOS
```bash
# macOS firewall usually allows local network by default
# If needed, go to System Preferences → Security & Privacy → Firewall → Firewall Options
```

---

### Step 4: Configure Frontend (Optional)

✅ **Good News: Frontend is already configured dynamically!**

The frontend automatically detects the correct API URL:
- **Development mode**: Uses `localhost:3001`
- **Production mode**: Uses same hostname as frontend
- **Custom configuration**: Use environment variables

**No configuration needed for basic usage!**

#### Optional: Custom API URL

If you want to override the automatic detection, create `.env.local`:

```bash
# Create .env.local in project root
VITE_API_URL=http://192.168.1.100:3001
```

**When to use custom configuration:**
- Frontend and backend on different machines
- Testing with remote backend server
- Specific network deployment requirements

**After creating .env.local:**
```bash
# Restart frontend dev server
npm run dev
```

For detailed configuration options, see [ENV_CONFIG.md](ENV_CONFIG.md)

---

## 🧪 Testing

### From the Server Machine

```bash
# Test localhost
curl http://localhost:3001/api/health

# Test network interface
curl http://192.168.1.100:3001/api/health
```

### From Another Device on the Network

**Using Command Line:**
```bash
# Replace 192.168.1.100 with your server's IP
curl http://192.168.1.100:3001/api/health

# Expected response:
# {
#   "success": true,
#   "message": "Printer API server is running",
#   "connected": false,
#   "connectionType": null
# }
```

**Using Browser:**
1. Open browser on another device
2. Navigate to: `http://192.168.1.100:3001/api/health`
3. You should see JSON response

**Test Other Endpoints:**
```bash
# List serial ports
curl http://192.168.1.100:3001/api/printer/serial/list

# Discover network printers
curl http://192.168.1.100:3001/api/printer/discover

# Get status
curl http://192.168.1.100:3001/api/printer/status
```

---

## 🔒 Security Considerations

### ⚠️ Important Security Notes

1. **Local Network Only**
   - The server is accessible to ALL devices on your network
   - Anyone on your network can access the API

2. **No Authentication**
   - Currently, there's no authentication/authorization
   - Any device can connect to printers and print

3. **Firewall Protection**
   - Only allow port 3001 on trusted networks
   - Disable the firewall rule when not needed

### Recommended Security Measures

#### 1. Add API Key Authentication (Optional)

Add to `server/printer-api.js`:

```javascript
// Simple API key middleware
const API_KEY = process.env.API_KEY || 'your-secret-key-here';

app.use((req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (apiKey !== API_KEY) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized: Invalid API key'
    });
  }
  
  next();
});
```

Then in frontend, add header:
```typescript
fetch(`${API_BASE_URL}/api/health`, {
  headers: {
    'X-API-Key': 'your-secret-key-here'
  }
})
```

#### 2. Restrict to Specific IPs

Add IP whitelist:

```javascript
const ALLOWED_IPS = ['192.168.1.50', '192.168.1.51'];

app.use((req, res, next) => {
  const clientIp = req.ip || req.connection.remoteAddress;
  
  if (!ALLOWED_IPS.includes(clientIp)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden: IP not allowed'
    });
  }
  
  next();
});
```

#### 3. Use HTTPS (Production)

For production, use HTTPS with SSL certificates:
```bash
npm install https
```

---

## 🐛 Troubleshooting

### Cannot Access from Other Device

**1. Check Server is Running**
```bash
# On server machine
curl http://localhost:3001/api/health
```

**2. Check Server is Listening on 0.0.0.0**
```bash
# Windows
netstat -an | findstr 3001

# Linux/macOS
netstat -an | grep 3001
# or
lsof -i :3001

# Should show: 0.0.0.0:3001 or *:3001 (not 127.0.0.1:3001)
```

**3. Check Firewall**
```bash
# Windows
Get-NetFirewallRule -DisplayName "Thermal Printer API"

# Linux (UFW)
sudo ufw status

# Linux (firewalld)
sudo firewall-cmd --list-ports
```

**4. Verify IP Address**
```bash
# Make sure you're using the correct IP
# Test from server first:
curl http://YOUR-SERVER-IP:3001/api/health
```

**5. Check Same Network**
- Ensure both devices are on the same network
- Check subnet mask (usually 255.255.255.0)
- Can you ping the server?
  ```bash
  ping 192.168.1.100
  ```

**6. Check Router/Network Settings**
- Some routers have AP isolation enabled
- Check if devices can communicate on your network
- Disable "Guest Network" isolation

### CORS Errors

If you see CORS errors in browser console:

The backend already has CORS enabled, but you can update it:

```javascript
// In printer-api.js
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST'],
  credentials: true
}));
```

### Frontend Can't Connect

**1. Check Console for Errors**
- Open browser DevTools (F12)
- Look for network errors

**2. Verify API URL**
```typescript
// Log the URL being used
console.log('API URL:', API_BASE_URL);
```

**3. Test Direct API Call**
```bash
# From client device
curl http://192.168.1.100:3001/api/health
```

---

## 📱 Mobile Device Access

### Using on Phone/Tablet

1. **Connect to same WiFi network** as server
2. **Open browser** on mobile device
3. **Navigate to**: `http://192.168.1.100:3001`
4. **Frontend**: Deploy frontend and access via server IP

---

## 🌍 Access Patterns

### Development Setup

```
┌─────────────────────────────────────────┐
│  Developer Machine                      │
│  ├─ Frontend (localhost:5173)           │
│  └─ Backend (0.0.0.0:3001)              │
│     └─ Printer (USB/Network)            │
└─────────────────────────────────────────┘
         ↑
         │ http://192.168.1.100:3001
         │
┌────────────────────────────┐
│  Client Device             │
│  (Phone/Tablet/PC)         │
└────────────────────────────┘
```

### Production Setup

```
┌─────────────────────────────────────────┐
│  Server Machine                         │
│  ├─ Frontend (nginx/apache)             │
│  └─ Backend (0.0.0.0:3001)              │
│     └─ Printer (USB/Network)            │
└─────────────────────────────────────────┘
         ↑
         │ http://192.168.1.100
         │
┌────────────────────────────┐
│  Client Devices            │
│  (Multiple devices)        │
└────────────────────────────┘
```

---

## 📝 Quick Reference

### Server Machine Setup
```bash
# 1. Start backend
./start.sh backend

# 2. Note the Network URL shown
# 3. Configure firewall (see above)
```

### Client Device Setup
```bash
# 1. Verify connectivity
ping 192.168.1.100

# 2. Test API
curl http://192.168.1.100:3001/api/health

# 3. Access frontend (if deployed)
# Browser: http://192.168.1.100
```

### Important URLs

| Purpose | URL |
|---------|-----|
| **Local access** | http://localhost:3001 |
| **Network access** | http://YOUR-IP:3001 |
| **Health check** | http://YOUR-IP:3001/api/health |
| **Serial ports** | http://YOUR-IP:3001/api/printer/serial/list |
| **Network printers** | http://YOUR-IP:3001/api/printer/discover |

---

## ✅ Checklist

- [ ] Backend listens on 0.0.0.0 (already done!)
- [ ] Found server's local IP address
- [ ] Configured firewall to allow port 3001
- [ ] Tested API from server machine
- [ ] Tested API from another device
- [ ] Updated frontend to use server IP (if needed)
- [ ] Documented the IP for team members
- [ ] Considered security implications

---

## 🎓 Understanding Network Binding

**Before (localhost only):**
```javascript
app.listen(3001, () => { ... });
// or
app.listen(3001, 'localhost', () => { ... });
// Only accessible from same machine
```

**After (network accessible):**
```javascript
app.listen(3001, '0.0.0.0', () => { ... });
// Accessible from any device on network
// 0.0.0.0 means "all network interfaces"
```

---

**Your backend is now network-ready! 🎉**

For questions or issues, check the troubleshooting section above.

