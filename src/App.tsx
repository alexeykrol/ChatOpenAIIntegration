import React, { useEffect } from 'react';
import { useStore } from './store/useStore';
import { supabase } from './lib/supabase';
import { Auth } from './components/Auth';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { Settings } from './components/Settings';
import { Personalities } from './components/Personalities';

function App() {
  const { user, setUser, isLoading, showSettings, showPersonalities, settings } = useStore();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      useStore.setState({ isLoading: false });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  useEffect(() => {
    // Apply theme on load
    if (settings?.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings?.theme]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  return (
    <div className="h-screen bg-gray-100 dark:bg-gray-900 flex overflow-hidden">
      <Sidebar />
      <ChatArea />
      {showSettings && <Settings />}
      {showPersonalities && <Personalities />}
    </div>
  );
}

export default App;
