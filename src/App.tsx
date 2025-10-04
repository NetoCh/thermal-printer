import React, { useState, useCallback } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Printer, Wifi, WifiOff, AlertCircle, Settings, FileText, ArrowLeft } from 'lucide-react';
import SettingsPage from './components/SettingsPage';
import FormPage from './components/FormPage';
import hpcLogo from './assets/hpc-logo.svg';

interface SerialPortConnection {
  port: SerialPort | null;
  writer: WritableStreamDefaultWriter | null;
  connected: boolean;
}

interface ThermalPrinterSettings {
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: 'none' | 'even' | 'odd';
  customText: string;
}

interface AnimalButton {
  name: string;
  color: string;
  emoji: string;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  
  const [connection, setConnection] = useState<SerialPortConnection>({
    port: null,
    writer: null,
    connected: false
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastPrinted, setLastPrinted] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  
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

  const connectToPrinter = useCallback(async () => {
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
  }, []);

  const disconnectPrinter = useCallback(async () => {
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
    setError(null);
  }, [connection]);

  const printText = useCallback(async (text: string) => {
    if (!connection.connected || !connection.writer) {
      setError('Printer not connected');
      return;
    }

    try {
      const encoder = new TextEncoder();
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
      const timestamp = new Date().toLocaleString();
      await writer.write(encoder.encode(`Printed: ${timestamp}`));
      await writer.write(ESC_POS.FEED);
      await writer.write(ESC_POS.FEED);
      await writer.write(ESC_POS.FEED);
      
      // Cut paper
      await writer.write(ESC_POS.CUT);

      setLastPrinted(text);
      setError(null);
    } catch (err) {
      setError(`Print failed: ${(err as Error).message}`);
    }
  }, [connection]);

  const MainPage = () => (
    <div className="max-w-4xl mx-auto p-6">
      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-400 rounded-r-lg">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-400 mr-3" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Last Printed Info */}
      {lastPrinted && (
        <div className="mb-6 p-4 bg-green-50 border-l-4 border-green-400 rounded-r-lg">
          <p className="text-green-700">
            ✅ Successfully printed: <strong>{lastPrinted}</strong>
          </p>
        </div>
      )}

      {/* Main Content */}
      <div className="bg-white rounded-xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">Select an option</h2>
          <p className="text-gray-600">Click any button to print the menu item on your LR2000 thermal printer</p>
        </div>

        {/* Animal Buttons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
          {animalButtons.map((animal) => (
            <button
              key={animal.name}
              onClick={() => printText(animal.name)}
              disabled={!connection.connected}
              className={`
                ${animal.color} 
                text-white font-bold text-xl py-8 px-6 rounded-xl
                transform transition-all duration-200 
                hover:scale-105 hover:shadow-lg
                disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                active:scale-95
                flex flex-col items-center space-y-2
              `}
            >
              <span className="text-4xl mb-2">{animal.emoji}</span>
              <span>{animal.name}</span>
            </button>
          ))}
        </div>

        {/* Instructions */}
        <div className="mt-12 p-6 bg-gray-50 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">Instructions:</h3>
          <ol className="list-decimal list-inside space-y-2 text-gray-600">
            <li>Connect your LR2000 thermal printer via USB or Serial port</li>
            <li>Click "Connect Printer" and select your printer from the list</li>
            <li>Once connected, click any button to print</li>
            <li>The printer will print the name with timestamp and cut the paper</li>
          </ol>
          
          <div className="mt-4 p-3 bg-blue-50 rounded border-l-4 border-blue-400">
            <p className="text-sm text-blue-700">
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
      {/* Header */}
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {location.pathname !== '/' && (
                <button
                  onClick={() => navigate('/')}
                  className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors mr-2"
                  title="Back to Main"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <Printer className="w-8 h-8 text-gray-700" />
              <div className="flex items-center space-x-3">
                <img src={hpcLogo} alt="HPC Logo" className="w-8 h-8" />
                <h1 className="text-2xl font-bold text-gray-800">Hard Plot Center</h1>
              </div>
            </div>
            
            {/* Navigation & Connection Status */}
            <div className="flex items-center space-x-4">
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
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                title="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
              
              <div className="flex items-center space-x-2">
                {connection.connected ? (
                  <>
                    <Wifi className="w-5 h-5 text-green-500" />
                    <span className="text-green-600 font-medium">Connected</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-5 h-5 text-red-500" />
                    <span className="text-red-600 font-medium">Disconnected</span>
                  </>
                )}
              </div>
              
              {connection.connected ? (
                <button
                  onClick={disconnectPrinter}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={connectToPrinter}
                  disabled={isConnecting}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-blue-300 transition-colors"
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
              isConnected={connection.connected}
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
    </div>
  );
}

export default App;