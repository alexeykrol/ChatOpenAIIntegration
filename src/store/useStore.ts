import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase, Database } from '../lib/supabase';
import { OpenAIService, TokenUsage } from '../lib/openai';
import { encryption } from '../lib/encryption';

type Chat = Database['public']['Tables']['chats']['Row'] & {
  token_usage?: TokenUsage;
};
type Message = Database['public']['Tables']['messages']['Row'];
type UserSettings = Database['public']['Tables']['user_settings']['Row'];
type Personality = Database['public']['Tables']['personalities']['Row'];

interface AppState {
  // Auth
  user: User | null;
  isLoading: boolean;
  
  // Chats
  chats: Chat[];
  currentChatId: string | null;
  messages: Message[];
  totalTokens: number;
  
  // Settings
  settings: UserSettings | null;
  
  // Personalities
  personalities: Personality[];
  activePersonality: Personality | null;
  
  // UI
  isGenerating: boolean;
  sidebarOpen: boolean;
  showSettings: boolean;
  showPersonalities: boolean;
  
  // OpenAI
  openaiService: OpenAIService;
  
  // Actions
  setUser: (user: User | null) => void;
  loadChats: () => Promise<void>;
  createChat: () => Promise<string>;
  selectChat: (chatId: string) => Promise<void>;
  deleteChat: (chatId: string) => Promise<void>;
  updateChatTitle: (chatId: string, title: string) => Promise<void>;
  sendMessage: (content: string) => Promise<void>;
  loadSettings: () => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  toggleSidebar: () => void;
  toggleSettings: () => void;
  togglePersonalities: () => void;
  loadPersonalities: () => Promise<void>;
  createPersonality: (name: string, prompt: string, hasMemory?: boolean) => Promise<void>;
  updatePersonality: (id: string, updates: Partial<Personality>) => Promise<void>;
  deletePersonality: (id: string) => Promise<void>;
  setActivePersonality: (id: string) => Promise<void>;
  setIsGenerating: (generating: boolean) => void;
}

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  user: null,
  isLoading: true,
  chats: [],
  currentChatId: null,
  messages: [],
  totalTokens: 0,
  settings: null,
  personalities: [],
  activePersonality: null,
  isGenerating: false,
  sidebarOpen: true,
  showSettings: false,
  showPersonalities: false,
  openaiService: new OpenAIService(),

  // Actions
  setUser: (user) => {
    set({ user });
    if (user) {
      get().loadChats();
      get().loadSettings();
      get().loadPersonalities();
    } else {
      set({ chats: [], currentChatId: null, messages: [], settings: null, personalities: [], activePersonality: null });
    }
  },

  loadChats: async () => {
    const { user } = get();
    if (!user) return;

    const { data, error } = await supabase
      .from('chats')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      set({ chats: data });
    }
  },

  createChat: async () => {
    const { user } = get();
    if (!user) throw new Error('User not authenticated');

    const { data, error } = await supabase
      .from('chats')
      .insert({
        id: crypto.randomUUID(),
        user_id: user.id,
        title: 'New Chat'
      })
      .select()
      .single();

    if (error) throw error;

    set(state => ({ chats: [data, ...state.chats] }));
    return data.id;
  },

  selectChat: async (chatId) => {
    set({ currentChatId: chatId });

    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('chat_id', chatId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      set({ messages: data });
    }
  },

  deleteChat: async (chatId) => {
    const { error } = await supabase
      .from('chats')
      .delete()
      .eq('id', chatId);

    if (!error) {
      set(state => ({
        chats: state.chats.filter(chat => chat.id !== chatId),
        currentChatId: state.currentChatId === chatId ? null : state.currentChatId,
        messages: state.currentChatId === chatId ? [] : state.messages
      }));
    }
  },

  updateChatTitle: async (chatId, title) => {
    const { error } = await supabase
      .from('chats')
      .update({ title })
      .eq('id', chatId);

    if (!error) {
      set(state => ({
        chats: state.chats.map(chat =>
          chat.id === chatId ? { ...chat, title } : chat
        )
      }));
    }
  },

  sendMessage: async (content) => {
    const { user, currentChatId, settings, openaiService } = get();
    if (!user || !settings?.openai_api_key) return;

    let chatId = currentChatId;
    
    // Create new chat if none selected
    if (!chatId) {
      chatId = await get().createChat();
      set({ currentChatId: chatId });
    }

    // Add user message
    const userMessage: Message = {
      id: crypto.randomUUID(),
      chat_id: chatId,
      role: 'user',
      content,
      created_at: new Date().toISOString()
    };

    set(state => ({ messages: [...state.messages, userMessage] }));

    // Save user message to DB
    await supabase.from('messages').insert({
      chat_id: chatId,
      role: 'user',
      content
    });

    // Generate AI response
    set({ isGenerating: true });

    let assistantMessage: Message;

    try {
      openaiService.setApiKey(settings.openai_api_key.trim());
      
      const messages = get().messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }));
      
      // Add personality prompt as system message if active personality exists
      const { activePersonality } = get();
      
      let messagesWithPersonality;
      if (activePersonality) {
        if (activePersonality.has_memory) {
          // Include all previous messages with personality prompt
          messagesWithPersonality = [{ role: 'system' as const, content: activePersonality.prompt }, ...messages];
        } else {
          // Only include current user message with personality prompt
          const currentUserMessage = messages[messages.length - 1];
          messagesWithPersonality = [
            { role: 'system' as const, content: activePersonality.prompt },
            currentUserMessage
          ];
        }
      } else {
        messagesWithPersonality = messages;
      }

      let assistantContent = '';
      assistantMessage = {
        id: crypto.randomUUID(),
        chat_id: chatId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString()
      };

      set(state => ({ messages: [...state.messages, assistantMessage] }));

      for await (const chunk of openaiService.streamChat(messagesWithPersonality, {
        model: settings.model,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens
      })) {
        if (chunk.content) {
          assistantContent += chunk.content;
        }
        set(state => ({
          messages: state.messages.map(msg =>
            msg.id === assistantMessage.id
              ? { ...msg, content: assistantContent }
              : msg
          )
        }));
        
        // Update token usage if provided
        if (chunk.usage) {
          set(state => ({
            totalTokens: state.totalTokens + chunk.usage!.total_tokens,
            messages: state.messages.map(msg =>
              msg.id === assistantMessage.id
                ? { ...msg, token_usage: chunk.usage }
                : msg
            )
          }));
        }
      }

      // Save assistant message to DB
      await supabase.from('messages').insert({
        chat_id: chatId,
        role: 'assistant',
        content: assistantContent
      });

      // Update chat title if it's the first message
      const currentMessages = get().messages;
      if (currentMessages.length === 2) {
        const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
        await get().updateChatTitle(chatId, title);
      }

    } catch (error) {
      console.error('Error generating response:', error);
      // Remove the empty assistant message on error
      set(state => ({
        messages: state.messages.filter(msg => msg.id !== assistantMessage?.id)
      }));
    } finally {
      set({ isGenerating: false });
    }
  },

  loadSettings: async () => {
    const { user } = get();
    if (!user) return;

    let { data: settingsData, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .limit(1);

    let data = null;
    if (settingsData && settingsData.length > 0) {
      data = settingsData[0];
    }

    if (!data) {
      // Create default settings if none exist
      const { data: newSettings, error: insertError } = await supabase
        .from('user_settings')
        .insert({
          user_id: user.id
        })
        .select()
        .single();

      if (!insertError) {
        data = newSettings;
      }
    }

    if (data) {
      // Decrypt API key when loading from database
      if (data.openai_api_key) {
        data.openai_api_key = encryption.decrypt(data.openai_api_key);
      }
      
      set({ settings: data });
      if (data.openai_api_key) {
        get().openaiService.setApiKey(data.openai_api_key);
      }
    }
  },

  updateSettings: async (newSettings) => {
    const { user, settings } = get();
    if (!user || !settings) return;

    // Encrypt API key before saving to database
    const settingsToSave = { ...newSettings };
    if (settingsToSave.openai_api_key) {
      settingsToSave.openai_api_key = encryption.encrypt(settingsToSave.openai_api_key);
    }

    const { error } = await supabase
      .from('user_settings')
      .update(settingsToSave)
      .eq('user_id', user.id);

    if (!error) {
      const updatedSettings = { ...settings, ...newSettings };
      set({ settings: updatedSettings });
      
      if (newSettings.openai_api_key) {
        get().openaiService.setApiKey(newSettings.openai_api_key);
      }
    }
  },

  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  toggleSettings: () => set(state => ({ showSettings: !state.showSettings })),
  togglePersonalities: () => set(state => ({ showPersonalities: !state.showPersonalities })),

  loadPersonalities: async () => {
    const { user } = get();
    if (!user) return;

    const { data, error } = await supabase
      .from('personalities')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      set({ personalities: data });
      const active = data.find(p => p.is_active);
      set({ activePersonality: active || null });
    }
  },

  createPersonality: async (name, prompt, hasMemory = true) => {
    const { user } = get();
    if (!user) return;

    const { data, error } = await supabase
      .from('personalities')
      .insert({
        user_id: user.id,
        name,
        prompt,
        is_active: false,
        has_memory: hasMemory
      })
      .select()
      .single();

    if (!error && data) {
      set(state => ({ personalities: [data, ...state.personalities] }));
    }
  },

  updatePersonality: async (id, updates) => {
    const { error } = await supabase
      .from('personalities')
      .update(updates)
      .eq('id', id);

    if (!error) {
      set(state => ({
        personalities: state.personalities.map(p =>
          p.id === id ? { ...p, ...updates } : p
        ),
        activePersonality: state.activePersonality?.id === id 
          ? { ...state.activePersonality, ...updates }
          : state.activePersonality
      }));
    }
  },

  deletePersonality: async (id) => {
    const { error } = await supabase
      .from('personalities')
      .delete()
      .eq('id', id);

    if (!error) {
      set(state => ({
        personalities: state.personalities.filter(p => p.id !== id),
        activePersonality: state.activePersonality?.id === id ? null : state.activePersonality
      }));
    }
  },

  setActivePersonality: async (id) => {
    const { user } = get();
    if (!user) return;

    // Deactivate all personalities first
    await supabase
      .from('personalities')
      .update({ is_active: false })
      .eq('user_id', user.id);

    // Activate the selected personality
    const { error } = await supabase
      .from('personalities')
      .update({ is_active: true })
      .eq('id', id);

    if (!error) {
      set(state => ({
        personalities: state.personalities.map(p => ({
          ...p,
          is_active: p.id === id
        })),
        activePersonality: state.personalities.find(p => p.id === id) || null
      }));
    }
  },

  setIsGenerating: (generating) => set({ isGenerating: generating })
}));