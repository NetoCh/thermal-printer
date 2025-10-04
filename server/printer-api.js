const express = require('express');
const net = require('net');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Store active printer connection
let activePrinterConnection = null;

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
 * Scan for network printers on the local network
 * This checks common printer ports (9100, 515) on local IP range
 */
async function scanForPrinters(baseIP = '192.168.1') {
  const printers = [];
  const ports = [9100, 515]; // 9100 = RAW printing, 515 = LPD
  const timeout = 500; // 500ms timeout per IP
  
  console.log(`Scanning network ${baseIP}.x for printers...`);
  
  // Scan IPs from 1 to 254
  const promises = [];
  
  for (let i = 1; i <= 254; i++) {
    const ip = `${baseIP}.${i}`;
    
    for (const port of ports) {
      promises.push(checkPrinterAtAddress(ip, port, timeout));
    }
  }
  
  // Wait for all scans to complete
  const results = await Promise.allSettled(promises);
  
  // Collect successful connections
  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value) {
      printers.push(result.value);
    }
  });
  
  console.log(`Found ${printers.length} printer(s)`);
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
      
      console.log(`Found printer at ${ip}:${port}`);
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
 * API Endpoints
 */

// Discover network printers
app.get('/api/printer/discover', async (req, res) => {
  try {
    // Get the base IP from query or use default
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

// Connect to a specific network printer
app.post('/api/printer/connect', async (req, res) => {
  const { ipAddress, port } = req.body;
  
  if (!ipAddress || !port) {
    return res.json({
      success: false,
      error: 'IP address and port are required'
    });
  }
  
  try {
    // Close existing connection if any
    if (activePrinterConnection) {
      activePrinterConnection.destroy();
    }
    
    // Create new connection
    activePrinterConnection = new net.Socket();
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Connection timeout'));
      }, 5000);
      
      activePrinterConnection.connect(port, ipAddress, () => {
        clearTimeout(timeout);
        console.log(`Connected to printer at ${ipAddress}:${port}`);
        
        // Initialize printer
        activePrinterConnection.write(ESC_POS.INIT);
        
        resolve();
      });
      
      activePrinterConnection.on('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
    
    res.json({
      success: true,
      message: `Connected to ${ipAddress}:${port}`
    });
    
  } catch (error) {
    console.error('Connection error:', error);
    activePrinterConnection = null;
    
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Disconnect from printer
app.post('/api/printer/disconnect', (req, res) => {
  if (activePrinterConnection) {
    activePrinterConnection.destroy();
    activePrinterConnection = null;
    console.log('Disconnected from printer');
  }
  
  res.json({
    success: true,
    message: 'Disconnected'
  });
});

// Print to network printer
app.post('/api/printer/print', async (req, res) => {
  const { text, customText, timestamp } = req.body;
  
  if (!activePrinterConnection) {
    return res.json({
      success: false,
      error: 'Printer not connected'
    });
  }
  
  try {
    // Build print job
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
    
    // Send all commands
    const printBuffer = Buffer.concat(commands);
    
    await new Promise((resolve, reject) => {
      activePrinterConnection.write(printBuffer, (err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
    
    console.log(`Printed: ${text}`);
    
    res.json({
      success: true,
      message: 'Print job sent successfully'
    });
    
  } catch (error) {
    console.error('Print error:', error);
    res.json({
      success: false,
      error: error.message
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Printer API server is running',
    connected: activePrinterConnection !== null
  });
});

app.listen(PORT, () => {
  console.log(`
  ╔═══════════════════════════════════════════╗
  ║  Thermal Printer API Server               ║
  ║  Running on: http://localhost:${PORT}       ║
  ║                                           ║
  ║  Endpoints:                               ║
  ║  GET  /api/printer/discover               ║
  ║  POST /api/printer/connect                ║
  ║  POST /api/printer/disconnect             ║
  ║  POST /api/printer/print                  ║
  ║  GET  /api/health                         ║
  ╚═══════════════════════════════════════════╝
  `);
});

