import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { X, Key, Palette, Sliders, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';
import { OpenAIService } from '../lib/openai';
import { encryption } from '../lib/encryption';

export const Settings: React.FC = () => {
  const { settings, updateSettings, toggleSettings } = useStore();
  const [formData, setFormData] = useState({
    openai_api_key: '',
    model: 'gpt-4o',
    temperature: 0.7,
    max_tokens: 2000,
    theme: 'light' as 'light' | 'dark'
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [validatingKey, setValidatingKey] = useState(false);
  const [keyValid, setKeyValid] = useState<boolean | null>(null);

  useEffect(() => {
    if (settings) {
      setFormData({
        openai_api_key: settings.openai_api_key || '',
        model: settings.model,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
        theme: settings.theme
      });
    }
  }, [settings]);

  const validateApiKey = async (apiKey: string) => {
    if (!apiKey.trim()) {
      setKeyValid(null);
      return;
    }

    setValidatingKey(true);
    try {
      const openaiService = new OpenAIService();
      const isValid = await openaiService.validateApiKey(apiKey);
      setKeyValid(isValid);
    } catch {
      setKeyValid(false);
    } finally {
      setValidatingKey(false);
    }
  };

  const handleApiKeyChange = (value: string) => {
    setFormData(prev => ({ ...prev, openai_api_key: value }));
    setKeyValid(null);
    
    // Debounce validation
    const timeoutId = setTimeout(() => {
      validateApiKey(value);
    }, 1000);

    return () => clearTimeout(timeoutId);
  };

  const handleSave = async () => {
    if (keyValid === false) return;
    
    // Test encryption before saving
    if (formData.openai_api_key) {
      const testResult = encryption.test(formData.openai_api_key);
      if (!testResult) {
        console.error('Encryption test failed');
        return;
      }
    }
    
    await updateSettings(formData);
    
    // Apply theme immediately
    if (formData.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    toggleSettings();
  };

  const models = [
    { value: 'gpt-4o', label: 'GPT-4o (Latest)' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-4-turbo', label: 'GPT-4 Turbo' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Settings</h2>
          <button
            onClick={toggleSettings}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* OpenAI API Key */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Key className="w-4 h-4" />
              OpenAI API Key
            </label>
            <div className="relative">
              <input
                type={showApiKey ? 'text' : 'password'}
                value={formData.openai_api_key}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="sk-..."
                className="w-full px-4 py-3 pr-20 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center gap-1">
                {validatingKey && (
                  <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                )}
                {keyValid === true && (
                  <Check className="w-4 h-4 text-green-500" />
                )}
                {keyValid === false && (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-600 rounded"
                >
                  {showApiKey ? (
                    <EyeOff className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Eye className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
            </div>
            {formData.openai_api_key && (
              <div className="mt-1 text-xs text-green-600 dark:text-green-400">
                🔒 API key will be encrypted before storage
              </div>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Get your API key from{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 hover:underline"
              >
                OpenAI Platform
              </a>
            </p>
          </div>

          {/* Model Selection */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Sliders className="w-4 h-4" />
              Model
            </label>
            <select
              value={formData.model}
              onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {models.map((model) => (
                <option key={model.value} value={model.value}>
                  {model.label}
                </option>
              ))}
            </select>
          </div>

          {/* Temperature */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <span>Temperature</span>
              <span className="text-blue-600 dark:text-blue-400">{formData.temperature}</span>
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={formData.temperature}
              onChange={(e) => setFormData(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Focused</span>
              <span>Balanced</span>
              <span>Creative</span>
            </div>
          </div>

          {/* Max Tokens */}
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <span>Max Tokens</span>
              <span className="text-blue-600 dark:text-blue-400">{formData.max_tokens}</span>
            </label>
            <input
              type="range"
              min="100"
              max="4000"
              step="100"
              value={formData.max_tokens}
              onChange={(e) => setFormData(prev => ({ ...prev, max_tokens: parseInt(e.target.value) }))}
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
            />
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Short</span>
              <span>Medium</span>
              <span>Long</span>
            </div>
          </div>

          {/* Theme */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              <Palette className="w-4 h-4" />
              Theme
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormData(prev => ({ ...prev, theme: 'light' }))}
                className={`p-4 border-2 rounded-lg transition-colors ${
                  formData.theme === 'light'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="w-full h-8 bg-white border border-gray-200 rounded mb-2"></div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Light</span>
              </button>
              <button
                onClick={() => setFormData(prev => ({ ...prev, theme: 'dark' }))}
                className={`p-4 border-2 rounded-lg transition-colors ${
                  formData.theme === 'dark'
                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="w-full h-8 bg-gray-800 border border-gray-600 rounded mb-2"></div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">Dark</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={toggleSettings}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={keyValid === false}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};