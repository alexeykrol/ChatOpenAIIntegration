import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { X, Plus, Edit2, Trash2, Check, User, MessageCircle, Save, Brain } from 'lucide-react';

export const Personalities: React.FC = () => {
  const {
    personalities,
    activePersonality,
    togglePersonalities,
    createPersonality,
    updatePersonality,
    deletePersonality,
    setActivePersonality
  } = useStore();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    prompt: '',
    has_memory: true
  });

  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.prompt.trim()) return;
    
    await createPersonality(formData.name.trim(), formData.prompt.trim(), formData.has_memory);
    setFormData({ name: '', prompt: '', has_memory: true });
    setShowCreateForm(false);
  };

  const handleEdit = (personality: any) => {
    setEditingId(personality.id);
    setFormData({
      name: personality.name,
      prompt: personality.prompt,
      has_memory: personality.has_memory
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId || !formData.name.trim() || !formData.prompt.trim()) return;
    
    await updatePersonality(editingId, {
      name: formData.name.trim(),
      prompt: formData.prompt.trim(),
      has_memory: formData.has_memory
    });
    
    setEditingId(null);
    setFormData({ name: '', prompt: '', has_memory: true });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', prompt: '', has_memory: true });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this personality?')) {
      await deletePersonality(id);
    }
  };

  const handleSetActive = async (id: string) => {
    if (activePersonality?.id === id) {
      // Deactivate current personality
      await updatePersonality(id, { is_active: false });
    } else {
      await setActivePersonality(id);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <User className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">AI Personalities</h2>
          </div>
          <button
            onClick={togglePersonalities}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Create New Button */}
          <div className="mb-6">
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create New Personality
            </button>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Create New Personality</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Name
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Helpful Assistant, Creative Writer, Code Expert"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Personality Prompt
                  </label>
                  <textarea
                    value={formData.prompt}
                    onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                    placeholder="Describe how the AI should behave, its tone, expertise, and approach..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.has_memory}
                      onChange={(e) => setFormData(prev => ({ ...prev, has_memory: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <Brain className="w-4 h-4" />
                    Enable Memory
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                    When enabled, the AI will remember previous messages in the conversation
                  </p>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.has_memory}
                      onChange={(e) => setFormData(prev => ({ ...prev, has_memory: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <Brain className="w-4 h-4" />
                    Enable Memory
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                    When enabled, the AI will remember previous messages in the conversation
                  </p>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    <input
                      type="checkbox"
                      checked={formData.has_memory}
                      onChange={(e) => setFormData(prev => ({ ...prev, has_memory: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <Brain className="w-4 h-4" />
                    Enable Memory
                  </label>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-6">
                    When enabled, the AI will remember previous messages in the conversation
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCreate}
                    disabled={!formData.name.trim() || !formData.prompt.trim()}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg transition-colors disabled:cursor-not-allowed"
                  >
                    <Save className="w-4 h-4" />
                    Create
                  </button>
                  <button
                    onClick={() => {
                      setShowCreateForm(false);
                      setFormData({ name: '', prompt: '', has_memory: true });
                    }}
                    className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Personalities List */}
          <div className="space-y-4">
            {personalities.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No personalities yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Create your first AI personality to customize how the assistant responds
                </p>
              </div>
            ) : (
              personalities.map((personality) => (
                <div
                  key={personality.id}
                  className={`border rounded-lg p-4 transition-colors ${
                    personality.is_active
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                >
                  {editingId === personality.id ? (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Name
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Personality Prompt
                        </label>
                        <textarea
                          value={formData.prompt}
                          onChange={(e) => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                          rows={4}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveEdit}
                          disabled={!formData.name.trim() || !formData.prompt.trim()}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-3 py-1.5 rounded-lg transition-colors disabled:cursor-not-allowed"
                        >
                          <Check className="w-4 h-4" />
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <X className="w-4 h-4" />
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                              {personality.name}
                            </h3>
                            {personality.is_active && (
                              <span className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs px-2 py-1 rounded-full">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                            {personality.prompt}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 ml-4">
                          <button
                            onClick={() => handleEdit(personality)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <Edit2 className="w-4 h-4 text-gray-500" />
                          </button>
                          <button
                            onClick={() => handleDelete(personality.id)}
                            className="p-2 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                            <input
                              type="checkbox"
                              checked={personality.has_memory}
                              onChange={(e) => updatePersonality(personality.id, { has_memory: e.target.checked })}
                              className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                            />
                            <Brain className="w-4 h-4" />
                            Enable Memory
                          </label>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Updated {new Date(personality.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          onClick={() => handleSetActive(personality.id)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                            personality.is_active
                              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50'
                          }`}
                        >
                          {personality.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};