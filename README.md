# Hard Plot Cafe Thermal Printer App

A desktop application for printing animal names on thermal printers using Web Serial API.

## Features

- 🖨️ **Thermal Printer Support**: Compatible with ESC/POS thermal printers
- 🐾 **Animal Buttons**: Customizable animal buttons with emojis and colors
- ⚙️ **Settings**: Configurable printer settings and custom text
- 🖼️ **Logo Printing**: Prints HPC logo on receipts
- 💻 **Desktop App**: Runs as a standalone Electron application

## Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Setup

1. Install dependencies:
```bash
npm install
```

2. Run in development mode:
```bash
npm run electron:dev
```

This will start both the Vite dev server and Electron app.

### Building

#### Build for current platform:
```bash
npm run electron:pack
```

#### Build distributables:
```bash
npm run electron:dist
```

This creates installers in the `dist-electron` folder:
- **Windows**: `.exe` installer
- **macOS**: `.dmg` file  
- **Linux**: `.AppImage` file

### Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Build web app for production
- `npm run electron` - Run Electron app (requires built web app)
- `npm run electron:dev` - Run in development mode
- `npm run electron:pack` - Package app for current platform
- `npm run electron:dist` - Build distributables for all platforms

## Usage

1. Connect your thermal printer via USB/Serial
2. Launch the application
3. Click "Connect Printer" and select your device
4. Configure settings if needed (printer settings, custom text, animal buttons)
5. Click any animal button to print

## Printer Compatibility

This app is designed for ESC/POS compatible thermal printers, specifically tested with:
- LR2000 thermal printer
- 58mm thermal paper

## Web Serial API

The app uses the Web Serial API which requires:
- Chromium-based browsers (Chrome, Edge, etc.)
- HTTPS or localhost
- User permission to access serial ports

## License

MIT License