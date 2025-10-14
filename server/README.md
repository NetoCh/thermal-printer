# Thermal Printer API Server

This is a backend API server that enables **network** and **serial/COM port** printer support for the thermal printer web application.

## Features

- **🖨️ Serial/COM Port Support**: Connect to USB thermal printers via COM ports
- **🔍 Auto-discover COM Ports**: Lists all available serial ports on the system
- **🌐 Auto-discover Network Printers**: Automatically scans the local network for thermal printers
- **🔌 Connect to Network Printers**: Establishes TCP connections to network printers
- **📄 Print via Network or Serial**: Sends ESC/POS commands to both connection types
- **🔄 Multiple Protocol Support**: Supports RAW (port 9100) and LPD (port 515) protocols

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

### Serial/COM Port Endpoints

#### 1. List COM Ports
**GET** `/api/printer/serial/list`

Lists all available serial/COM ports on the system.

**Response:**
```json
{
  "success": true,
  "ports": [
    {
      "path": "COM3",
      "manufacturer": "FTDI",
      "serialNumber": "A12345",
      "vendorId": "0403",
      "productId": "6001",
      "name": "USB Serial Port (COM3)"
    }
  ]
}
```

#### 2. Connect to Serial Port
**POST** `/api/printer/serial/connect`

Connects to a specific serial/COM port.

**Request Body:**
```json
{
  "portPath": "COM3",
  "baudRate": 19200
}
```

**Response:**
```json
{
  "success": true,
  "message": "Connected to serial printer at COM3",
  "connectionType": "serial"
}
```

### Network Printer Endpoints

#### 3. Discover Network Printers
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

#### 4. Connect to Network Printer
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
  "message": "Connected to network printer at 192.168.1.100:9100",
  "connectionType": "network"
}
```

### Common Endpoints

#### 5. Disconnect from Printer
**POST** `/api/printer/disconnect`

Disconnects from the current printer (works for both serial and network).

**Response:**
```json
{
  "success": true,
  "message": "Disconnected from printer"
}
```

#### 6. Print
**POST** `/api/printer/print`

Sends a print job to the connected printer (works for both serial and network).

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
  "message": "Print job sent successfully",
  "connectionType": "serial"
}
```

#### 7. Get Connection Status
**GET** `/api/printer/status`

Gets the current connection status.

**Response:**
```json
{
  "success": true,
  "connected": true,
  "connectionType": "serial",
  "info": {
    "portPath": "COM3",
    "baudRate": 19200
  }
}
```

#### 8. Health Check
**GET** `/api/health`

Checks if the server is running and if a printer is connected.

**Response:**
```json
{
  "success": true,
  "message": "Printer API server is running",
  "connected": true,
  "connectionType": "serial"
}
```

## Connection Types

### Serial/COM Port Connection
- **Best for**: USB-connected thermal printers
- **Advantages**: 
  - Direct connection via USB cable
  - No network configuration needed
  - Works offline
- **Requirements**:
  - Printer connected via USB
  - Correct COM port selected
  - Matching baud rate (usually 19200 for thermal printers)

### Network Connection
- **Best for**: Network-enabled thermal printers
- **Advantages**:
  - Wireless printing
  - Multiple devices can share one printer
  - No physical cable needed
- **Requirements**:
  - Printer on the same network
  - Printer IP address and port (usually 9100)
  - Network access to printer

## Network Scanning

The auto-discovery feature scans your local network for printers by:
1. Checking common printer ports (9100 for RAW, 515 for LPD)
2. Scanning the local IP range (e.g., 192.168.1.1 - 192.168.1.254)
3. Attempting quick connections with 500ms timeout per IP
4. Returning a list of all found printers

**Note:** Network scanning may take 10-30 seconds depending on your network size.

## Serial Port Configuration

### Common Baud Rates
- **9600**: Older thermal printers
- **19200**: Most common for thermal printers (default)
- **38400**: High-speed thermal printers
- **115200**: Very high-speed printers

### Default Settings
- **Data Bits**: 8
- **Stop Bits**: 1
- **Parity**: None

These settings work with most ESC/POS thermal printers.

## Configuration

You can modify the following settings in `printer-api.js`:

- **PORT**: Change the API server port (default: 3001)
- **Base IP Range**: Modify the default base IP in the discover endpoint
- **Scan Timeout**: Adjust the timeout per IP check (default: 500ms)
- **Ports to Scan**: Add or remove printer ports in the `scanForPrinters` function
- **Serial Settings**: Modify baud rate, data bits, stop bits, and parity

## Requirements

- **Node.js 14 or higher**
- **SerialPort library**: For COM/Serial port support
- **Network access**: For network printer discovery and connection
- **Printers must support ESC/POS commands**

## Troubleshooting

### Serial/COM Port Issues

#### No COM ports found
- Ensure printer is connected via USB cable
- Check if printer is powered on
- Install USB-to-Serial drivers if needed (e.g., FTDI, Prolific)
- Try a different USB port
- Check Device Manager (Windows) or `ls /dev/tty*` (Mac/Linux)

#### Connection to COM port fails
- Verify correct COM port selected
- Check baud rate matches printer settings (usually 19200)
- Ensure no other application is using the port
- Try closing and reopening the printer connection
- Restart the printer

### Network Issues

#### Discovery finds no printers
- Ensure printers are on the same network
- Check if printers support network printing
- Verify the base IP range matches your network
- Some networks block port scanning - check firewall settings

#### Connection fails
- Verify the printer IP address is correct
- Ensure the printer port is correct (usually 9100)
- Check if printer is turned on and network cable is connected
- Test printer connection with: `telnet <printer-ip> 9100`

### Print Issues

#### Prints don't work
- Confirm printer supports ESC/POS commands
- Check if printer is out of paper
- Verify printer is not in error state
- Check cable connections (USB or network)
- Try printing a test page from printer settings

#### Garbled output
- Verify baud rate is correct (for serial connections)
- Check character encoding settings
- Ensure printer supports the ESC/POS commands being sent

## CORS

The server has CORS enabled to allow requests from your React app. If you need to restrict access, modify the CORS configuration in `printer-api.js`.

## Dependencies

```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "serialport": "^12.0.0"
}
```

## Platform Support

- **Windows**: COM1, COM2, COM3, etc.
- **macOS**: /dev/tty.usbserial, /dev/cu.usbserial, etc.
- **Linux**: /dev/ttyUSB0, /dev/ttyACM0, etc.

The API automatically detects available ports on all platforms.
