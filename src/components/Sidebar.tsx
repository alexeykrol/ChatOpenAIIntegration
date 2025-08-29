import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { 
  Plus, 
  MessageSquare, 
  Settings, 
  User,
  LogOut, 
  Edit2, 
  Trash2, 
  Check, 
  X,
  Menu,
  Download
} from 'lucide-react';
import { supabase } from '../lib/supabase';

export const Sidebar: React.FC = () => {
  const {
    chats,
    messages,
    currentChatId,
    sidebarOpen,
    togglePersonalities,
    createChat,
    selectChat,
    deleteChat,
    updateChatTitle,
    toggleSidebar,
    toggleSettings
  } = useStore();

  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const handleCreateChat = async () => {
    try {
      const chatId = await createChat();
      selectChat(chatId);
    } catch (error) {
      console.error('Error creating chat:', error);
    }
  };

  const handleEditStart = (chatId: string, currentTitle: string) => {
    setEditingChatId(chatId);
    setEditTitle(currentTitle);
  };

  const handleEditSave = async () => {
    if (editingChatId && editTitle.trim()) {
      await updateChatTitle(editingChatId, editTitle.trim());
    }
    setEditingChatId(null);
    setEditTitle('');
  };

  const handleEditCancel = () => {
    setEditingChatId(null);
    setEditTitle('');
  };

  const handleDeleteChat = async (chatId: string) => {
    if (confirm('Are you sure you want to delete this chat?')) {
      await deleteChat(chatId);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleExportChat = async (chatId: string, chatTitle: string) => {
    try {
      // Get all messages for this chat
      const { data: chatMessages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Generate markdown content
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${chatTitle.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '-')}-${timestamp}.md`;
      
      let markdownContent = `# ${chatTitle}\n\n`;
      markdownContent += `*Exported on ${new Date().toLocaleString()}*\n\n`;
      markdownContent += `---\n\n`;

      chatMessages?.forEach((message) => {
        const role = message.role === 'user' ? '👤 **User**' : '🤖 **Assistant**';
        markdownContent += `## ${role}\n\n`;
        markdownContent += `${message.content}\n\n`;
        markdownContent += `*${new Date(message.created_at).toLocaleString()}*\n\n`;
        markdownContent += `---\n\n`;
      });

      // Create and download file
      const blob = new Blob([markdownContent], { type: 'text/markdown' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error exporting chat:', error);
      alert('Failed to export chat. Please try again.');
    }
  };
  if (!sidebarOpen) {
    return (
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
      >
        <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </button>
    );
  }

  return (
    <div className="w-80 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">ChatGPT Clone</h1>
          <button
            onClick={toggleSidebar}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
          >
            <Menu className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>
        
        <button
          onClick={handleCreateChat}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2">
        {chats.map((chat) => (
          <div
            key={chat.id}
            className={`group relative flex items-center gap-2 p-3 rounded-lg cursor-pointer transition-colors mb-1 ${
              currentChatId === chat.id
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100'
                : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
            }`}
            onClick={() => selectChat(chat.id)}
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            
            {editingChatId === chat.id ? (
              <div className="flex-1 flex items-center gap-1">
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="flex-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleEditSave();
                    if (e.key === 'Escape') handleEditCancel();
                  }}
                  autoFocus
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditSave();
                  }}
                  className="p-1 hover:bg-green-100 dark:hover:bg-green-900/30 rounded"
                >
                  <Check className="w-3 h-3 text-green-600" />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditCancel();
                  }}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                >
                  <X className="w-3 h-3 text-red-600" />
                </button>
              </div>
            ) : (
              <>
                <span className="flex-1 truncate text-sm">{chat.title}</span>
                <div className="hidden group-hover:flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleExportChat(chat.id, chat.title);
                    }}
                    className="p-1 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded"
                    title="Export chat"
                  >
                    <Download className="w-3 h-3 text-blue-600" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditStart(chat.id, chat.title);
                    }}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteChat(chat.id);
                    }}
                    className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                  >
                    <Trash2 className="w-3 h-3 text-red-600" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-2">
        <button
          onClick={toggleSettings}
          className="w-full flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-3 py-2 rounded-lg transition-colors"
        >
          <Settings className="w-4 h-4" />
          Settings
        </button>
        
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </div>
  );
};