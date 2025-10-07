import { create } from 'zustand';
import { User } from '@supabase/supabase-js';
import { supabase, Database, PersonalityFile } from '../lib/supabase';
import { OpenAIService, TokenUsage } from '../lib/openai';
import { AssistantService } from '../lib/assistantService';
import { VectorStoreService } from '../lib/vectorStoreService';
import { IntegrationService } from '../lib/integrationService';
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
  showMemorySettings: boolean;
  uploading: boolean;
  error: string | null;
  
  // Services
  openaiService: OpenAIService;
  assistantService: AssistantService;
  vectorStoreService: VectorStoreService;
  integrationService: IntegrationService;
  
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
  toggleMemorySettings: () => void;
  loadPersonalities: () => Promise<void>;
  createPersonality: (name: string, prompt: string, hasMemory?: boolean) => Promise<Personality | null>;
  updatePersonality: (id: string, updates: Partial<Personality>) => Promise<void>;
  deletePersonality: (id: string) => Promise<void>;
  setActivePersonality: (id: string) => Promise<void>;
  uploadPersonalityFile: (personalityId: string, file: File) => Promise<PersonalityFile>;
  deletePersonalityFile: (personalityId: string, fileId: string) => Promise<void>;
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
  showMemorySettings: false,
  uploading: false,
  error: null,
  openaiService: new OpenAIService(),
  assistantService: new AssistantService(),
  vectorStoreService: new VectorStoreService(),
  integrationService: new IntegrationService(),

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
    // Prevent double execution
    if (get().isGenerating) {
      console.log('Message already in progress, skipping...');
      return;
    }
    
    const { user, currentChatId, settings, openaiService } = get();
    if (!user || !settings?.openai_api_key) {
      console.error('Missing user or API key');
      return;
    }

    // Check if we have active personality with assistant
    const { activePersonality } = get();
    if (!activePersonality?.openai_assistant_id) {
      console.error('No active personality with Assistant ID found');
      return;
    }

    let chatId = currentChatId;
    
    // Create new chat if none selected
    if (!chatId) {
      chatId = await get().createChat();
      set({ currentChatId: chatId });
    }

    // Get current chat to check for thread ID
    const { data: chatData } = await supabase
      .from('chats')
      .select('openai_thread_id')
      .eq('id', chatId)
      .single();

    let threadId = chatData?.openai_thread_id;

    set({ isGenerating: true });

    try {
      openaiService.setApiKey(settings.openai_api_key.trim());

      // Create thread if it doesn't exist
      if (!threadId) {
        const thread = await openaiService.createThread();
        threadId = thread.id;
        
        // Update chat with thread ID
        await supabase
          .from('chats')
          .update({ openai_thread_id: threadId })
          .eq('id', chatId);
      }

      // Add user message to UI
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

      // Add message to OpenAI thread
      await openaiService.addMessage(threadId, content);

      // Create assistant message placeholder
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        chat_id: chatId,
        role: 'assistant',
        content: '',
        created_at: new Date().toISOString()
      };

      set(state => ({ messages: [...state.messages, assistantMessage] }));

      // Run the assistant
      const run = await openaiService.runAssistant(threadId, activePersonality.openai_assistant_id);

      // Poll for completion (simple polling - in production you might want to use webhooks)
      let runStatus = run.status;
        let attempts = 0;
      const maxAttempts = 30; // 30 seconds timeout
      let lastRunCheck: any = { status: run.status, usage: null, run: run };
      let lastLoggedStatus = run.status;
      
      console.log('Run status:', lastLoggedStatus);
      
      while ((runStatus === 'queued' || runStatus === 'in_progress') && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        lastRunCheck = await openaiService.checkRun(threadId, run.id);
        runStatus = lastRunCheck.status;
        attempts++;
        
        // Log only status changes
        if (runStatus !== lastLoggedStatus) {
          console.log('Run status:', runStatus);
          lastLoggedStatus = runStatus;
        }
        
        // Check for requires_action or errors
        if (lastRunCheck.run?.status === 'requires_action') {
          console.warn('Requires action:', JSON.stringify(lastRunCheck.run.required_action, null, 2));
          break;
        }
        if (lastRunCheck.run?.last_error) {
          console.error('Run error:', lastRunCheck.run.last_error);
          break;
        }
      }
      
      if (attempts >= maxAttempts) {
        console.error('Run timeout after 30 seconds');
        throw new Error('Assistant run timeout');
      }

      if (runStatus === 'completed') {
        // Use token usage from the last run check (we already have it from polling)
        const tokenUsage = lastRunCheck?.usage;
        
        if (tokenUsage) {
          console.log('Tokens:', tokenUsage.total_tokens, '(prompt:', tokenUsage.prompt_tokens, 'completion:', tokenUsage.completion_tokens + ')');
          // Update total tokens in state
          set(state => ({ totalTokens: state.totalTokens + tokenUsage.total_tokens }));
        }

        // Get the latest messages from the thread
        const threadMessages = await openaiService.getThreadMessages(threadId);
        const latestAssistantMessage = threadMessages
          .filter(msg => msg.role === 'assistant')
          .pop();
        
        console.log('Got assistant message:', latestAssistantMessage ? 'YES' : 'NO');
        
        if (latestAssistantMessage) {
          console.log('Updating message with content length:', latestAssistantMessage.content.length);
          
          // Update the assistant message in UI
          set(state => ({
            messages: state.messages.map(msg =>
              msg.id === assistantMessage.id
                ? { ...msg, content: latestAssistantMessage.content, token_usage: tokenUsage }
                : msg
            )
          }));

          console.log('UI updated, saving to DB...');

          // Save assistant message to DB
          const { error: saveError } = await supabase.from('messages').insert({
            chat_id: chatId,
            role: 'assistant',
            content: latestAssistantMessage.content
          });

          if (saveError) {
            console.error('Error saving to DB:', saveError);
          } else {
            console.log('Message saved to DB successfully');
            
            // Trigger summarization if personality has memory AND summarization is enabled for this personality
            if (activePersonality.has_memory && activePersonality.summarization_enabled) {
              try {
                console.log('✅ Summarization enabled for personality - triggering API call');
                console.log('Summarization settings:', {
                  model: activePersonality.summarization_model,
                  prompt_length: activePersonality.summarization_prompt?.length || 0
                });
                
                // Get the assistant message ID from DB (most recent)
                const { data: assistantMsgData } = await supabase
                  .from('messages')
                  .select('id')
                  .eq('chat_id', chatId)
                  .eq('role', 'assistant')
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .single();
                
                if (assistantMsgData) {
                  // Trigger summarization API call (fire and forget)
                  fetch('/api/retrieval/summarize', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                      thread_id: chatId,
                      user_msg_id: userMessage.id,
                      assistant_msg_id: assistantMsgData.id
                    })
                  }).catch(error => {
                    console.warn('Summarization trigger failed:', error);
                    // Don't throw error - this should not break chat flow
                  });
                }
              } catch (error) {
                console.warn('Summarization trigger failed:', error);
                // Don't throw error - this should not break chat flow
              }
            } else if (activePersonality.has_memory && !activePersonality.summarization_enabled) {
              console.log('❌ Summarization disabled for this personality - skipping');
            } else if (!activePersonality.has_memory) {
              console.log('❌ Personality has no memory - summarization skipped');
            }
          }

          // Update chat title if it's the first message
          const currentMessages = get().messages;
          if (currentMessages.length === 2) {
            const title = content.slice(0, 50) + (content.length > 50 ? '...' : '');
            await get().updateChatTitle(chatId, title);
          }

          // Update chat with token usage if available
          if (tokenUsage) {
            set(state => ({
              chats: state.chats.map(chat =>
                chat.id === chatId
                  ? { ...chat, token_usage: tokenUsage }
                  : chat
              )
            }));
          }
        }
      } else {
        console.error('Assistant run failed with status:', runStatus);
        // Remove the empty assistant message on error
        set(state => ({
          messages: state.messages.filter(msg => msg.id !== assistantMessage?.id)
        }));
      }

    } catch (error) {
      console.error('Error with Assistants API:', error);
      // Remove the empty assistant message on error if it exists
      set(state => ({
        messages: state.messages.filter(msg => 
          msg.role === 'assistant' && msg.content === '' ? false : true
        )
      }));
    } finally {
      set({ isGenerating: false });
    }
  },

  loadSettings: async () => {
    const { user } = get();
    if (!user) return;

    const { data: settingsData } = await supabase
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
        try {
          data.openai_api_key = await encryption.decrypt(data.openai_api_key);
        } catch (error) {
          console.error('Failed to decrypt API key:', error);
          // Clear invalid encrypted data
          data.openai_api_key = '';
        }
      }

      set({ settings: data });
      if (data.openai_api_key) {
        get().openaiService.setApiKey(data.openai_api_key);
        get().assistantService.setApiKey(data.openai_api_key);
        get().vectorStoreService.setApiKey(data.openai_api_key);
        get().integrationService.setApiKey(data.openai_api_key);
      }
    }
  },

  updateSettings: async (newSettings) => {
    const { user, settings } = get();
    if (!user || !settings) return;

    // Encrypt API key before saving to database
    const settingsToSave = { ...newSettings };
    if (settingsToSave.openai_api_key) {
      try {
        settingsToSave.openai_api_key = await encryption.encrypt(settingsToSave.openai_api_key);
      } catch (error) {
        console.error('Failed to encrypt API key:', error);
        throw new Error('Failed to save settings: encryption error');
      }
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
        get().assistantService.setApiKey(newSettings.openai_api_key);
        get().vectorStoreService.setApiKey(newSettings.openai_api_key);
        get().integrationService.setApiKey(newSettings.openai_api_key);
      }
    }
  },

  toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
  toggleSettings: () => set(state => ({ showSettings: !state.showSettings })),
  togglePersonalities: () => set(state => ({ showPersonalities: !state.showPersonalities })),
  toggleMemorySettings: () => set(state => ({ showMemorySettings: !state.showMemorySettings })),

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
    const { user, settings, assistantService } = get();
    if (!user) return null;

    try {
      let assistantId: string | null = null;

      // Create OpenAI Assistant if API key is available
      if (settings?.openai_api_key) {
        try {
          assistantService.setApiKey(settings.openai_api_key.trim());
          const assistant = await assistantService.createAssistant({
            name,
            instructions: prompt,
            model: settings.model || 'gpt-4o',
            tools: [] // Don't add file_search tool initially
          });
          assistantId = assistant.id;
        } catch (error) {
          console.warn('Failed to create OpenAI Assistant:', error);
          // Continue with personality creation even if Assistant creation fails
        }
      }

      const { data, error } = await supabase
        .from('personalities')
        .insert({
          user_id: user.id,
          name,
          prompt,
          is_active: false,
          has_memory: hasMemory,
          openai_assistant_id: assistantId
        })
        .select()
        .single();

      if (!error && data) {
        set(state => ({ personalities: [data, ...state.personalities] }));
        return data;
      }
      return null;
    } catch (error) {
      console.error('Error creating personality:', error);
      return null;
    }
  },

  updatePersonality: async (id, updates) => {
    const { settings, openaiService } = get();
    
    // Update in local database first
    const { error } = await supabase
      .from('personalities')
      .update(updates)
      .eq('id', id);
      
    if (error) {
      throw new Error(`Failed to update personality: ${error.message}`);
    }

    // Update local state
    set(state => ({
      personalities: state.personalities.map(p =>
        p.id === id ? { ...p, ...updates } : p
      ),
      activePersonality: state.activePersonality?.id === id 
        ? { ...state.activePersonality, ...updates }
        : state.activePersonality
    }));

    // Sync with OpenAI if assistant exists and API key is available
    const personality = get().personalities.find(p => p.id === id);
    if (personality?.openai_assistant_id && settings?.openai_api_key) {
      try {
        openaiService.setApiKey(settings.openai_api_key.trim());
        await openaiService.updateAssistant(personality.openai_assistant_id, {
          name: updates.name || personality.name,
          instructions: updates.prompt || personality.prompt
        });
        console.log('Assistant synced with OpenAI successfully');
      } catch (syncError) {
        console.error('Failed to sync with OpenAI:', syncError);
        // Don't throw error here - local update was successful
      }
    }
  },

  deletePersonality: async (id) => {
    try {
      const { settings, openaiService } = get();
      
      // Get personality to check for assistant ID
      const personality = get().personalities.find(p => p.id === id);
      
      // Delete Assistant from OpenAI if it exists
      if (personality?.openai_assistant_id && settings?.openai_api_key) {
        try {
          openaiService.setApiKey(settings.openai_api_key.trim());
          await openaiService.deleteAssistant(personality.openai_assistant_id);
        } catch (error) {
          console.warn('Failed to delete OpenAI Assistant:', error);
          // Continue with database deletion even if Assistant deletion fails
        }
      }

      // Delete from database
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
    } catch (error) {
      console.error('Error deleting personality:', error);
      throw error;
    }
  },

  uploadPersonalityFile: async (personalityId: string, file: File) => {
    const { settings, integrationService } = get();
    
    if (!settings?.openai_api_key) {
      throw new Error('OpenAI API key is required for file upload');
    }

    try {
      set(() => ({ uploading: true, error: null }));
      
      // Get current personality
      const personality = get().personalities.find(p => p.id === personalityId);
      if (!personality || !personality.openai_assistant_id) {
        throw new Error('Personality not found or no OpenAI Assistant associated');
      }

      // Set API key and use integration service to upload files
      integrationService.setApiKey(settings.openai_api_key.trim());
      
      // Get existing vector_store_id from database if available
      // For now, we'll create a new vector store per upload - this can be optimized later
      const result = await integrationService.addFilesToPersonality(
        personality.openai_assistant_id,
        personality.name,
        [file]
      );
      
      // Create PersonalityFile objects from uploaded files
      const personalityFiles = result.uploaded_files.map(uploadResult => ({
        openai_file_id: uploadResult.file_id,
        file_name: uploadResult.file_name,
        file_size: uploadResult.file_size,
        file_type: uploadResult.file_type,
        status: 'ready' as const,
        uploaded_at: new Date().toISOString(),
      }));

      // Update files array in database
      const updatedFiles = [...(personality.files || []), ...personalityFiles];
      const { error } = await supabase
        .from('personalities')
        .update({ files: updatedFiles })
        .eq('id', personalityId);

      if (error) throw error;

      // Update local state
      set(state => ({
        personalities: state.personalities.map(p =>
          p.id === personalityId ? { ...p, files: updatedFiles } : p
        ),
        activePersonality: state.activePersonality?.id === personalityId 
          ? { ...state.activePersonality, files: updatedFiles }
          : state.activePersonality,
        uploading: false
      }));

      // IntegrationService already handled the Assistant update
      // Return the first uploaded file (maintaining backward compatibility)
      return personalityFiles[0];
    } catch (error) {
      set(() => ({ uploading: false, error: error instanceof Error ? error.message : 'Upload failed' }));
      throw error;
    }
  },

  deletePersonalityFile: async (personalityId: string, fileId: string) => {
    const { settings, integrationService } = get();
    
    try {
      const personality = get().personalities.find(p => p.id === personalityId);
      if (!personality) {
        throw new Error('Personality not found');
      }

      // Remove file from files array
      const updatedFiles = personality.files?.filter(f => f.openai_file_id !== fileId) || [];
      
      // Update database
      const { error } = await supabase
        .from('personalities')
        .update({ files: updatedFiles })
        .eq('id', personalityId);

      if (error) throw error;

      // Delete from OpenAI using integration service
      // Note: We don't have vector_store_id in current structure
      // This is a known limitation - files are removed from DB but may remain in OpenAI
      if (settings?.openai_api_key) {
        console.warn('File deletion from OpenAI vector stores not implemented in current version');
        // TODO: Store vector_store_id in personality or file metadata for proper cleanup
      }

      // Update local state
      set(state => ({
        personalities: state.personalities.map(p =>
          p.id === personalityId ? { ...p, files: updatedFiles } : p
        ),
        activePersonality: state.activePersonality?.id === personalityId 
          ? { ...state.activePersonality, files: updatedFiles }
          : state.activePersonality
      }));

      // Note: Vector Store management is handled separately by VectorStoreService
      // File removal from vector stores should be implemented when vector_store_id is tracked
    } catch (error) {
      throw error;
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