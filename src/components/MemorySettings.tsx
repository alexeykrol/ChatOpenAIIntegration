import React, { useState, useEffect } from 'react';
import { useStore } from '../store/useStore';
import { X, Brain, Zap, Settings2, CheckCircle, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

export const MemorySettings: React.FC = () => {
  const { activePersonality, showMemorySettings, toggleMemorySettings, updatePersonality } = useStore();
  const [formData, setFormData] = useState({
    summarization_enabled: false,
    summarization_model: 'gpt-3.5-turbo',
    summarization_prompt: ''
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const defaultPrompt = `You are a helpful assistant that creates concise summaries of conversations. 

Focus on:
- Key facts and decisions made
- Important context and background information
- Action items and todos mentioned
- Goals and constraints discussed
- Technical details and specifications

Keep summaries accurate and concise while preserving essential information.`;

  useEffect(() => {
    if (activePersonality) {
      setFormData({
        summarization_enabled: activePersonality.summarization_enabled || false,
        summarization_model: activePersonality.summarization_model || 'gpt-3.5-turbo',
        summarization_prompt: activePersonality.summarization_prompt || defaultPrompt
      });
    }
  }, [activePersonality]);

  const handleSave = async () => {
    if (!activePersonality) return;
    
    setSaving(true);
    setSaved(false);
    
    try {
      console.log('Updating personality memory settings:', {
        personality_id: activePersonality.id,
        summarization_enabled: formData.summarization_enabled,
        summarization_model: formData.summarization_model,
        summarization_prompt: formData.summarization_prompt.substring(0, 100) + '...'
      });

      // Update personality in database
      await updatePersonality(activePersonality.id, {
        summarization_enabled: formData.summarization_enabled,
        summarization_model: formData.summarization_model,
        summarization_prompt: formData.summarization_prompt
      });
      
      console.log('Personality memory settings saved successfully');
      
      setSaved(true);
      setTimeout(() => {
        setSaved(false);
        toggleMemorySettings(); // Auto-close after successful save
      }, 1500);
    } catch (error) {
      console.error('Failed to save personality memory settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const models = [
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo', description: 'Fast and cost-effective' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', description: 'Balanced performance' },
    { value: 'gpt-4o', label: 'GPT-4o', description: 'Highest quality' }
  ];

  if (!showMemorySettings) return null;

  // If no active personality, show message
  if (!activePersonality) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Memory Settings</h2>
            <button
              onClick={toggleMemorySettings}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
          <div className="text-center py-8">
            <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              No active personality selected. Please select a personality from the Personalities menu to configure memory settings.
            </p>
            <button
              onClick={toggleMemorySettings}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <Brain className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Memory Settings</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Configure memory for <span className="font-medium text-blue-600 dark:text-blue-400">{activePersonality.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={toggleMemorySettings}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Personality Memory Status */}
          <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${activePersonality.has_memory ? 'bg-green-500' : 'bg-gray-400'}`}></div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Memory Status: {activePersonality.has_memory ? 'Enabled' : 'Disabled'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {activePersonality.has_memory 
                    ? 'This personality can remember conversations'
                    : 'Memory is disabled for this personality'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Show summarization settings only if memory is enabled */}
          {activePersonality.has_memory ? (
            <>
              {/* Enable Summarization */}
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-700">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-gray-900 dark:text-white">Smart Summarization</h3>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                      Replace full chat history with intelligent summaries to improve AI memory and reduce token usage. 
                      Summaries maintain context while keeping conversations focused.
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Reduces token costs</span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Improves AI memory</span>
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Maintains context</span>
                    </div>
                  </div>
                  <div 
                    className={`relative w-12 h-6 rounded-full cursor-pointer transition-colors ml-4 ${
                      formData.summarization_enabled 
                        ? 'bg-blue-600' 
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                    onClick={() => setFormData(prev => ({ 
                      ...prev, 
                      summarization_enabled: !prev.summarization_enabled 
                    }))}
                  >
                    <div 
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                        formData.summarization_enabled ? 'translate-x-6' : 'translate-x-0.5'
                      }`} 
                    />
                  </div>
                </div>
              </div>

              {/* Configuration - only show if enabled */}
              {formData.summarization_enabled && (
                <div className="space-y-6">
                  {/* Model Selection */}
                  <div>
                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      <Settings2 className="w-4 h-4" />
                      Summarization Model
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {models.map((model) => (
                        <button
                          key={model.value}
                          onClick={() => setFormData(prev => ({ ...prev, summarization_model: model.value }))}
                          className={`p-4 border-2 rounded-lg text-left transition-colors ${
                            formData.summarization_model === model.value
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <div className="font-medium text-gray-900 dark:text-white">{model.label}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">{model.description}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Summarization Prompt */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Summarization Instructions
                    </label>
                    <textarea
                      value={formData.summarization_prompt}
                      onChange={(e) => setFormData(prev => ({ ...prev, summarization_prompt: e.target.value }))}
                      rows={8}
                      placeholder="Enter custom instructions for how the AI should summarize conversations..."
                      className="w-full p-4 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm leading-relaxed"
                    />
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        These instructions guide how the AI creates conversation summaries for this personality
                      </p>
                      <button
                        onClick={() => setFormData(prev => ({ ...prev, summarization_prompt: defaultPrompt }))}
                        className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                      >
                        Reset to default
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            /* Show message if memory is disabled */
            <div className="text-center py-8">
              <Brain className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Memory is disabled for this personality. Enable memory in the Personalities menu to access summarization settings.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            {saved && (
              <>
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">Settings saved successfully</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={toggleMemorySettings}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !activePersonality?.has_memory}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed flex items-center gap-2"
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Saving...
                </>
              ) : (
                'Save Settings'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};