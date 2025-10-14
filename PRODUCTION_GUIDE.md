# 🚀 Production Deployment Guide

## 📋 Development vs Production

### **Development Mode** (for coding/testing)
```bash
npm run dev
```
- Hot Module Replacement (HMR) - instant updates
- Source maps for debugging
- Larger file sizes
- Slower performance
- NOT for production use

### **Production Mode** (for deployment)
```bash
npm run build    # Build optimized files
npm run preview  # Preview production build
```
- Optimized & minified code
- Tree-shaking (removes unused code)
- Smaller file sizes
- Faster performance
- Production-ready

---

## 🎯 Quick Commands

### **Development (Local Only)**
```bash
npm run dev
```
Access: `http://localhost:5173`

### **Development (Network Access)**
Already configured! Just run:
```bash
npm run dev
```
Access:
- Local: `http://localhost:5173`
- Network: `http://192.168.50.104:5173`

### **Production Build**
```bash
npm run build
```
Builds optimized files to `dist/` folder

### **Production Preview (Network Access)**
```bash
npm run preview
```
Access:
- Local: `http://localhost:4173`
- Network: `http://192.168.50.104:4173`

### **Production Build + Preview (One Command)**
```bash
npm run start
```
Builds AND serves the production app with network access

---

## 📦 Production Deployment Options

### **Option 1: Vite Preview Server** (Quick Testing)

**Build and preview:**
```bash
npm run build
npm run preview
```

**Or use one command:**
```bash
npm run start
```

**Access from network:**
- `http://192.168.50.104:4173`

**Pros:**
- ✅ Quick and easy
- ✅ Network accessible with `--host`
- ✅ Good for testing production build

**Cons:**
- ❌ Not meant for long-term production
- ❌ Less performant than dedicated servers

---

### **Option 2: Static File Server** (Recommended)

After building, serve the `dist/` folder with any static server:

#### **Using `serve` (npm package)**
```bash
# Install globally
npm install -g serve

# Build
npm run build

# Serve with network access
serve -s dist -l 5173 --host 0.0.0.0
```

#### **Using `http-server`**
```bash
# Install globally
npm install -g http-server

# Build
npm run build

# Serve with network access
http-server dist -p 5173 --host 0.0.0.0
```

#### **Using Python**
```bash
# Build
npm run build

# Serve (Python 3)
cd dist
python -m http.server 5173 --bind 0.0.0.0
```

---

### **Option 3: Nginx** (Production Grade)

**1. Build the app:**
```bash
npm run build
```

**2. Install Nginx:**
```bash
# Ubuntu/Debian
sudo apt install nginx

# Windows: Download from nginx.org
```

**3. Configure Nginx:**

Create `/etc/nginx/sites-available/thermal-printer`:
```nginx
server {
    listen 80;
    server_name 192.168.50.104;  # Your IP or domain
    
    root /path/to/thermal-printer/dist;
    index index.html;
    
    # SPA routing
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    
    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
}
```

**4. Enable and start:**
```bash
sudo ln -s /etc/nginx/sites-available/thermal-printer /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

**Access:** `http://192.168.50.104`

---

### **Option 4: Apache** (Alternative to Nginx)

**1. Build:**
```bash
npm run build
```

**2. Install Apache:**
```bash
# Ubuntu/Debian
sudo apt install apache2

# Enable rewrite module
sudo a2enmod rewrite
```

**3. Configure:**

Create `/etc/apache2/sites-available/thermal-printer.conf`:
```apache
<VirtualHost *:80>
    ServerName 192.168.50.104
    DocumentRoot /path/to/thermal-printer/dist
    
    <Directory /path/to/thermal-printer/dist>
        Options -Indexes +FollowSymLinks
        AllowOverride All
        Require all granted
        
        # SPA routing
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
</VirtualHost>
```

**4. Enable and start:**
```bash
sudo a2ensite thermal-printer
sudo systemctl restart apache2
```

---

### **Option 5: GitHub Pages** (Free Hosting)

Already set up in your `package.json` with `"homepage": "./"`:

**1. Build:**
```bash
npm run build
```

**2. Deploy to GitHub Pages:**
```bash
# Install gh-pages
npm install -D gh-pages

# Add to package.json scripts:
# "deploy": "npm run build && gh-pages -d dist"

# Deploy
npm run deploy
```

**3. Enable GitHub Pages:**
- Go to repo Settings → Pages
- Source: `gh-pages` branch
- Access: `https://yourusername.github.io/thermal-printer/`

**Note:** Backend must be accessible via HTTPS (use ngrok)

---

## 🔧 Build Configuration

### **Check build output:**
```bash
npm run build
```

Output:
```
dist/
├── index.html
├── assets/
│   ├── index-[hash].js    # Optimized JS
│   ├── index-[hash].css   # Optimized CSS
│   └── [other assets]
```

### **Build sizes:**
- Development: ~2-5 MB
- Production: ~500 KB - 1 MB (after compression)

### **Performance:**
- Development: HMR, source maps, hot reload
- Production: Minified, tree-shaken, optimized

---

## 📊 Command Comparison

| Command | Mode | Network | Use Case |
|---------|------|---------|----------|
| `npm run dev` | Development | ✅ Yes | Coding & Testing |
| `npm run build` | Build | N/A | Create production files |
| `npm run preview` | Production | ✅ Yes | Test production build |
| `npm run start` | Production | ✅ Yes | Build + Preview |
| `serve -s dist` | Production | ✅ Yes | Static file serving |

---

## 🌐 Network Access Summary

### **Development:**
```bash
npm run dev
# Access: http://192.168.50.104:5173
```

### **Production Preview:**
```bash
npm run preview
# Access: http://192.168.50.104:4173
```

### **Production (One Command):**
```bash
npm run start
# Build + Serve at: http://192.168.50.104:4173
```

---

## 🎯 Recommended Production Setup

### **For Quick Testing:**
```bash
npm run start
```

### **For Production Deployment:**

**Option A: Use a static server (simple)**
```bash
npm install -g serve
npm run build
serve -s dist -l 5173 --host 0.0.0.0
```

**Option B: Use Nginx (professional)**
```bash
npm run build
# Copy dist/ to /var/www/thermal-printer
# Configure Nginx (see above)
sudo systemctl start nginx
```

---

## 🚨 Common Issues

### **1. Port already in use**
```bash
# Kill process on port
netstat -ano | findstr :4173
taskkill /F /PID [PID]
```

### **2. Can't access from network**
- Check firewall (allow port 4173)
- Verify `--host` flag is used
- Confirm same WiFi network

### **3. API URL issues**
- Set `VITE_API_URL` in `.env` before building:
  ```bash
  VITE_API_URL=http://192.168.50.104:3001
  npm run build
  ```

### **4. Routing issues (404 on refresh)**
- For static servers, configure SPA routing
- Or use Nginx/Apache with rewrite rules

---

## ✅ Production Checklist

Before deploying to production:

- [ ] Run `npm run build` successfully
- [ ] Test with `npm run preview`
- [ ] Verify on mobile devices
- [ ] Check API URL configuration
- [ ] Test printer connection
- [ ] Set up firewall rules
- [ ] Configure CORS on backend
- [ ] Enable HTTPS (optional but recommended)
- [ ] Set up monitoring/logging
- [ ] Document deployment process

---

## 🎉 Quick Start (Production)

### **Method 1: Built-in Preview**
```bash
npm run start
```
Access: `http://192.168.50.104:4173`

### **Method 2: Static Server**
```bash
npm install -g serve
npm run build
serve -s dist -l 5173 --host 0.0.0.0
```
Access: `http://192.168.50.104:5173`

### **Method 3: Nginx (Best for Production)**
```bash
npm run build
# Configure Nginx to serve dist/
# Access via domain or IP
```

---

## 📝 Summary

- **Development:** `npm run dev` (already has `--host`)
- **Production:** `npm run start` (builds + previews with `--host`)
- **Best Practice:** Build → Serve with static server or Nginx

Your app is now production-ready! 🚀

