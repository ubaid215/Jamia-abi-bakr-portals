/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Code, Check, AlertCircle, Copy, RotateCcw, Eye, EyeOff, Download, Upload } from 'lucide-react';

const JsonInputField = ({
  value = [],
  onChange,
  label = "JSON Data",
  required = false,
  disabled = false,
  className = "",
  placeholder = "Enter JSON data or use the form below...",
  schema = null,
  // eslint-disable-next-line no-unused-vars
  mode = "editor", // 'editor' or 'form'
  showPreview = true
}) => {
  const [jsonInput, setJsonInput] = useState('');
  const [isValid, setIsValid] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isPreview, setIsPreview] = useState(false);
  const [formattedJson, setFormattedJson] = useState('');

  // Initialize with current value
  useEffect(() => {
    try {
      if (value && (typeof value === 'object' || Array.isArray(value))) {
        const jsonStr = JSON.stringify(value, null, 2);
        setJsonInput(jsonStr);
        setFormattedJson(jsonStr);
        setIsValid(true);
      }
    } catch (err) {
      setJsonInput('');
      setErrorMessage('Invalid JSON data');
      setIsValid(false);
    }
  }, [value]);

  const validateJson = (jsonString) => {
    try {
      if (!jsonString.trim()) {
        setIsValid(true);
        setErrorMessage('');
        return null;
      }

      const parsed = JSON.parse(jsonString);
      
      // Validate against schema if provided
      if (schema) {
        const validationErrors = validateAgainstSchema(parsed, schema);
        if (validationErrors.length > 0) {
          setIsValid(false);
          setErrorMessage(`Schema validation failed: ${validationErrors.join(', ')}`);
          return null;
        }
      }

      setIsValid(true);
      setErrorMessage('');
      return parsed;
    } catch (err) {
      setIsValid(false);
      setErrorMessage(err.message);
      return null;
    }
  };

  const validateAgainstSchema = (data, schema) => {
    const errors = [];
    
    if (schema.required && Array.isArray(schema.required)) {
      schema.required.forEach(field => {
        if (data[field] === undefined) {
          errors.push(`${field} is required`);
        }
      });
    }

    if (schema.type === 'array' && !Array.isArray(data)) {
      errors.push('Data must be an array');
    }

    if (schema.items && Array.isArray(data)) {
      data.forEach((item, index) => {
        if (typeof item !== schema.items.type) {
          errors.push(`Item ${index} must be of type ${schema.items.type}`);
        }
      });
    }

    return errors;
  };

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setJsonInput(newValue);
    const parsed = validateJson(newValue);
    if (parsed !== null) {
      onChange(parsed);
      setFormattedJson(newValue);
    }
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(jsonInput);
      const formatted = JSON.stringify(parsed, null, 2);
      setJsonInput(formatted);
      setFormattedJson(formatted);
      setIsValid(true);
    } catch (err) {
      setIsValid(false);
      setErrorMessage(err.message);
    }
  };

  const handleReset = () => {
    setJsonInput('');
    onChange([]);
    setIsValid(true);
    setErrorMessage('');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonInput);
    // You could show a toast notification here
  };

  const handleDownload = () => {
    const blob = new Blob([jsonInput], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'data.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = event.target.result;
          const parsed = JSON.parse(content);
          const formatted = JSON.stringify(parsed, null, 2);
          setJsonInput(formatted);
          validateJson(formatted);
          onChange(parsed);
        } catch (err) {
          setIsValid(false);
          setErrorMessage('Invalid JSON file');
        }
      };
      reader.readAsText(file);
    }
  };

  const renderPreview = () => {
    if (!formattedJson || !showPreview) return null;

    try {
      const data = JSON.parse(formattedJson);
      
      if (Array.isArray(data) && data.length > 0) {
        return (
          <div className="mt-4 border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Eye className="w-4 h-4 mr-2 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">
                    Preview ({data.length} item{data.length !== 1 ? 's' : ''})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setIsPreview(!isPreview)}
                  className="text-sm text-gray-600 hover:text-gray-900"
                >
                  {isPreview ? 'Hide' : 'Show'} Details
                </button>
              </div>
            </div>
            
            {isPreview && (
              <div className="max-h-48 overflow-y-auto p-4 bg-white">
                {data.slice(0, 5).map((item, index) => (
                  <div key={index} className="mb-3 last:mb-0">
                    <div className="text-xs font-medium text-gray-500 mb-1">
                      Item {index + 1}
                    </div>
                    <pre className="text-sm bg-gray-50 p-2 rounded overflow-x-auto">
                      {JSON.stringify(item, null, 2)}
                    </pre>
                  </div>
                ))}
                {data.length > 5 && (
                  <div className="text-center text-sm text-gray-500 py-2">
                    ... and {data.length - 5} more items
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      return (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <pre className="text-sm overflow-x-auto">
            {formattedJson}
          </pre>
        </div>
      );
    } catch (err) {
      return null;
    }
  };

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        
        <div className="flex items-center space-x-2">
          <span className={`text-xs px-2 py-1 rounded ${isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isValid ? 'Valid JSON' : 'Invalid JSON'}
          </span>
        </div>
      </div>

      {/* JSON Editor */}
      <div className="relative">
        <div className="flex items-center space-x-2 mb-2">
          <Code className="w-4 h-4 text-yellow-600" />
          <span className="text-sm text-gray-600">JSON Editor</span>
        </div>

        <textarea
          value={jsonInput}
          onChange={handleInputChange}
          disabled={disabled}
          placeholder={placeholder}
          className={`
            w-full h-48 px-4 py-3 border rounded-lg shadow-sm
            focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500
            ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'bg-white'}
            ${isValid ? 'border-gray-300' : 'border-red-300'}
            font-mono text-sm
          `}
          spellCheck="false"
        />

        {!isValid && (
          <div className="mt-2 flex items-start text-red-600">
            <AlertCircle className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{errorMessage}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-3">
          <button
            type="button"
            onClick={handleFormat}
            disabled={disabled}
            className="flex items-center px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            <Check className="w-3 h-3 mr-1" />
            Format JSON
          </button>

          <button
            type="button"
            onClick={handleCopy}
            disabled={disabled || !jsonInput}
            className="flex items-center px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
          >
            <Copy className="w-3 h-3 mr-1" />
            Copy
          </button>

          <button
            type="button"
            onClick={handleReset}
            disabled={disabled}
            className="flex items-center px-3 py-1.5 text-sm bg-red-50 text-red-600 rounded hover:bg-red-100 disabled:opacity-50"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Clear
          </button>

          <label className="flex items-center px-3 py-1.5 text-sm bg-yellow-50 text-yellow-700 rounded hover:bg-yellow-100 cursor-pointer disabled:opacity-50">
            <Upload className="w-3 h-3 mr-1" />
            Upload JSON
            <input
              type="file"
              accept=".json"
              onChange={handleFileUpload}
              disabled={disabled}
              className="hidden"
            />
          </label>

          <button
            type="button"
            onClick={handleDownload}
            disabled={disabled || !jsonInput}
            className="flex items-center px-3 py-1.5 text-sm bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50 ml-auto"
          >
            <Download className="w-3 h-3 mr-1" />
            Download
          </button>
        </div>
      </div>

      {/* Preview */}
      {renderPreview()}

      {/* Schema Info */}
      {schema && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-100 rounded-lg">
          <div className="flex items-start">
            <AlertCircle className="w-4 h-4 text-blue-600 mr-2 mt-0.5 flex-shrink-0" />
            <div>
              <div className="text-sm font-medium text-blue-800">Schema Information</div>
              <div className="text-xs text-blue-600 mt-1">
                {schema.description || 'No description provided'}
              </div>
              {schema.required && (
                <div className="text-xs text-blue-600 mt-1">
                  Required fields: {schema.required.join(', ')}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JsonInputField;