# Thermal Printer API Server

This is a backend API server that enables network printer support for the thermal printer web application.

## Features

- **Auto-discover Network Printers**: Automatically scans the local network for thermal printers
- **Connect to Network Printers**: Establishes TCP connections to network printers
- **Print via Network**: Sends ESC/POS commands to network printers
- **Multiple Protocol Support**: Supports both RAW (port 9100) and LPD (port 515) protocols

## Installation

```bash
cd server
npm install
```

## Usage

### Start the server:

```bash
npm start
```

### Or for development with auto-reload:

```bash
npm run dev
```

The server will run on `http://localhost:3001`

## API Endpoints

### 1. Discover Network Printers
**GET** `/api/printer/discover?baseIP=192.168.1`

Scans the local network for available printers.

**Query Parameters:**
- `baseIP` (optional): Base IP address to scan (default: "192.168.1")

**Response:**
```json
{
  "success": true,
  "printers": [
    {
      "ipAddress": "192.168.1.100",
      "port": 9100,
      "name": "Network Printer (192.168.1.100)"
    }
  ]
}
```

### 2. Connect to Printer
**POST** `/api/printer/connect`

Connects to a specific network printer.

**Request Body:**
```json
{
  "ipAddress": "192.168.1.100",
  "port": 9100
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connected to 192.168.1.100:9100"
}
```

### 3. Disconnect from Printer
**POST** `/api/printer/disconnect`

Disconnects from the current printer.

**Response:**
```json
{
  "success": true,
  "message": "Disconnected"
}
```

### 4. Print
**POST** `/api/printer/print`

Sends a print job to the connected printer.

**Request Body:**
```json
{
  "text": "Menu Item Name",
  "customText": "Welcome to Hard Plot Center!",
  "timestamp": "1/1/2024, 12:00:00 PM"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Print job sent successfully"
}
```

### 5. Health Check
**GET** `/api/health`

Checks if the server is running and if a printer is connected.

**Response:**
```json
{
  "success": true,
  "message": "Printer API server is running",
  "connected": true
}
```

## Network Scanning

The auto-discovery feature scans your local network for printers by:
1. Checking common printer ports (9100 for RAW, 515 for LPD)
2. Scanning the local IP range (e.g., 192.168.1.1 - 192.168.1.254)
3. Attempting quick connections with 500ms timeout per IP
4. Returning a list of all found printers

**Note:** Network scanning may take 10-30 seconds depending on your network size.

## Configuration

You can modify the following settings in `printer-api.js`:

- **PORT**: Change the API server port (default: 3001)
- **Base IP Range**: Modify the default base IP in the discover endpoint
- **Scan Timeout**: Adjust the timeout per IP check (default: 500ms)
- **Ports to Scan**: Add or remove printer ports in the `scanForPrinters` function

## Requirements

- Node.js 14 or higher
- Network access to your thermal printers
- Printers must support RAW (9100) or LPD (515) protocols

## Troubleshooting

### Discovery finds no printers
- Ensure printers are on the same network
- Check if printers support network printing
- Verify the base IP range matches your network
- Some networks block port scanning - check firewall settings

### Connection fails
- Verify the printer IP address is correct
- Ensure the printer port is correct (usually 9100)
- Check if printer is turned on and network cable is connected
- Test printer connection with: `telnet <printer-ip> 9100`

### Prints don't work
- Confirm printer supports ESC/POS commands
- Check if printer is out of paper
- Verify printer is not in error state

## CORS

The server has CORS enabled to allow requests from your React app. If you need to restrict access, modify the CORS configuration in `printer-api.js`.

