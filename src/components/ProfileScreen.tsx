import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ProfileScreenProps {
  onClose: () => void;
}

interface UserProfile {
  email: string;
  created_at: string;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onClose }) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setProfile({
            email: user.email || '',
            created_at: user.created_at
          });
        }
      } catch (error) {
        console.error('Error loading profile:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  const userName = profile?.email?.split('@')[0] || 'User';
  const joinDate = profile?.created_at 
    ? new Date(profile.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : '';

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Profile</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Profile Content */}
        <div className="p-6 space-y-6">
          {/* Avatar Section */}
          <div className="flex flex-col items-center">
            <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <User className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{userName}</h3>
          </div>

          {/* Profile Information */}
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Mail className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <div className="flex-1">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Email</div>
                <div className="text-sm text-gray-900 dark:text-gray-100">{profile?.email}</div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              <Calendar className="w-5 h-5 text-gray-500 dark:text-gray-400" />
              <div className="flex-1">
                <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Member Since</div>
                <div className="text-sm text-gray-900 dark:text-gray-100">{joinDate}</div>
              </div>
            </div>
          </div>

          {/* Extensible Section - for future additions */}
          <div className="space-y-4">
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Account Settings</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                More profile settings and preferences will be available here.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50 rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};