import React, { useState } from 'react';
import { Settings, X, Plus, Trash2, Save, RotateCcw } from 'lucide-react';

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

interface SettingsPageProps {
  isOpen: boolean;
  onClose: () => void;
  printerSettings: ThermalPrinterSettings;
  animalButtons: AnimalButton[];
  onSaveSettings: (settings: ThermalPrinterSettings, buttons: AnimalButton[]) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  isOpen,
  onClose,
  printerSettings,
  animalButtons,
  onSaveSettings
}) => {
  const [localPrinterSettings, setLocalPrinterSettings] = useState<ThermalPrinterSettings>(printerSettings);
  const [localAnimalButtons, setLocalAnimalButtons] = useState<AnimalButton[]>(animalButtons);
  const [errors, setErrors] = useState<string[]>([]);

  if (!isOpen) return null;

  const validateSettings = (): boolean => {
    const newErrors: string[] = [];

    // Validate printer settings
    if (localPrinterSettings.baudRate <= 0) {
      newErrors.push('Baud rate must be greater than 0');
    }
    if (localPrinterSettings.dataBits < 5 || localPrinterSettings.dataBits > 8) {
      newErrors.push('Data bits must be between 5 and 8');
    }
    if (localPrinterSettings.stopBits < 1 || localPrinterSettings.stopBits > 2) {
      newErrors.push('Stop bits must be 1 or 2');
    }

    // Validate animal buttons
    if (localAnimalButtons.length === 0) {
      newErrors.push('At least one animal button is required');
    }

    localAnimalButtons.forEach((button, index) => {
      if (!button.name.trim()) {
        newErrors.push(`Animal button ${index + 1}: Name is required`);
      }
      if (!button.emoji.trim()) {
        newErrors.push(`Animal button ${index + 1}: Emoji is required`);
      }
      if (!button.color.trim()) {
        newErrors.push(`Animal button ${index + 1}: Color is required`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = () => {
    if (validateSettings()) {
      onSaveSettings(localPrinterSettings, localAnimalButtons);
      onClose();
    }
  };

  const handleReset = () => {
    setLocalPrinterSettings(printerSettings);
    setLocalAnimalButtons(animalButtons);
    setErrors([]);
  };

  const addAnimalButton = () => {
    setLocalAnimalButtons([
      ...localAnimalButtons,
      { name: '', color: 'bg-gray-500 hover:bg-gray-600', emoji: '🐾' }
    ]);
  };

  const removeAnimalButton = (index: number) => {
    setLocalAnimalButtons(localAnimalButtons.filter((_, i) => i !== index));
  };

  const updateAnimalButton = (index: number, field: keyof AnimalButton, value: string) => {
    const updated = [...localAnimalButtons];
    updated[index] = { ...updated[index], [field]: value };
    setLocalAnimalButtons(updated);
  };

  const colorOptions = [
    { value: 'bg-red-500 hover:bg-red-600', label: 'Red', preview: 'bg-red-500' },
    { value: 'bg-blue-500 hover:bg-blue-600', label: 'Blue', preview: 'bg-blue-500' },
    { value: 'bg-green-500 hover:bg-green-600', label: 'Green', preview: 'bg-green-500' },
    { value: 'bg-yellow-500 hover:bg-yellow-600', label: 'Yellow', preview: 'bg-yellow-500' },
    { value: 'bg-purple-500 hover:bg-purple-600', label: 'Purple', preview: 'bg-purple-500' },
    { value: 'bg-pink-500 hover:bg-pink-600', label: 'Pink', preview: 'bg-pink-500' },
    { value: 'bg-indigo-500 hover:bg-indigo-600', label: 'Indigo', preview: 'bg-indigo-500' },
    { value: 'bg-amber-500 hover:bg-amber-600', label: 'Amber', preview: 'bg-amber-500' },
    { value: 'bg-teal-500 hover:bg-teal-600', label: 'Teal', preview: 'bg-teal-500' },
    { value: 'bg-orange-500 hover:bg-orange-600', label: 'Orange', preview: 'bg-orange-500' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6 text-gray-700" />
            <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg">
              <h3 className="text-red-800 font-medium mb-2">Please fix the following errors:</h3>
              <ul className="list-disc list-inside space-y-1">
                {errors.map((error, index) => (
                  <li key={index} className="text-red-700 text-sm">{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Printer Settings */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-800 border-b pb-2">Thermal Printer Settings</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Baud Rate
                </label>
                <select
                  value={localPrinterSettings.baudRate}
                  onChange={(e) => setLocalPrinterSettings({
                    ...localPrinterSettings,
                    baudRate: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={9600}>9600</option>
                  <option value={19200}>19200</option>
                  <option value={38400}>38400</option>
                  <option value={57600}>57600</option>
                  <option value={115200}>115200</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Data Bits
                </label>
                <select
                  value={localPrinterSettings.dataBits}
                  onChange={(e) => setLocalPrinterSettings({
                    ...localPrinterSettings,
                    dataBits: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={7}>7</option>
                  <option value={8}>8</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stop Bits
                </label>
                <select
                  value={localPrinterSettings.stopBits}
                  onChange={(e) => setLocalPrinterSettings({
                    ...localPrinterSettings,
                    stopBits: parseInt(e.target.value)
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={1}>1</option>
                  <option value={2}>2</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parity
                </label>
                <select
                  value={localPrinterSettings.parity}
                  onChange={(e) => setLocalPrinterSettings({
                    ...localPrinterSettings,
                    parity: e.target.value as 'none' | 'even' | 'odd'
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="none">None</option>
                  <option value="even">Even</option>
                  <option value="odd">Odd</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom Text (printed after logo)
              </label>
              <input
                type="text"
                value={localPrinterSettings.customText}
                onChange={(e) => setLocalPrinterSettings({
                  ...localPrinterSettings,
                  customText: e.target.value
                })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Welcome to Hard Plot Cafe!"
              />
              <p className="text-sm text-gray-500 mt-1">
                This text will be printed centered between the logo and animal name
              </p>
            </div>
          </div>

          {/* Animal Buttons */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-semibold text-gray-800 border-b pb-2">Animal Buttons</h3>
              <button
                onClick={addAnimalButton}
                className="flex items-center space-x-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Button</span>
              </button>
            </div>

            <div className="space-y-4">
              {localAnimalButtons.map((button, index) => (
                <div key={index} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-700">Button {index + 1}</h4>
                    <button
                      onClick={() => removeAnimalButton(index)}
                      className="p-1 text-red-500 hover:bg-red-100 rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        value={button.name}
                        onChange={(e) => updateAnimalButton(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="e.g., DOG"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Emoji
                      </label>
                      <input
                        type="text"
                        value={button.emoji}
                        onChange={(e) => updateAnimalButton(index, 'emoji', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="🐕"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Color
                      </label>
                      <select
                        value={button.color}
                        onChange={(e) => updateAnimalButton(index, 'color', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {colorOptions.map((color) => (
                          <option key={color.value} value={color.value}>
                            {color.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Preview</label>
                    <div className={`${button.color} text-white font-bold text-lg py-4 px-6 rounded-xl inline-flex flex-col items-center space-y-1 min-w-[120px]`}>
                      <span className="text-2xl">{button.emoji || '🐾'}</span>
                      <span>{button.name || 'NAME'}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t bg-gray-50">
          <button
            onClick={handleReset}
            className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-6 py-2 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex items-center space-x-2 px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;