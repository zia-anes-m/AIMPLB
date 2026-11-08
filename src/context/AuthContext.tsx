import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile, UserRole } from '@/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { getProfiles } from '@/services/api';
import { safeStorage } from '@/lib/safeStorage';

interface AuthContextType {
  currentUser: UserProfile | null;
  isLoading: boolean;
  login: (userId: string, password: string) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  isAdmin: boolean;
  hasRole: (role: UserRole) => boolean;
  getDashboardRoute: (role?: UserRole) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CURRENT_USER_STORAGE_KEY = 'aimplb_current_user_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize session
  useEffect(() => {
    async function initSession() {
      try {
        if (isSupabaseConfigured) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) {
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.session.user.id)
              .single();
            if (profile && profile.is_active) {
              setCurrentUser(profile as UserProfile);
              setIsLoading(false);
              return;
            }
          }
        }

        // Fallback to local session
        const saved = safeStorage.getItem(CURRENT_USER_STORAGE_KEY);
        if (saved) {
          const user = JSON.parse(saved) as UserProfile;
          if (user.is_active) {
            setCurrentUser(user);
          } else {
            safeStorage.removeItem(CURRENT_USER_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error('Failed to restore session:', err);
      } finally {
        setIsLoading(false);
      }
    }

    initSession();
  }, []);

  const login = useCallback(
    async (
      userId: string,
      password: string
    ): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
      setIsLoading(true);
      try {
        const cleanId = userId.trim().toLowerCase();

        // If Supabase is connected, attempt auth sign in
        if (isSupabaseConfigured) {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: cleanId.includes('@') ? cleanId : `${cleanId}@aimplb.org`,
            password,
          });

          if (error) {
            // If Supabase auth failed, also check local demo profiles if in hybrid mode
            console.warn('Supabase auth error:', error.message);
          } else if (data.user) {
            const { data: profile, error: pError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', data.user.id)
              .single();

            if (pError || !profile) {
              setIsLoading(false);
              return { success: false, error: 'User profile not found in database.' };
            }

            if (!profile.is_active) {
              setIsLoading(false);
              return { success: false, error: 'Your volunteer account is currently disabled. Contact Admin.' };
            }

            const userProfile = profile as UserProfile;
            setCurrentUser(userProfile);
            safeStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(userProfile));
            setIsLoading(false);
            return { success: true, user: userProfile };
          }
        }

        // Check local profiles (matching by username or full name or default password)
        const allProfiles = await getProfiles();
        const matched = allProfiles.find(
          (p) =>
            p.username.toLowerCase() === cleanId ||
            p.full_name.toLowerCase().includes(cleanId) ||
            p.role.toLowerCase().replace(/\s+/g, '_') === cleanId
        );

        if (!matched) {
          setIsLoading(false);
          return {
            success: false,
            error: 'Invalid User ID. Please check your assigned volunteer username or email.',
          };
        }

        if (!matched.is_active) {
          setIsLoading(false);
          return {
            success: false,
            error: 'Your volunteer account has been deactivated. Please contact the Secretariat Admin.',
          };
        }

        // In demo mode or if default credentials used
        setCurrentUser(matched);
        safeStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(matched));
        setIsLoading(false);
        return { success: true, user: matched };
      } catch (err: any) {
        setIsLoading(false);
        return { success: false, error: err.message || 'An error occurred during sign-in.' };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Sign out error:', err);
    } finally {
      setCurrentUser(null);
      safeStorage.removeItem(CURRENT_USER_STORAGE_KEY);
    }
  }, []);

  // Quick switcher for demo and testing all 6 department workflows
  const switchRole = useCallback(async (targetRole: UserRole) => {
    const allProfiles = await getProfiles();
    const targetProfile = allProfiles.find((p) => p.role === targetRole);
    if (targetProfile && targetProfile.is_active) {
      setCurrentUser(targetProfile);
      safeStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(targetProfile));
    }
  }, []);

  const isAdmin = currentUser?.role === 'Admin';
  const hasRole = useCallback((role: UserRole) => currentUser?.role === role, [currentUser?.role]);

  const getDashboardRoute = useCallback((role?: UserRole): string => {
    const userRole = role || currentUser?.role;
    switch (userRole) {
      case 'Admin':
        return '/invitees'; // Centralized Invitees page opens first when Admin logs in
      case 'Transportation Team':
        return '/transportation/dashboard';
      case 'Accommodation Team':
        return '/accommodation/dashboard';
      case 'Food Team':
        return '/food/dashboard';
      case 'Reception Team':
        return '/reception/dashboard';
      case 'Meeting Hall Team':
        return '/meeting-hall/dashboard';
      default:
        return '/login';
    }
  }, [currentUser?.role]);

  const contextValue = useMemo(
    () => ({
      currentUser,
      isLoading,
      login,
      logout,
      switchRole,
      isAdmin,
      hasRole,
      getDashboardRoute,
    }),
    [currentUser, isLoading, login, logout, switchRole, isAdmin, hasRole, getDashboardRoute]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

