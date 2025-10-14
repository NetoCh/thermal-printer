const express = require('express');
const net = require('net');
const cors = require('cors');
const { SerialPort } = require('serialport');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Store active printer connections
let activeConnection = {
  type: null, // 'network' or 'serial'
  connection: null, // Socket or SerialPort instance
  info: {} // Connection details (IP, port, or COM port path)
};

// ESC/POS commands
const ESC_POS = {
  INIT: Buffer.from([0x1B, 0x40]),
  BOLD_ON: Buffer.from([0x1B, 0x45, 0x01]),
  BOLD_OFF: Buffer.from([0x1B, 0x45, 0x00]),
  CENTER: Buffer.from([0x1B, 0x61, 0x01]),
  LEFT: Buffer.from([0x1B, 0x61, 0x00]),
  FEED: Buffer.from([0x0A]),
  CUT: Buffer.from([0x1D, 0x56, 0x42, 0x00]),
  LARGE_TEXT: Buffer.from([0x1B, 0x21, 0x30]),
  NORMAL_TEXT: Buffer.from([0x1B, 0x21, 0x00])
};

/**
 * ========================================
 * SERIAL PORT (COM) FUNCTIONS
 * ========================================
 */

/**
 * List all available serial/COM ports
 */
async function listSerialPorts() {
  try {
    const ports = await SerialPort.list();
    
    // Filter and format ports (only show likely printer ports)
    const formattedPorts = ports.map(port => ({
      path: port.path,
      manufacturer: port.manufacturer || 'Unknown',
      serialNumber: port.serialNumber || 'N/A',
      vendorId: port.vendorId || 'N/A',
      productId: port.productId || 'N/A',
      name: port.friendlyName || port.path
    }));
    
    console.log(`Found ${formattedPorts.length} serial port(s)`);
    return formattedPorts;
  } catch (error) {
    console.error('Error listing serial ports:', error);
    throw error;
  }
}

/**
 * Connect to a serial/COM port printer
 */
async function connectToSerialPort(portPath, baudRate = 19200) {
  return new Promise((resolve, reject) => {
    try {
      const port = new SerialPort({
        path: portPath,
        baudRate: baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none'
      });

      port.on('open', () => {
        console.log(`Connected to serial printer at ${portPath}`);
        
        // Initialize printer
        port.write(ESC_POS.INIT, (err) => {
          if (err) {
            console.error('Error initializing printer:', err);
            port.close();
            reject(err);
          } else {
            resolve(port);
          }
        });
      });

      port.on('error', (err) => {
        console.error('Serial port error:', err);
        reject(err);
      });

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * ========================================
 * NETWORK PRINTER FUNCTIONS
 * ========================================
 */

/**
 * Scan for network printers on the local network
 */
async function scanForPrinters(baseIP = '192.168.1') {
  const printers = [];
  const ports = [9100, 515]; // 9100 = RAW printing, 515 = LPD
  const timeout = 500;
  
  console.log(`Scanning network ${baseIP}.x for printers...`);
  
  const promises = [];
  
  for (let i = 1; i <= 254; i++) {
    const ip = `${baseIP}.${i}`;
    
    for (const port of ports) {
      promises.push(checkPrinterAtAddress(ip, port, timeout));
    }
  }
  
  const results = await Promise.allSettled(promises);
  
  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value) {
      printers.push(result.value);
    }
  });
  
  console.log(`Found ${printers.length} network printer(s)`);
  return printers;
}

/**
 * Check if a printer exists at the given IP and port
 */
function checkPrinterAtAddress(ip, port, timeout) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    
    const timer = setTimeout(() => {
      socket.destroy();
      resolve(null);
    }, timeout);
    
    socket.connect(port, ip, () => {
      clearTimeout(timer);
      socket.destroy();
      
      console.log(`Found network printer at ${ip}:${port}`);
      resolve({
        ipAddress: ip,
        port: port,
        name: `Network Printer (${ip})`
      });
    });
    
    socket.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
  });
}

/**
 * Connect to a network printer
 */
async function connectToNetworkPrinter(ipAddress, port) {
  return new Promise((resolve, reject) => {
    const socket = new net.Socket();
    
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 5000);
    
    socket.connect(port, ipAddress, () => {
      clearTimeout(timeout);
      console.log(`Connected to network printer at ${ipAddress}:${port}`);
      
      // Initialize printer
      socket.write(ESC_POS.INIT);
      
      resolve(socket);
    });
    
    socket.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });
  });
}

/**
 * ========================================
 * UNIFIED PRINT FUNCTION
 * ========================================
 */

/**
 * Send data to printer (works for both serial and network)
 */
async function sendToPrinter(buffer) {
  return new Promise((resolve, reject) => {
    if (!activeConnection.connection) {
      reject(new Error('No printer connected'));
      return;
    }

    const connection = activeConnection.connection;
    
    connection.write(buffer, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

/**
 * Build print buffer with ESC/POS commands
 */
function buildPrintBuffer(text, customText, timestamp) {
  const commands = [];
  
  // Header
  commands.push(ESC_POS.CENTER);
  commands.push(ESC_POS.LARGE_TEXT);
  commands.push(ESC_POS.BOLD_ON);
  commands.push(Buffer.from('Hard Plot Center'));
  commands.push(ESC_POS.BOLD_OFF);
  commands.push(ESC_POS.FEED);
  commands.push(ESC_POS.FEED);
  
  // Custom text if provided
  if (customText && customText.trim()) {
    commands.push(ESC_POS.CENTER);
    commands.push(ESC_POS.NORMAL_TEXT);
    commands.push(ESC_POS.BOLD_ON);
    commands.push(Buffer.from(customText));
    commands.push(ESC_POS.BOLD_OFF);
    commands.push(ESC_POS.FEED);
    commands.push(ESC_POS.FEED);
  }
  
  // Main text
  commands.push(ESC_POS.CENTER);
  commands.push(ESC_POS.LARGE_TEXT);
  commands.push(ESC_POS.BOLD_ON);
  commands.push(Buffer.from(text));
  commands.push(ESC_POS.FEED);
  commands.push(ESC_POS.FEED);
  
  // Timestamp
  commands.push(ESC_POS.NORMAL_TEXT);
  commands.push(ESC_POS.BOLD_OFF);
  commands.push(Buffer.from(`Printed: ${timestamp}`));
  commands.push(ESC_POS.FEED);
  commands.push(ESC_POS.FEED);
  commands.push(ESC_POS.FEED);
  
  // Cut paper
  commands.push(ESC_POS.CUT);
  
  return Buffer.concat(commands);
}

/**
 * Disconnect active printer
 */
function disconnectPrinter() {
  if (activeConnection.connection) {
    try {
      if (activeConnection.type === 'serial') {
        activeConnection.connection.close();
      } else if (activeConnection.type === 'network') {
        activeConnection.connection.destroy();
      }
      console.log(`Disconnected from ${activeConnection.type} printer`);
    } catch (err) {
      console.error('Error disconnecting:', err);
    }
  }
  
  activeConnection = {
    type: null,
    connection: null,
    info: {}
  };
}

/**
 * ========================================
 * API ENDPOINTS
 * ========================================
 */

/**
 * List available serial/COM ports
 */
app.get('/api/printer/serial/list', async (req, res) => {
  try {
    const ports = await listSerialPorts();
    
    res.json({
      success: true,
      ports: ports
    });
  } catch (error) {
    console.error('Error listing serial ports:', error);
    res.json({
      success: false,
      error: error.message,
      ports: []
    });
  }
});

/**
 * Connect to serial/COM port printer
 */
app.post('/api/printer/serial/connect', async (req, res) => {
  const { portPath, baudRate } = req.body;
  
  if (!portPath) {
    return res.json({
      success: false,
      error: 'Port path is required'
    });
  }
  
  try {
    // Disconnect any existing connection
    disconnectPrinter();
    
    // Connect to serial port
    const serialPort = await connectToSerialPort(portPath, baudRate || 19200);
    
    activeConnection = {
      type: 'serial',
      connection: serialPort,
      info: { portPath, baudRate: baudRate || 19200 }
    };
    
    res.json({
      success: true,
      message: `Connected to serial printer at ${portPath}`,
      connectionType: 'serial'
    });
    
  } catch (error) {
    console.error('Serial connection error:', error);
    disconnectPrinter();
    
    res.json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Discover network printers
 */
app.get('/api/printer/discover', async (req, res) => {
  try {
    const baseIP = req.query.baseIP || '192.168.1';
    const printers = await scanForPrinters(baseIP);
    
    res.json({
      success: true,
      printers: printers
    });
  } catch (error) {
    console.error('Discovery error:', error);
    res.json({
      success: false,
      error: error.message,
      printers: []
    });
  }
});

/**
 * Connect to network printer
 */
app.post('/api/printer/connect', async (req, res) => {
  const { ipAddress, port } = req.body;
  
  if (!ipAddress || !port) {
    return res.json({
      success: false,
      error: 'IP address and port are required'
    });
  }
  
  try {
    // Disconnect any existing connection
    disconnectPrinter();
    
    // Connect to network printer
    const socket = await connectToNetworkPrinter(ipAddress, port);
    
    activeConnection = {
      type: 'network',
      connection: socket,
      info: { ipAddress, port }
    };
    
    res.json({
      success: true,
      message: `Connected to network printer at ${ipAddress}:${port}`,
      connectionType: 'network'
    });
    
  } catch (error) {
    console.error('Network connection error:', error);
    disconnectPrinter();
    
    res.json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Disconnect from printer (works for both serial and network)
 */
app.post('/api/printer/disconnect', (req, res) => {
  disconnectPrinter();
  
  res.json({
    success: true,
    message: 'Disconnected from printer'
  });
});

/**
 * Print to printer (works for both serial and network)
 */
app.post('/api/printer/print', async (req, res) => {
  const { text, customText, timestamp } = req.body;
  
  if (!activeConnection.connection) {
    return res.json({
      success: false,
      error: 'Printer not connected'
    });
  }
  
  try {
    // Build print buffer
    const printBuffer = buildPrintBuffer(text, customText, timestamp);
    
    // Send to printer
    await sendToPrinter(printBuffer);
    
    console.log(`Printed via ${activeConnection.type}: ${text}`);
    
    res.json({
      success: true,
      message: 'Print job sent successfully',
      connectionType: activeConnection.type
    });
    
  } catch (error) {
    console.error('Print error:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Get connection status
 */
app.get('/api/printer/status', (req, res) => {
  res.json({
    success: true,
    connected: activeConnection.connection !== null,
    connectionType: activeConnection.type,
    info: activeConnection.info
  });
});

/**
 * Health check
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Printer API server is running',
    connected: activeConnection.connection !== null,
    connectionType: activeConnection.type
  });
});

/**
 * Get local IP address
 */
function getLocalIpAddress() {
  const os = require('os');
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

/**
 * Get server information
 */
app.get('/api/server/info', (req, res) => {
  const localIp = getLocalIpAddress();
  
  res.json({
    success: true,
    server: {
      name: 'Thermal Printer API Server',
      version: '1.0.0',
      port: PORT,
      urls: {
        local: `http://localhost:${PORT}`,
        network: `http://${localIp}:${PORT}`
      },
      capabilities: [
        'Network Printer Support',
        'Serial/COM Port Support',
        'ESC/POS Commands',
        'Auto-discovery'
      ]
    },
    connection: {
      connected: activeConnection.connection !== null,
      type: activeConnection.type,
      info: activeConnection.info
    },
    endpoints: {
      info: {
        path: '/api/server/info',
        method: 'GET',
        description: 'Get server information'
      },
      health: {
        path: '/api/health',
        method: 'GET',
        description: 'Health check'
      },
      status: {
        path: '/api/printer/status',
        method: 'GET',
        description: 'Get printer connection status'
      },
      serial: {
        list: {
          path: '/api/printer/serial/list',
          method: 'GET',
          description: 'List available COM/Serial ports'
        },
        connect: {
          path: '/api/printer/serial/connect',
          method: 'POST',
          description: 'Connect to a COM/Serial port',
          body: {
            portPath: 'string (required)',
            baudRate: 'number (optional, default: 19200)'
          }
        }
      },
      network: {
        discover: {
          path: '/api/printer/discover',
          method: 'GET',
          description: 'Discover network printers',
          query: {
            baseIP: 'string (optional, default: 192.168.1)'
          }
        },
        connect: {
          path: '/api/printer/connect',
          method: 'POST',
          description: 'Connect to a network printer',
          body: {
            ipAddress: 'string (required)',
            port: 'number (required)'
          }
        }
      },
      common: {
        disconnect: {
          path: '/api/printer/disconnect',
          method: 'POST',
          description: 'Disconnect from printer'
        },
        print: {
          path: '/api/printer/print',
          method: 'POST',
          description: 'Send print job to connected printer',
          body: {
            text: 'string (required)',
            customText: 'string (optional)',
            timestamp: 'string (optional)'
          }
        }
      }
    },
    documentation: {
      readme: 'See server/README.md for detailed documentation',
      networkSetup: 'See NETWORK_SETUP.md for network configuration',
      startup: 'See STARTUP_GUIDE.md for usage instructions'
    }
  });
});

/**
 * Start server - Listen on all network interfaces (0.0.0.0)
 */
app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  
  console.log(`
  ╔═══════════════════════════════════════════════════════╗
  ║  Thermal Printer API Server                           ║
  ║                                                       ║
  ║  🌐 Local:   http://localhost:${PORT}                      ║
  ║  🌐 Network: http://${localIp}:${PORT}${' '.repeat(Math.max(0, 24 - localIp.length))}║
  ║                                                       ║
  ║  🖨️  Supports: Network + Serial/COM                   ║
  ║                                                       ║
  ║  📖 Server Info:                                      ║
  ║  GET  /api/server/info                                ║
  ║                                                       ║
  ║  Network Endpoints:                                   ║
  ║  GET  /api/printer/discover                           ║
  ║  POST /api/printer/connect                            ║
  ║                                                       ║
  ║  Serial/COM Endpoints:                                ║
  ║  GET  /api/printer/serial/list                        ║
  ║  POST /api/printer/serial/connect                     ║
  ║                                                       ║
  ║  Common Endpoints:                                    ║
  ║  POST /api/printer/disconnect                         ║
  ║  POST /api/printer/print                              ║
  ║  GET  /api/printer/status                             ║
  ║  GET  /api/health                                     ║
  ╚═══════════════════════════════════════════════════════╝
  
  💡 Other devices can access this API at: http://${localIp}:${PORT}
  📖 Full API info available at: http://${localIp}:${PORT}/api/server/info
  `);
});
