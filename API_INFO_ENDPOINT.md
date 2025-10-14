# 📖 Server Info Endpoint

## Overview

The `/api/server/info` endpoint provides complete information about the Thermal Printer API Server, including network URLs, capabilities, available endpoints, and current connection status.

---

## Endpoint Details

**URL:** `/api/server/info`  
**Method:** `GET`  
**Authentication:** None  
**Content-Type:** `application/json`

---

## Response Structure

```json
{
  "success": true,
  "server": {
    "name": "Thermal Printer API Server",
    "version": "1.0.0",
    "port": 3001,
    "urls": {
      "local": "http://localhost:3001",
      "network": "http://192.168.1.100:3001"
    },
    "capabilities": [
      "Network Printer Support",
      "Serial/COM Port Support",
      "ESC/POS Commands",
      "Auto-discovery"
    ]
  },
  "connection": {
    "connected": true,
    "type": "serial",
    "info": {
      "portPath": "COM3",
      "baudRate": 19200
    }
  },
  "endpoints": {
    "info": { ... },
    "health": { ... },
    "status": { ... },
    "serial": { ... },
    "network": { ... },
    "common": { ... }
  },
  "documentation": {
    "readme": "See server/README.md for detailed documentation",
    "networkSetup": "See NETWORK_SETUP.md for network configuration",
    "startup": "See STARTUP_GUIDE.md for usage instructions"
  }
}
```

---

## Response Fields

### `server` Object

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Server name |
| `version` | string | Server version |
| `port` | number | Port number server is running on |
| `urls.local` | string | Localhost URL |
| `urls.network` | string | Network-accessible URL with server's IP |
| `capabilities` | array | List of server capabilities |

### `connection` Object

| Field | Type | Description |
|-------|------|-------------|
| `connected` | boolean | Whether a printer is currently connected |
| `type` | string\|null | Connection type: "serial" or "network" |
| `info` | object | Connection details (port path, IP, etc.) |

### `endpoints` Object

Complete documentation of all available API endpoints, including:
- Path
- Method
- Description
- Required parameters
- Optional parameters

---

## Usage Examples

### Using cURL

```bash
# Basic request
curl http://localhost:3001/api/server/info

# From network device
curl http://192.168.1.100:3001/api/server/info

# Pretty print JSON
curl http://192.168.1.100:3001/api/server/info | jq
```

### Using JavaScript (Fetch)

```javascript
// Get server info
fetch('http://192.168.1.100:3001/api/server/info')
  .then(response => response.json())
  .then(data => {
    console.log('Server:', data.server.urls.network);
    console.log('Connected:', data.connection.connected);
    console.log('Endpoints:', Object.keys(data.endpoints));
  });
```

### Using Python

```python
import requests
import json

# Get server info
response = requests.get('http://192.168.1.100:3001/api/server/info')
data = response.json()

print(f"Server URL: {data['server']['urls']['network']}")
print(f"Connected: {data['connection']['connected']}")
print(f"Capabilities: {', '.join(data['server']['capabilities'])}")
```

### Using PowerShell

```powershell
# Get server info
$response = Invoke-RestMethod -Uri "http://192.168.1.100:3001/api/server/info"

Write-Host "Server: $($response.server.urls.network)"
Write-Host "Connected: $($response.connection.connected)"
Write-Host "Port: $($response.server.port)"
```

---

## Use Cases

### 1. Client Discovery

Automatically discover server's network address:

```javascript
// Try to connect to known server
async function discoverServer(serverIP) {
  try {
    const response = await fetch(`http://${serverIP}:3001/api/server/info`);
    const info = await response.json();
    
    // Use the network URL for future requests
    const apiUrl = info.server.urls.network;
    console.log('Found server at:', apiUrl);
    
    return apiUrl;
  } catch (error) {
    console.error('Server not found');
    return null;
  }
}
```

### 2. Service Health Monitoring

Monitor server status and capabilities:

```javascript
async function checkServerHealth() {
  const info = await fetch('/api/server/info').then(r => r.json());
  
  return {
    online: info.success,
    connected: info.connection.connected,
    connectionType: info.connection.type,
    capabilities: info.server.capabilities
  };
}
```

### 3. Dynamic API Documentation

Build dynamic API documentation from server response:

```javascript
async function loadApiDocs() {
  const info = await fetch('/api/server/info').then(r => r.json());
  
  // Generate documentation from endpoints object
  Object.entries(info.endpoints).forEach(([category, endpoints]) => {
    console.log(`\n${category.toUpperCase()} ENDPOINTS:`);
    
    if (endpoints.path) {
      // Single endpoint
      console.log(`  ${endpoints.method} ${endpoints.path}`);
      console.log(`    ${endpoints.description}`);
    } else {
      // Multiple endpoints
      Object.entries(endpoints).forEach(([name, endpoint]) => {
        console.log(`  ${endpoint.method} ${endpoint.path}`);
        console.log(`    ${endpoint.description}`);
      });
    }
  });
}
```

### 4. Network URL Discovery for Frontend

Automatically configure frontend to use correct backend URL:

```javascript
// In your frontend config
async function getBackendUrl() {
  // Try localhost first
  try {
    const response = await fetch('http://localhost:3001/api/server/info');
    const info = await response.json();
    return info.server.urls.network;
  } catch (error) {
    // Fallback to environment variable or default
    return process.env.VITE_API_URL || 'http://localhost:3001';
  }
}
```

---

## Example Response

```json
{
  "success": true,
  "server": {
    "name": "Thermal Printer API Server",
    "version": "1.0.0",
    "port": 3001,
    "urls": {
      "local": "http://localhost:3001",
      "network": "http://192.168.1.100:3001"
    },
    "capabilities": [
      "Network Printer Support",
      "Serial/COM Port Support",
      "ESC/POS Commands",
      "Auto-discovery"
    ]
  },
  "connection": {
    "connected": true,
    "type": "serial",
    "info": {
      "portPath": "COM3",
      "baudRate": 19200
    }
  },
  "endpoints": {
    "info": {
      "path": "/api/server/info",
      "method": "GET",
      "description": "Get server information"
    },
    "health": {
      "path": "/api/health",
      "method": "GET",
      "description": "Health check"
    },
    "status": {
      "path": "/api/printer/status",
      "method": "GET",
      "description": "Get printer connection status"
    },
    "serial": {
      "list": {
        "path": "/api/printer/serial/list",
        "method": "GET",
        "description": "List available COM/Serial ports"
      },
      "connect": {
        "path": "/api/printer/serial/connect",
        "method": "POST",
        "description": "Connect to a COM/Serial port",
        "body": {
          "portPath": "string (required)",
          "baudRate": "number (optional, default: 19200)"
        }
      }
    },
    "network": {
      "discover": {
        "path": "/api/printer/discover",
        "method": "GET",
        "description": "Discover network printers",
        "query": {
          "baseIP": "string (optional, default: 192.168.1)"
        }
      },
      "connect": {
        "path": "/api/printer/connect",
        "method": "POST",
        "description": "Connect to a network printer",
        "body": {
          "ipAddress": "string (required)",
          "port": "number (required)"
        }
      }
    },
    "common": {
      "disconnect": {
        "path": "/api/printer/disconnect",
        "method": "POST",
        "description": "Disconnect from printer"
      },
      "print": {
        "path": "/api/printer/print",
        "method": "POST",
        "description": "Send print job to connected printer",
        "body": {
          "text": "string (required)",
          "customText": "string (optional)",
          "timestamp": "string (optional)"
        }
      }
    }
  },
  "documentation": {
    "readme": "See server/README.md for detailed documentation",
    "networkSetup": "See NETWORK_SETUP.md for network configuration",
    "startup": "See STARTUP_GUIDE.md for usage instructions"
  }
}
```

---

## Testing

### Quick Test

```bash
# Start server
./start.sh backend

# Test endpoint
curl http://localhost:3001/api/server/info | jq

# From another device
curl http://192.168.1.100:3001/api/server/info | jq
```

### Browser Test

Open in browser:
```
http://localhost:3001/api/server/info
http://192.168.1.100:3001/api/server/info
```

---

## Integration Examples

### React Hook

```typescript
import { useState, useEffect } from 'react';

export function useServerInfo() {
  const [serverInfo, setServerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch('/api/server/info')
      .then(res => res.json())
      .then(data => {
        setServerInfo(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err);
        setLoading(false);
      });
  }, []);

  return { serverInfo, loading, error };
}
```

### Node.js Client

```javascript
const axios = require('axios');

async function getServerInfo(serverUrl) {
  try {
    const response = await axios.get(`${serverUrl}/api/server/info`);
    return response.data;
  } catch (error) {
    console.error('Failed to get server info:', error.message);
    return null;
  }
}

// Usage
const info = await getServerInfo('http://192.168.1.100:3001');
console.log('Server capabilities:', info.server.capabilities);
```

---

## Benefits

✅ **Self-Documenting API** - Endpoint describes all available API routes  
✅ **Network Discovery** - Clients can find the correct network URL  
✅ **Service Monitoring** - Check server health and capabilities  
✅ **Connection Status** - See if printer is connected  
✅ **Dynamic Configuration** - Frontend can auto-configure from server response  
✅ **Version Information** - Track API version  

---

## Related Endpoints

- `/api/health` - Simple health check
- `/api/printer/status` - Printer connection status only
- `/api/printer/discover` - Discover printers on network
- `/api/printer/serial/list` - List COM ports

---

**Access the endpoint now:**
```bash
curl http://localhost:3001/api/server/info
```

