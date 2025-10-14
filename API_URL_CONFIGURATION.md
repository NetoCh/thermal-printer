# 🌐 API URL Configuration - Frontend

## Overview

The frontend now supports **configurable API server URL** with **localStorage persistence**. You can easily change the backend server address without editing code or environment files!

---

## ✨ Features

✅ **Visual Configuration UI** - Globe icon button in header  
✅ **LocalStorage Persistence** - Settings saved across browser sessions  
✅ **Automatic Detection** - Default behavior uses smart URL detection  
✅ **Real-time Updates** - Changes apply immediately (with page reload)  
✅ **Reset to Default** - One-click restore to automatic detection  
✅ **Visual Feedback** - Shows current URL and source  

---

## 🎯 How to Use

### **Step 1: Open API Settings**

Click the **Globe icon** (🌐) in the top navigation bar

### **Step 2: View Current URL**

The modal shows:
- Current API URL being used
- Whether it's custom or automatic
- Default URL (placeholder)

### **Step 3: Enter Custom URL**

Type your backend server URL:
```
Examples:
http://localhost:3001
http://192.168.1.100:3001
http://192.168.1.200:3001
http://printer-server:3001
```

### **Step 4: Save & Reload**

Click **"Save & Reload"** button
- URL is saved to localStorage
- Page automatically reloads
- New URL is now active

### **Step 5: Reset (Optional)**

To go back to automatic detection:
- Open API Settings
- Click **"Reset to Default"**
- Automatic detection restored

---

## 🔧 URL Priority

The system checks URLs in this order:

1. **LocalStorage** (custom URL) ← Highest priority
2. **Environment Variable** (VITE_API_URL)
3. **Production Mode** (same hostname as frontend)
4. **Development Mode** (localhost:3001) ← Lowest priority

---

## 💾 localStorage Details

### **Storage Key**
```javascript
thermal_printer_api_url
```

### **Storage Location**
```
Browser → DevTools (F12) → Application → Local Storage
→ http://localhost:5173 (or your domain)
→ thermal_printer_api_url: "http://192.168.1.100:3001"
```

### **Manual Access** (Advanced)

```javascript
// Get current URL
localStorage.getItem('thermal_printer_api_url')

// Set URL manually
localStorage.setItem('thermal_printer_api_url', 'http://192.168.1.100:3001')

// Remove custom URL
localStorage.removeItem('thermal_printer_api_url')
```

---

## 🎨 UI Components

### **Globe Button**

Location: Header (top navigation)  
Icon: 🌐 Globe  
Tooltip: "API Server Settings"

### **API Settings Modal**

Shows:
- **Current API Server**: Displays active URL
- **Status Badge**: "Using custom URL" or "Using automatic detection"
- **Input Field**: Enter new URL
- **Example Text**: Shows format example
- **Info Box**: Explains behavior

Buttons:
- **Cancel**: Close without changes
- **Reset to Default**: Remove custom URL (only shown if custom URL set)
- **Save & Reload**: Save and apply new URL

---

## 📋 Use Cases

### **Use Case 1: Development with Remote Backend**

**Scenario:** Backend on another machine

```
1. Click Globe icon
2. Enter: http://192.168.1.100:3001
3. Save & Reload
4. Frontend connects to remote backend
```

### **Use Case 2: Testing Different Backends**

**Scenario:** Multiple backend servers

```
Server 1: http://192.168.1.100:3001 (dev)
Server 2: http://192.168.1.200:3001 (test)
Server 3: http://192.168.1.150:3001 (staging)

Simply switch between them using the API Settings modal!
```

### **Use Case 3: Team Development**

**Scenario:** Each team member has their own backend

```
Developer A: http://192.168.1.100:3001
Developer B: http://192.168.1.101:3001
Developer C: http://192.168.1.102:3001

Each person configures their own URL - saved in their browser!
```

### **Use Case 4: Production Deployment**

**Scenario:** Deployed app pointing to production backend

```
1. Deploy frontend to: http://company.com
2. Backend at: http://api.company.com:3001

Option 1: Use .env.local before building
Option 2: Users configure via UI after deployment
```

---

## 🔄 Configuration Methods Comparison

| Method | Persistence | Requires Rebuild | User-Friendly | Use Case |
|--------|-------------|------------------|---------------|----------|
| **UI Settings** | ✅ localStorage | ❌ No | ⭐⭐⭐⭐⭐ | Best for end users |
| **.env.local** | ✅ File | ❌ No | ⭐⭐⭐ | Developers |
| **Build Variable** | ❌ Compiled | ✅ Yes | ⭐⭐ | CI/CD |
| **Automatic** | ❌ Runtime | ❌ No | ⭐⭐⭐⭐ | Simple deploys |

---

## 🎓 Technical Details

### **State Management**

```typescript
// App.tsx state
const [apiUrl, setApiUrl] = useState<string>(getApiBaseUrl());
const [customApiUrl, setCustomApiUrl] = useState<string>('');
const [showApiSettings, setShowApiSettings] = useState(false);
```

### **Configuration Functions** (src/config.ts)

```typescript
getApiBaseUrl()           // Get current URL (checks localStorage first)
setApiBaseUrl(url)        // Save to localStorage
clearApiBaseUrl()         // Remove from localStorage
getDefaultApiUrl()        // Get URL without localStorage override
hasCustomApiUrl()         // Check if custom URL is set
updateApiBaseUrl(url)     // Update at runtime
```

### **Persistence Logic**

```typescript
// Save
function setApiBaseUrl(url: string): void {
  localStorage.setItem('thermal_printer_api_url', url.trim());
}

// Load
function getApiBaseUrl(): string {
  const stored = localStorage.getItem('thermal_printer_api_url');
  if (stored) return stored;  // Custom URL
  
  // Fall back to automatic detection
  return autoDetect();
}

// Clear
function clearApiBaseUrl(): void {
  localStorage.removeItem('thermal_printer_api_url');
}
```

---

## 🐛 Troubleshooting

### **URL not changing?**

**Solution:** The page must reload for changes to take effect.
- The "Save & Reload" button does this automatically
- Or manually reload: Ctrl+R / Cmd+R / F5

### **Can't connect after changing URL?**

**Checks:**
1. Backend server is running at that URL
2. URL is correct (check for typos)
3. Port is correct (usually 3001)
4. Firewall allows the port
5. Try in browser: `http://YOUR-URL:3001/api/health`

**Reset to test:**
- Click "Reset to Default"
- Try automatic detection

### **Want to see what URL is active?**

**Method 1:** Open API Settings modal  
**Method 2:** Browser DevTools Console
```javascript
localStorage.getItem('thermal_printer_api_url')
```

**Method 3:** Browser DevTools Application tab  
`Application → Local Storage → thermal_printer_api_url`

---

## 📸 Screenshots Description

### **Header with Globe Button**
```
[HPC Logo] | [Business Form Button] | [🌐] | [⚙️Settings] | [Connection Status]
                                        ↑
                                    Click here!
```

### **API Settings Modal**
```
╔══════════════════════════════════════════╗
║  API Server Settings                     ║
║                                          ║
║  📍 Current API Server:                  ║
║  http://192.168.1.100:3001              ║
║  ✓ Using custom URL                     ║
║                                          ║
║  Custom API Server URL:                  ║
║  [http://192.168.1.100:3001_________]   ║
║  Example: http://192.168.1.100:3001     ║
║                                          ║
║  ℹ Note: Changes persist across          ║
║    browser sessions                      ║
║                                          ║
║  [Cancel] [Reset] [Save & Reload]       ║
╚══════════════════════════════════════════╝
```

---

## ✅ Benefits

✅ **No File Editing** - Configure from UI  
✅ **Persists Across Sessions** - Saved in browser  
✅ **Per-Browser Settings** - Each browser can have different URL  
✅ **User-Friendly** - Non-technical users can configure  
✅ **Fast Switching** - Change backends in seconds  
✅ **Visual Feedback** - Always know what URL is active  
✅ **Reversible** - Easy reset to automatic detection  

---

## 🔒 Security Notes

### **localStorage Security**

- Stored in plain text in browser
- Only accessible from same origin (domain)
- Cleared when browser data is cleared
- Not sent in HTTP requests (unlike cookies)

### **Best Practices**

1. **Internal Networks**: Best for LAN/internal deployments
2. **HTTPS in Production**: Use HTTPS URLs for production
3. **Trusted Networks**: Only connect to trusted backend servers
4. **Clear Data**: Users can clear localStorage anytime

---

## 🚀 Quick Start Examples

### **Example 1: Connect to Server on Same Network**

```
Your backend server IP: 192.168.1.100

1. Open frontend in browser
2. Click Globe icon (🌐)
3. Enter: http://192.168.1.100:3001
4. Click "Save & Reload"
5. Done! All API calls now go to that server
```

### **Example 2: Development with Local Backend**

```
Backend runs on your machine (localhost)

1. Open frontend
2. Click Globe icon
3. See current URL (probably localhost:3001)
4. No change needed - already correct!
```

### **Example 3: Switch to Different Backend**

```
Want to test different backend:

1. Click Globe icon
2. Change URL to: http://192.168.1.200:3001
3. Save & Reload
4. Now using different backend!

To switch back:
1. Click Globe icon
2. Click "Reset to Default"
3. Back to automatic detection
```

---

## 📚 Related Documentation

- **[ENV_CONFIG.md](ENV_CONFIG.md)** - Environment configuration
- **[NETWORK_SETUP.md](NETWORK_SETUP.md)** - Network deployment
- **[DYNAMIC_API_SETUP.md](DYNAMIC_API_SETUP.md)** - Dynamic API configuration
- **[API_INFO_ENDPOINT.md](API_INFO_ENDPOINT.md)** - Server info endpoint

---

## 💡 Pro Tips

1. **Test Connection First**
   - Open `http://YOUR-URL:3001/api/health` in browser
   - Should return JSON with `{"success": true}`

2. **Use /api/server/info**
   - Visit `http://YOUR-URL:3001/api/server/info`
   - Shows network URL to use

3. **Keep Default for Simple Deployments**
   - If frontend and backend on same server
   - Automatic detection works perfectly

4. **Document for Team**
   - Share backend URL with team
   - Everyone configures their own browser

5. **Clear on Issues**
   - If having connection problems
   - Reset to Default to test automatic detection

---

**Your API URL is now fully configurable! 🎉**

Just click the Globe icon (🌐) in the header to get started!

