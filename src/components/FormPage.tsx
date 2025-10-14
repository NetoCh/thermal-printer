import React, { useState } from 'react';
import { FileText, Plus, Trash2, Save, RotateCcw, Printer } from 'lucide-react';

interface FormField {
  id: string;
  label: string;
  value: string;
  type: 'text' | 'tel' | 'email' | 'textarea';
  required: boolean;
}

interface FormPageProps {
  onPrint: (content: string) => void;
  isConnected: boolean;
}

const FormPage: React.FC<FormPageProps> = ({
  onPrint,
  isConnected
}) => {
  const [formFields, setFormFields] = useState<FormField[]>([
    { id: 'business', label: 'Business', value: '', type: 'text', required: true },
    { id: 'contact', label: 'Contact', value: '', type: 'text', required: true },
    { id: 'phone', label: 'Celphone', value: '', type: 'tel', required: false },
    { id: 'address', label: 'Direction', value: '', type: 'textarea', required: false }
  ]);

  const [errors, setErrors] = useState<string[]>([]);

  const validateForm = (): boolean => {
    const newErrors: string[] = [];

    formFields.forEach((field) => {
      if (field.required && !field.value.trim()) {
        newErrors.push(`${field.label} is required`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handlePrint = () => {
    if (!validateForm()) return;

    // Generate print content
    const printContent = formFields
      .filter(field => field.value.trim())
      .map(field => `${field.label}: ${field.value}`)
      .join('\n');

    onPrint(printContent);
    
    // Clear form after successful print
    setFormFields(formFields.map(field => ({ ...field, value: '' })));
    setErrors([]);
  };

  const handleReset = () => {
    setFormFields(formFields.map(field => ({ ...field, value: '' })));
    setErrors([]);
  };

  const updateFieldValue = (id: string, value: string) => {
    setFormFields(formFields.map(field => 
      field.id === id ? { ...field, value } : field
    ));
  };

  const updateFieldLabel = (id: string, label: string) => {
    setFormFields(formFields.map(field => 
      field.id === id ? { ...field, label } : field
    ));
  };

  const updateFieldType = (id: string, type: FormField['type']) => {
    setFormFields(formFields.map(field => 
      field.id === id ? { ...field, type } : field
    ));
  };

  const updateFieldRequired = (id: string, required: boolean) => {
    setFormFields(formFields.map(field => 
      field.id === id ? { ...field, required } : field
    ));
  };

  const addField = () => {
    const newId = `field_${Date.now()}`;
    setFormFields([
      ...formFields,
      { id: newId, label: 'New Field', value: '', type: 'text', required: false }
    ]);
  };

  const removeField = (id: string) => {
    setFormFields(formFields.filter(field => field.id !== id));
  };

  const fieldTypeOptions = [
    { value: 'text', label: 'Text' },
    { value: 'tel', label: 'Phone' },
    { value: 'email', label: 'Email' },
    { value: 'textarea', label: 'Textarea' }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
      <div className="bg-white rounded-xl shadow-xl">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-gray-700" />
            <h2 className="text-lg sm:text-2xl font-bold text-gray-800">Business Information Form</h2>
          </div>
          <p className="text-sm sm:text-base text-gray-600 mt-2">Fill out the form and print business information on your thermal printer</p>
        </div>

        <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
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

          {/* Form Fields */}
          <div className="space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Form Fields</h3>
              <button
                onClick={addField}
                className="flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Add Field</span>
              </button>
            </div>

            <div className="space-y-4">
              {formFields.map((field, index) => (
                <div key={field.id} className="p-3 sm:p-4 border border-gray-200 rounded-lg bg-gray-50">
                  <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h4 className="text-sm sm:text-base font-medium text-gray-700">Field {index + 1}</h4>
                    <button
                      onClick={() => removeField(field.id)}
                      className="p-1.5 text-red-500 hover:bg-red-100 rounded transition-colors"
                      disabled={formFields.length <= 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Field Configuration */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Label
                      </label>
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) => updateFieldLabel(field.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Type
                      </label>
                      <select
                        value={field.type}
                        onChange={(e) => updateFieldType(field.id, e.target.value as FormField['type'])}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        {fieldTypeOptions.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center">
                      <label className="flex items-center space-x-2 mt-6">
                        <input
                          type="checkbox"
                          checked={field.required}
                          onChange={(e) => updateFieldRequired(field.id, e.target.checked)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Required</span>
                      </label>
                    </div>
                  </div>

                  {/* Field Input */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {field.label} {field.required && <span className="text-red-500">*</span>}
                    </label>
                    {field.type === 'textarea' ? (
                      <textarea
                        value={field.value}
                        onChange={(e) => updateFieldValue(field.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    ) : (
                      <input
                        type={field.type}
                        value={field.value}
                        onChange={(e) => updateFieldValue(field.id, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="text-lg sm:text-xl font-semibold text-gray-800">Print Preview</h3>
            <div className="p-3 sm:p-4 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 overflow-x-auto">
              <div className="font-mono text-xs sm:text-sm whitespace-pre-line min-h-[60px]">
                {formFields
                  .filter(field => field.value.trim())
                  .map(field => `${field.label}: ${field.value}`)
                  .join('\n') || 'Fill out the form to see preview...'}
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Responsive */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-4 sm:p-6 border-t bg-gray-50">
          <button
            onClick={handleReset}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 text-gray-600 hover:bg-gray-200 rounded-lg transition-colors order-2 sm:order-1"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset</span>
          </button>

          <button
            onClick={handlePrint}
            disabled={!isConnected}
            className="flex items-center justify-center space-x-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors order-1 sm:order-2"
          >
            <Printer className="w-4 h-4" />
            <span className="font-medium">Print</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default FormPage;