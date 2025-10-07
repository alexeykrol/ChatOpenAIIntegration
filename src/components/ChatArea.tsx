import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useStore } from '../store/useStore';
import { Send, Square, Bot, User, Zap, Brain, Copy, Check } from 'lucide-react';

export const ChatArea: React.FC = () => {
  const {
    messages,
    activePersonality,
    totalTokens,
    isGenerating,
    sendMessage,
    settings,
    currentChatId,
    togglePersonalities,
    updatePersonality
  } = useStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Auto-focus input after AI response is complete or when chat changes
    if (!isGenerating && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isGenerating, currentChatId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isGenerating || !settings?.openai_api_key) return;

    // Input validation and sanitization
    const message = input.trim();

    // Validate message length
    if (message.length > 10000) {
      console.error('Message too long. Maximum 10,000 characters allowed.');
      return;
    }

    // Basic XSS prevention - check for suspicious patterns
    const suspiciousPatterns = /<script[^>]*>.*?<\/script>/gi;
    if (suspiciousPatterns.test(message)) {
      console.error('Invalid input detected.');
      return;
    }

    setInput('');

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await sendMessage(message);
  };

  const handleCopyMessage = async (messageId: string, content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMessageId(messageId);
      setTimeout(() => setCopiedMessageId(null), 2000);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Auto-resize textarea
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px';
  };

  if (!settings?.openai_api_key) {
    return (
      <div className="flex-1 flex items-center justify-center bg-white dark:bg-gray-800">
        <div className="text-center max-w-md">
          <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            OpenAI API Key Required
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Please add your OpenAI API key in settings to start chatting.
          </p>
          <button
            onClick={() => useStore.getState().toggleSettings()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Open Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-white dark:bg-gray-800">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {activePersonality ? activePersonality.name : 'Default Assistant'}
            </h2>
            {activePersonality && (
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={activePersonality.has_memory}
                  onChange={(e) => updatePersonality(activePersonality.id, { has_memory: e.target.checked })}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <Brain className="w-4 h-4" />
                Memory
              </label>
            )}
          </div>
          <div className="flex items-center gap-4">
            {/* Model Info */}
            <div className="hidden md:flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center gap-1">
                <Bot className="w-4 h-4" />
                <span>{settings?.model || 'gpt-4o'}</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-4 h-4" />
                <span>T: {settings?.temperature || 0.7}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-xs">🎯</span>
                <span>{settings?.max_tokens || 2000} tokens</span>
              </div>
            </div>
            
            <button
              onClick={togglePersonalities}
              className="flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 px-3 py-2 rounded-lg transition-colors"
            >
              <User className="w-4 h-4" />
              <span className="hidden sm:inline">Personality</span>
            </button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md">
              <Bot className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Start a conversation
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Ask me anything! I'm here to help with your questions and tasks.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 p-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`group flex gap-4 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                <div className="relative max-w-3xl">
                  <div
                    className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                       ? 'bg-blue-600 text-white'
                       : 'bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white'
                    }`}
                  >
                    {message.role === 'user' ? (
                      <p className="whitespace-pre-wrap">{message.content}</p>
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ node, inline, className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || '');
                            return !inline && match ? (
                              <SyntaxHighlighter
                                style={settings?.theme === 'dark' ? oneDark : oneLight}
                                language={match[1]}
                                PreTag="div"
                                className="rounded-lg !mt-2 !mb-2"
                                {...props}
                              >
                                {String(children).replace(/\n$/, '')}
                              </SyntaxHighlighter>
                            ) : (
                              <code
                                className="bg-gray-200 dark:bg-gray-600 px-1 py-0.5 rounded text-sm"
                                {...props}
                              >
                                {children}
                              </code>
                            );
                          },
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    )}
                    {message.role === 'assistant' && message.token_usage && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Zap className="w-3 h-3" />
                          <span>
                            Tokens: {message.token_usage.total_tokens} 
                            ({message.token_usage.prompt_tokens} + {message.token_usage.completion_tokens})
                            • Total: {totalTokens.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Copy Button - Always visible below message */}
                  <div className={`mt-2 ${message.role === 'user' ? 'text-right' : 'text-left'}`}>
                    <button
                      onClick={() => handleCopyMessage(message.id, message.content)}
                      className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                    >
                      {copiedMessageId === message.id ? (
                        <>
                          <Check className="w-3 h-3 text-green-500" />
                          <span className="text-green-500">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
            
            {isGenerating && (
              <div className="flex gap-4 justify-start">
                <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              className="w-full resize-none border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              style={{ minHeight: '52px', maxHeight: '200px' }}
              disabled={isGenerating}
            />
            <button
              type="submit"
              disabled={!input.trim() || isGenerating}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <Square className="w-4 h-4" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};