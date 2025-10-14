import { useState, useCallback, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Printer, Wifi, WifiOff, AlertCircle, Settings, FileText, ArrowLeft, Globe } from 'lucide-react';
import SettingsPage from './components/SettingsPage';
import FormPage from './components/FormPage';
import hpcLogo from './assets/hpc-logo.svg';
import { getApiBaseUrl, updateApiBaseUrl, clearApiBaseUrl, getDefaultApiUrl, hasCustomApiUrl } from './config';

interface SerialPortConnection {
  port: any | null; // SerialPort type from Web Serial API
  writer: WritableStreamDefaultWriter | null;
  connected: boolean;
}

interface NetworkPrinterConnection {
  ipAddress: string;
  port: number;
  connected: boolean;
}

interface ThermalPrinterSettings {
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: 'none' | 'even' | 'odd';
  customText: string;
}

type ConnectionType = 'serial' | 'network' | 'serial-backend';

interface AnimalButton {
  name: string;
  color: string;
  emoji: string;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [connectionType, setConnectionType] = useState<ConnectionType>('serial');
  const [connection, setConnection] = useState<SerialPortConnection>({
    port: null,
    writer: null,
    connected: false
  });
  const [networkConnection, setNetworkConnection] = useState<NetworkPrinterConnection>({
    ipAddress: '192.168.1.100',
    port: 9100,
    connected: false
  });
  const [networkSettings, setNetworkSettings] = useState({
    ipAddress: '192.168.1.100',
    port: 9100
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<Array<{ ipAddress: string; port: number; name?: string }>>([]);
  const [discoveredSerialPorts, setDiscoveredSerialPorts] = useState<Array<{ path: string; manufacturer: string; name: string }>>([]);
  const [selectedSerialPort, setSelectedSerialPort] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [lastPrinted, setLastPrinted] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [apiUrl, setApiUrl] = useState<string>(getApiBaseUrl());
  const [customApiUrl, setCustomApiUrl] = useState<string>('');
  
  // Update API URL on mount
  useEffect(() => {
    const currentUrl = getApiBaseUrl();
    setApiUrl(currentUrl);
    if (hasCustomApiUrl()) {
      setCustomApiUrl(currentUrl);
    }
  }, []);
  
  // Default settings - now configurable
  const [thermalPrinterSettings, setThermalPrinterSettings] = useState<ThermalPrinterSettings>({
    baudRate: 19200,
    dataBits: 8,
    stopBits: 1,
    parity: 'none',
    customText: 'Welcome to Hard Plot Center!'
  });

  const [animalButtons, setAnimalButtons] = useState<AnimalButton[]>([
    { name: 'Dona', color: 'bg-amber-600 hover:bg-amber-700', emoji: '$1.25' },
    { name: 'Polo Bao', color: 'bg-purple-600 hover:bg-purple-700', emoji: '$1.50' },
    { name: 'Mafa Dulce', color: 'bg-green-600 hover:bg-green-700', emoji: '$1.50' },
    { name: 'Pastelito de Queso', color: 'bg-blue-600 hover:bg-blue-700', emoji: '$1.75' },
    { name: 'Caramel Dona', color: 'bg-red-600 hover:bg-red-700', emoji: '$2.00' },
    { name: 'Emparedado de Jamon', color: 'bg-yellow-600 hover:bg-yellow-700', emoji: '$2.00' },
    { name: 'Ham & Cheese Parmesan', color: 'bg-pink-600 hover:bg-pink-700', emoji: '$2.25' },
    { name: 'Huevo, Jamon y Maiz', color: 'bg-indigo-600 hover:bg-indigo-700', emoji: '$2.25' },
    { name: 'Pan con Salchicha', color: 'bg-teal-600 hover:bg-teal-700', emoji: '$2.25' },
    { name: 'Pan Pizza', color: 'bg-orange-600 hover:bg-orange-700', emoji: '$2.25' },
    { name: 'Pastelito de Pollo', color: 'bg-cyan-600 hover:bg-cyan-700', emoji: '$2.25' },
    { name: 'Pan Bacon', color: 'bg-lime-600 hover:bg-lime-700', emoji: '$2.25' },
    { name: 'Bacon Cheese', color: 'bg-rose-600 hover:bg-rose-700', emoji: '$2.50' }
  ]);

  // ESC/POS commands for thermal printer
  const ESC_POS = {
    INIT: new Uint8Array([0x1B, 0x40]), // Initialize printer
    BOLD_ON: new Uint8Array([0x1B, 0x45, 0x01]), // Bold on
    BOLD_OFF: new Uint8Array([0x1B, 0x45, 0x00]), // Bold off
    CENTER: new Uint8Array([0x1B, 0x61, 0x01]), // Center align
    LEFT: new Uint8Array([0x1B, 0x61, 0x00]), // Left align
    FEED: new Uint8Array([0x0A]), // Line feed
    CUT: new Uint8Array([0x1D, 0x56, 0x42, 0x00]), // Partial cut
    LARGE_TEXT: new Uint8Array([0x1B, 0x21, 0x30]), // Large text
    NORMAL_TEXT: new Uint8Array([0x1B, 0x21, 0x00]), // Normal text
    PRINT_BITMAP: new Uint8Array([0x1D, 0x76, 0x30, 0x00]) // Print bitmap
  };

  const handleSaveSettings = useCallback((newPrinterSettings: ThermalPrinterSettings, newAnimalButtons: AnimalButton[]) => {
    setThermalPrinterSettings(newPrinterSettings);
    setAnimalButtons(newAnimalButtons);
    
    // If connected, disconnect to apply new printer settings
    if (connection.connected) {
      disconnectPrinter();
    }
  }, [connection.connected]);

  const handleSaveApiUrl = useCallback(() => {
    if (customApiUrl && customApiUrl.trim()) {
      const url = customApiUrl.trim();
      updateApiBaseUrl(url);
      setApiUrl(url);
      setError(null);
      setShowApiSettings(false);
      // Reload page to apply new API URL
      window.location.reload();
    }
  }, [customApiUrl]);

  const handleResetApiUrl = useCallback(() => {
    clearApiBaseUrl();
    const defaultUrl = getDefaultApiUrl();
    setApiUrl(defaultUrl);
    setCustomApiUrl('');
    setShowApiSettings(false);
    // Reload page to apply default API URL
    window.location.reload();
  }, []);

  const connectToSerialPrinter = useCallback(async () => {
    if (!('serial' in navigator)) {
      setError('Web Serial API not supported in this browser');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      // Request access to serial port
      const port = await (navigator as any).serial.requestPort();
      
      // Open the port with appropriate settings for thermal printer
      await port.open(thermalPrinterSettings);

      const writer = port.writable.getWriter();

      // Initialize printer
      await writer.write(ESC_POS.INIT);

      setConnection({ port, writer, connected: true });
      setError(null);
    } catch (err) {
      setError(`Failed to connect: ${(err as Error).message}`);
      setConnection({ port: null, writer: null, connected: false });
    } finally {
      setIsConnecting(false);
    }
  }, [thermalPrinterSettings]);

  const discoverSerialPorts = useCallback(async () => {
    setIsDiscovering(true);
    setError(null);

    try {
      // Call backend API to list serial/COM ports
      const response = await fetch(`${apiUrl}/api/printer/serial/list`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to list serial ports');
      }

      const result = await response.json();
      
      if (result.success && result.ports) {
        setDiscoveredSerialPorts(result.ports);
        if (result.ports.length === 0) {
          setError('No serial/COM ports found. Make sure your printer is connected via USB.');
        }
      } else {
        throw new Error(result.error || 'Failed to list serial ports');
      }
    } catch (err) {
      setError(`Serial port discovery failed: ${(err as Error).message}. Make sure the backend API server is running.`);
      setDiscoveredSerialPorts([]);
    } finally {
      setIsDiscovering(false);
    }
  }, []);

  const discoverNetworkPrinters = useCallback(async () => {
    setIsDiscovering(true);
    setError(null);

    try {
      // Call backend API to discover network printers
      const response = await fetch(`${apiUrl}/api/printer/discover`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to discover printers');
      }

      const result = await response.json();
      
      if (result.success && result.printers) {
        setDiscoveredPrinters(result.printers);
        if (result.printers.length === 0) {
          setError('No network printers found on the local network');
        }
      } else {
        throw new Error(result.error || 'Failed to discover printers');
      }
    } catch (err) {
      setError(`Printer discovery failed: ${(err as Error).message}. Make sure the backend API server is running.`);
      setDiscoveredPrinters([]);
    } finally {
      setIsDiscovering(false);
    }
  }, []);

  const connectToSerialBackend = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!selectedSerialPort) {
        throw new Error('Please select a COM port');
      }

      // Connect to serial printer via backend API
      const response = await fetch(`${apiUrl}/api/printer/serial/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          portPath: selectedSerialPort,
          baudRate: thermalPrinterSettings.baudRate
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setNetworkConnection({
          ipAddress: selectedSerialPort,
          port: thermalPrinterSettings.baudRate,
          connected: true
        });
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to connect to serial printer');
      }
    } catch (err) {
      setError(`Failed to connect to serial printer: ${(err as Error).message}. Make sure the backend API server is running.`);
      setNetworkConnection({
        ipAddress: '',
        port: 0,
        connected: false
      });
    } finally {
      setIsConnecting(false);
    }
  }, [selectedSerialPort, thermalPrinterSettings.baudRate]);

  const connectToNetworkPrinter = useCallback(async () => {
    setIsConnecting(true);
    setError(null);

    try {
      if (!networkSettings.ipAddress || !networkSettings.port) {
        throw new Error('Please provide valid IP address and port');
      }

      // For network printers, we'll use a backend API endpoint
      // You'll need to set up a simple server that handles the network printing
      const response = await fetch(`${apiUrl}/api/printer/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ipAddress: networkSettings.ipAddress,
          port: networkSettings.port
        })
      });

      const result = await response.json();
      
      if (result.success) {
        setNetworkConnection({
          ipAddress: networkSettings.ipAddress,
          port: networkSettings.port,
          connected: true
        });
        setError(null);
      } else {
        throw new Error(result.error || 'Failed to connect to network printer');
      }
    } catch (err) {
      setError(`Failed to connect to network printer: ${(err as Error).message}. Network printing requires a backend API server.`);
      setNetworkConnection({
        ipAddress: networkSettings.ipAddress,
        port: networkSettings.port,
        connected: false
      });
    } finally {
      setIsConnecting(false);
    }
  }, [networkSettings]);

  const connectToPrinter = useCallback(async () => {
    if (connectionType === 'serial') {
      await connectToSerialPrinter();
    } else if (connectionType === 'serial-backend') {
      await connectToSerialBackend();
    } else {
      await connectToNetworkPrinter();
    }
    setShowConnectionModal(false);
  }, [connectionType, connectToSerialPrinter, connectToSerialBackend, connectToNetworkPrinter]);

  const disconnectPrinter = useCallback(async () => {
    if (connectionType === 'serial') {
      if (connection.writer) {
        try {
          await connection.writer.close();
        } catch (err) {
          console.error('Error closing writer:', err);
        }
      }

      if (connection.port) {
        try {
          await connection.port.close();
        } catch (err) {
          console.error('Error closing port:', err);
        }
      }

      setConnection({ port: null, writer: null, connected: false });
    } else {
      // Disconnect network or serial-backend printer via API
      try {
        await fetch(`${apiUrl}/api/printer/disconnect`, { method: 'POST' });
      } catch (err) {
        console.error('Error disconnecting printer:', err);
      }
      setNetworkConnection({ ...networkConnection, connected: false });
    }

    setError(null);
  }, [connection, connectionType, networkConnection, apiUrl]);

  const printText = useCallback(async (text: string) => {
    const isConnected = connectionType === 'serial' ? connection.connected : networkConnection.connected;
    
    if (!isConnected) {
      setError('Printer not connected');
      return;
    }

    try {
      const encoder = new TextEncoder();
      const timestamp = new Date().toLocaleString();

      if (connectionType === 'serial' && connection.writer) {
        const writer = connection.writer;

        await writer.write(ESC_POS.CENTER); // Center alignment
        await writer.write(ESC_POS.LARGE_TEXT); // Large text
        await writer.write(ESC_POS.BOLD_ON); // Bold on
        await writer.write(encoder.encode(`Hard Plot Center`));
        await writer.write(ESC_POS.BOLD_OFF); // Bold off
        await writer.write(ESC_POS.FEED);
        await writer.write(ESC_POS.FEED);

        // Print custom text if configured
        if (thermalPrinterSettings.customText.trim()) {
          await writer.write(ESC_POS.CENTER); // Center alignment
          await writer.write(ESC_POS.NORMAL_TEXT); // Normal text size
          await writer.write(ESC_POS.BOLD_ON); // Bold on
          await writer.write(encoder.encode(thermalPrinterSettings.customText));
          await writer.write(ESC_POS.BOLD_OFF); // Bold off
          await writer.write(ESC_POS.FEED);
          await writer.write(ESC_POS.FEED);
        }

        // Print sequence
        await writer.write(ESC_POS.CENTER); // Center alignment
        await writer.write(ESC_POS.LARGE_TEXT); // Large text
        await writer.write(ESC_POS.BOLD_ON); // Bold on
        
        // Print the animal name
        await writer.write(encoder.encode(text));
        await writer.write(ESC_POS.FEED);
        await writer.write(ESC_POS.FEED);
        
        // Print timestamp
        await writer.write(ESC_POS.NORMAL_TEXT); // Normal text
        await writer.write(ESC_POS.BOLD_OFF); // Bold off
        await writer.write(encoder.encode(`Printed: ${timestamp}`));
        await writer.write(ESC_POS.FEED);
        await writer.write(ESC_POS.FEED);
        await writer.write(ESC_POS.FEED);
        
        // Cut paper
        await writer.write(ESC_POS.CUT);
      } else if (connectionType === 'network' || connectionType === 'serial-backend') {
        // Send print job to network/serial-backend printer via backend API
        const response = await fetch(`${apiUrl}/api/printer/print`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            customText: thermalPrinterSettings.customText,
            timestamp
          })
        });

        const result = await response.json();
        
        if (!result.success) {
          throw new Error(result.error || 'Failed to print');
        }
      }

      setLastPrinted(text);
      setError(null);
    } catch (err) {
      setError(`Print failed: ${(err as Error).message}`);
    }
  }, [connection, connectionType, networkConnection, thermalPrinterSettings, apiUrl]);

  const MainPage = () => (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      {/* Error Message */}
      {error && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
          <div className="flex items-start sm:items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-2 sm:mr-3 flex-shrink-0 mt-0.5 sm:mt-0" />
            <p className="text-sm sm:text-base text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Last Printed Info */}
      {lastPrinted && (
        <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-green-50 border-l-4 border-green-400 rounded-r-lg">
          <p className="text-sm sm:text-base text-green-700">
            ✅ Successfully printed: <strong className="break-words">{lastPrinted}</strong>
          </p>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 lg:p-8">
        <div className="text-center mb-6 sm:mb-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">Select an option</h2>
          <p className="text-sm sm:text-base text-gray-600">Click any button to print the menu item on your LR2000 thermal printer</p>
        </div>

        {/* Animal Buttons Grid - Responsive: 1 col on mobile, 2 on tablet, 3 on desktop */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6 max-w-5xl mx-auto">
          {animalButtons.map((animal) => (
            <button
              key={animal.name}
              onClick={() => printText(animal.name)}
              disabled={!(connection.connected || networkConnection.connected)}
              className={`
                ${animal.color} 
                text-white font-bold text-base sm:text-lg lg:text-xl 
                py-6 sm:py-7 lg:py-8 px-4 sm:px-5 lg:px-6 rounded-xl
                transform transition-all duration-200 
                hover:scale-105 hover:shadow-lg
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                active:scale-95
                flex flex-col items-center justify-center space-y-1 sm:space-y-2
                min-h-[120px] sm:min-h-[140px]
              `}
            >
              <span className="text-3xl sm:text-4xl mb-1 sm:mb-2">{animal.emoji}</span>
              <span className="text-center leading-tight">{animal.name}</span>
            </button>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-8 sm:mt-12 p-4 sm:p-6 bg-gray-50 rounded-lg">
          <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-3">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2 text-sm sm:text-base text-gray-600">
            <li>Connect your LR2000 thermal printer via USB or Serial port</li>
            <li>Click "Connect Printer" and select your printer from the list</li>
            <li>Once connected, click any button to print</li>
            <li>The printer will print the name with timestamp and cut the paper</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
            <p className="text-xs sm:text-sm text-blue-700">
              <strong>Note:</strong> This app uses the Web Serial API and requires a modern browser like Chrome. 
              Make sure your printer is compatible with ESC/POS commands.
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200">
      {/* Header - Fully Responsive */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
          {/* Top Row: Logo and Title */}
          <div className="flex items-center justify-between mb-3 sm:mb-0">
            <div className="flex items-center space-x-2 sm:space-x-3">
              {location.pathname !== '/' && (
                <button
                  onClick={() => navigate('/')}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                  title="Back to Main"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <Printer className="w-6 h-6 sm:w-8 sm:h-8 text-gray-700" />
              <div className="flex items-center space-x-2 sm:space-x-3">
                <img src={hpcLogo} alt="HPC Logo" className="w-6 h-6 sm:w-8 sm:h-8" />
                <h1 className="text-lg sm:text-2xl font-bold text-gray-800">Hard Plot Center</h1>
              </div>
            </div>
            
            {/* Mobile: Quick Action Icons */}
            <div className="flex sm:hidden items-center space-x-2">
              {location.pathname === '/' && (
                <button
                  onClick={() => navigate('/form')}
                  className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  title="Business Form"
                >
                  <FileText className="w-5 h-5" />
                </button>
              )}
              <button
                onClick={() => setShowApiSettings(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="API Server Settings"
              >
                <Globe className="w-5 h-5" />
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
          
          {/* Bottom Row: Connection Status and Actions */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
            {/* Connection Status */}
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              {(connection.connected || networkConnection.connected) ? (
                <>
                  <Wifi className="w-5 h-5 text-green-500 flex-shrink-0" />
                  <span className="text-sm sm:text-base text-green-600 font-medium truncate">
                    Connected
                    <span className="hidden md:inline"> {
                      connectionType === 'network' ? '(Network)' : 
                      connectionType === 'serial-backend' ? '(COM Port)' : 
                      '(Serial)'
                    }</span>
                  </span>
                </>
              ) : (
                <>
                  <WifiOff className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-sm sm:text-base text-red-600 font-medium">Disconnected</span>
                </>
              )}
            </div>
            
            {/* Desktop: Navigation & Connection Actions */}
            <div className="hidden sm:flex items-center gap-3 flex-wrap">
              {location.pathname === '/' && (
                <button
                  onClick={() => navigate('/form')}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  title="Business Form"
                >
                  <FileText className="w-4 h-4" />
                  <span>Business Form</span>
                </button>
              )}
              
              <button
                onClick={() => setShowApiSettings(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="API Server Settings"
              >
                <Globe className="w-5 h-5" />
              </button>
              
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              {(connection.connected || networkConnection.connected) ? (
                <button
                  onClick={disconnectPrinter}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => setShowConnectionModal(true)}
                  disabled={isConnecting}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Printer'}
                </button>
              )}
            </div>
            
            {/* Mobile: Connection Button (Full Width) */}
            <div className="flex sm:hidden w-full">
              {(connection.connected || networkConnection.connected) ? (
                <button
                  onClick={disconnectPrinter}
                  className="w-full px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => setShowConnectionModal(true)}
                  disabled={isConnecting}
                  className="w-full px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors font-medium"
                >
                  {isConnecting ? 'Connecting...' : 'Connect Printer'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Routes */}
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route 
          path="/form" 
          element={
            <FormPage
              onPrint={printText}
              isConnected={connection.connected || networkConnection.connected}
            />
          } 
        />
      </Routes>

      {/* Settings Modal */}
      <SettingsPage
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        printerSettings={thermalPrinterSettings}
        animalButtons={animalButtons}
        onSaveSettings={handleSaveSettings}
      />

      {/* Connection Modal - Responsive & Scrollable */}
      {showConnectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 lg:p-8 max-w-2xl w-full my-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">Connect Printer</h2>
            
            {/* Connection Type Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Connection Type
              </label>
              <div className="space-y-3">
                <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="connectionType"
                    value="serial"
                    checked={connectionType === 'serial'}
                    onChange={(e) => setConnectionType(e.target.value as ConnectionType)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">USB/Serial Port (Browser)</div>
                    <div className="text-sm text-gray-500">Direct browser connection via Web Serial API</div>
                  </div>
                </label>
                
                <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="connectionType"
                    value="serial-backend"
                    checked={connectionType === 'serial-backend'}
                    onChange={(e) => setConnectionType(e.target.value as ConnectionType)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">COM Port (Backend)</div>
                    <div className="text-sm text-gray-500">Server-managed COM/Serial port connection</div>
                  </div>
                </label>
                
                <label className="flex items-center p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                  <input
                    type="radio"
                    name="connectionType"
                    value="network"
                    checked={connectionType === 'network'}
                    onChange={(e) => setConnectionType(e.target.value as ConnectionType)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <div className="ml-3">
                    <div className="font-medium text-gray-900">Network Printer</div>
                    <div className="text-sm text-gray-500">Connect via IP address</div>
                  </div>
                </label>
              </div>
            </div>

            {/* Serial/COM Port Settings (Backend) */}
            {connectionType === 'serial-backend' && (
              <div className="mb-6 space-y-4">
                {/* Auto-discover Button */}
                <div>
                  <button
                    onClick={discoverSerialPorts}
                    disabled={isDiscovering}
                    className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-teal-600 text-white rounded-lg hover:from-green-600 hover:to-teal-700 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
                  >
                    <Printer className="w-5 h-5" />
                    <span>{isDiscovering ? 'Scanning COM ports...' : 'List COM Ports'}</span>
                  </button>
                </div>

                {/* Discovered Serial Ports List */}
                {discoveredSerialPorts.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="text-sm font-semibold text-green-800 mb-3">Found {discoveredSerialPorts.length} COM port(s):</h4>
                    <div className="space-y-2">
                      {discoveredSerialPorts.map((port, index) => (
                        <button
                          key={index}
                          onClick={() => setSelectedSerialPort(port.path)}
                          className={`w-full p-3 bg-white rounded-lg border-2 transition-colors text-left ${
                            selectedSerialPort === port.path ? 'border-green-500' : 'border-transparent hover:border-green-300'
                          }`}
                        >
                          <div className="font-medium text-gray-900">
                            {port.name}
                          </div>
                          <div className="text-sm text-gray-600">
                            {port.path} - {port.manufacturer}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {selectedSerialPort && (
                  <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                    <p className="text-sm text-blue-700">
                      <strong>Selected:</strong> {selectedSerialPort}
                      <br />
                      <strong>Baud Rate:</strong> {thermalPrinterSettings.baudRate}
                    </p>
                  </div>
                )}

                <div className="text-sm text-gray-600">
                  <strong>Note:</strong> COM port connections are managed by the backend server. Make sure your thermal printer is connected via USB cable and the backend API server is running.
                </div>
              </div>
            )}

            {/* Network Printer Settings */}
            {connectionType === 'network' && (
              <div className="mb-6 space-y-4">
                {/* Auto-discover Button */}
                <div>
                  <button
                    onClick={discoverNetworkPrinters}
                    disabled={isDiscovering}
                    className="w-full px-4 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:from-purple-600 hover:to-indigo-700 disabled:opacity-50 transition-all flex items-center justify-center space-x-2"
                  >
                    <Wifi className="w-5 h-5" />
                    <span>{isDiscovering ? 'Scanning network...' : 'Auto-discover Printers'}</span>
                  </button>
                </div>

                {/* Discovered Printers List */}
                {discoveredPrinters.length > 0 && (
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <h4 className="text-sm font-semibold text-green-800 mb-3">Found {discoveredPrinters.length} printer(s):</h4>
                    <div className="space-y-2">
                      {discoveredPrinters.map((printer, index) => (
                        <button
                          key={index}
                          onClick={() => setNetworkSettings({ ipAddress: printer.ipAddress, port: printer.port })}
                          className="w-full p-3 bg-white rounded-lg border-2 border-transparent hover:border-green-500 transition-colors text-left"
                        >
                          <div className="font-medium text-gray-900">
                            {printer.name || `Printer ${index + 1}`}
                          </div>
                          <div className="text-sm text-gray-600">
                            {printer.ipAddress}:{printer.port}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-center text-sm text-gray-500">or enter manually:</div>

                {/* Manual Entry */}
                <div className="p-4 bg-gray-50 rounded-lg space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IP Address
                    </label>
                    <input
                      type="text"
                      value={networkSettings.ipAddress}
                      onChange={(e) => setNetworkSettings({ ...networkSettings, ipAddress: e.target.value })}
                      placeholder="192.168.1.100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Port
                    </label>
                    <input
                      type="number"
                      value={networkSettings.port}
                      onChange={(e) => setNetworkSettings({ ...networkSettings, port: parseInt(e.target.value) || 9100 })}
                      placeholder="9100"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>Note:</strong> Most network thermal printers use port 9100 (raw printing). Network printing requires a backend API server to be running.
                  </div>
                </div>
              </div>
            )}

            {/* Info Box */}
            {connectionType === 'serial' && (
              <div className="mb-6 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                <p className="text-sm text-blue-700">
                  You'll be prompted to select your printer from the available serial devices.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex space-x-3">
              <button
                onClick={() => setShowConnectionModal(false)}
                className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={connectToPrinter}
                disabled={isConnecting}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
              >
                {isConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Settings Modal - Responsive & Scrollable */}
      {showApiSettings && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl p-4 sm:p-6 lg:p-8 max-w-2xl w-full my-8">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-4 sm:mb-6">API Server Settings</h2>
            
            {/* Current API URL Display */}
            <div className="mb-4 sm:mb-6 p-3 sm:p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center mb-2">
                <Globe className="w-5 h-5 text-blue-600 mr-2 flex-shrink-0" />
                <span className="text-xs sm:text-sm font-semibold text-blue-800">Current API Server:</span>
              </div>
              <p className="text-xs sm:text-sm text-blue-900 font-mono break-all">{apiUrl}</p>
              {hasCustomApiUrl() && (
                <p className="text-xs text-blue-600 mt-2">✓ Using custom URL (saved in localStorage)</p>
              )}
              {!hasCustomApiUrl() && (
                <p className="text-xs text-blue-600 mt-2">ℹ Using automatic detection (current host + port 3001)</p>
              )}
            </div>

            {/* Custom URL Input */}
            <div className="mb-4 sm:mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom API Server URL
              </label>
              <input
                type="text"
                value={customApiUrl}
                onChange={(e) => setCustomApiUrl(e.target.value)}
                placeholder={getDefaultApiUrl()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-xs sm:text-sm"
              />
              <p className="text-xs text-gray-500 mt-2">
                <strong>Default:</strong> {getDefaultApiUrl()} (auto-detected)
              </p>
              <p className="text-xs text-gray-500 mt-1">
                <strong>Example:</strong> http://192.168.1.100:3001 or https://abc.ngrok.io
              </p>
            </div>

            {/* Info Box */}
            <div className="mb-4 sm:mb-6 p-3 bg-gray-50 rounded border-l-4 border-gray-400">
              <p className="text-xs sm:text-sm text-gray-700">
                <strong>💡 Smart Default:</strong> The API automatically uses your current host ({window.location.hostname}) with port 3001. 
                Only change this if your backend is on a different server or uses ngrok.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setShowApiSettings(false)}
                className="w-full sm:flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
              
              {hasCustomApiUrl() && (
                <button
                  onClick={handleResetApiUrl}
                  className="w-full sm:flex-1 px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors"
                >
                  Reset to Default
                </button>
              )}
              
              <button
                onClick={handleSaveApiUrl}
                disabled={!customApiUrl || !customApiUrl.trim()}
                className="w-full sm:flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
              >
                Save & Reload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;