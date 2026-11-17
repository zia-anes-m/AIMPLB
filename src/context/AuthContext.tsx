import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { UserProfile, UserRole } from '@/types';
import { supabase } from '@/lib/supabase';
import { safeStorage } from '@/lib/safeStorage';

interface AuthContextType {
  currentUser: UserProfile | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; user?: UserProfile; error?: string }>;
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

  // Initialize and synchronize authentication session strictly via Supabase Auth
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        // Query official Supabase Auth session (never restore from raw localStorage)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          if (isMounted) {
            setCurrentUser(null);
            safeStorage.removeItem(CURRENT_USER_STORAGE_KEY);
            setIsLoading(false);
          }
          return;
        }

        // Fetch verified profile from public.profiles table using auth.user.id = profiles.id
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (isMounted) {
          if (!profileError && profile && profile.is_active) {
            const userProfile = profile as UserProfile;
            setCurrentUser(userProfile);
            safeStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(userProfile));
          } else {
            if (profileError) {
              console.warn('[Auth] Session profile query returned error:', profileError);
            }
            // Profile does not exist or is deactivated - terminate session
            await supabase.auth.signOut();
            setCurrentUser(null);
            safeStorage.removeItem(CURRENT_USER_STORAGE_KEY);
          }
        }
      } catch (err) {
        console.error('Session initialization error:', err);
        if (isMounted) {
          setCurrentUser(null);
          safeStorage.removeItem(CURRENT_USER_STORAGE_KEY);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    initSession();

    // Listen to real-time auth state events from Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') && session?.user) {
          const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (isMounted) {
            if (!error && profile && profile.is_active) {
              const userProfile = profile as UserProfile;
              setCurrentUser(userProfile);
              safeStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(userProfile));
            } else {
              if (error) {
                console.warn('[Auth] AuthStateChange profile query returned error:', error);
              }
              setCurrentUser(null);
              safeStorage.removeItem(CURRENT_USER_STORAGE_KEY);
            }
            setIsLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          if (isMounted) {
            setCurrentUser(null);
            safeStorage.removeItem(CURRENT_USER_STORAGE_KEY);
            setIsLoading(false);
          }
        }
      }
    );

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = useCallback(
    async (
      identifierInput: string,
      password: string
    ): Promise<{ success: boolean; user?: UserProfile; error?: string }> => {
      setIsLoading(true);
      try {
        const identifier = identifierInput.trim();
        if (!identifier || !password) {
          setIsLoading(false);
          return { success: false, error: 'Please enter both your username/email and password.' };
        }

        // 1. Direct email authentication if input contains '@'
        if (identifier.includes('@')) {
          const email = identifier.toLowerCase();
          const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
            email,
            password,
          });

          if (authError || !authData?.user) {
            setIsLoading(false);
            const rawMsg = authError?.message || '';
            const userFriendlyError = rawMsg.toLowerCase().includes('invalid login credentials')
              ? 'Invalid email address or password. Please verify your credentials.'
              : (rawMsg || 'Authentication failed. Please check your credentials.');
            return { success: false, error: userFriendlyError };
          }

          console.log('[Auth] Direct Supabase Auth sign-in successful. User UID:', authData.user.id);

          const { data: profile, error: pError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', authData.user.id)
            .single();

          if (pError || !profile) {
            console.error('[Auth] Failed to load user profile from public.profiles:', pError);
            await supabase.auth.signOut();
            setIsLoading(false);
            return {
              success: false,
              error: 'Authorized user profile not found in database. Contact Secretariat Admin.',
            };
          }

          if (!profile.is_active) {
            await supabase.auth.signOut();
            setIsLoading(false);
            return {
              success: false,
              error: 'Your account has been deactivated. Contact Secretariat Admin.',
            };
          }

          const userProfile = profile as UserProfile;
          setCurrentUser(userProfile);
          safeStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(userProfile));
          setIsLoading(false);
          return { success: true, user: userProfile };
        }

        // 2. Primary: Username authentication via admin-users Edge Function
        try {
          const { data: edgeData, error: edgeError } = await supabase.functions.invoke('admin-users', {
            body: {
              action: 'login',
              username: identifier,
              password,
            },
          });

          if (!edgeError && edgeData?.session && edgeData?.profile) {
            await supabase.auth.setSession({
              access_token: edgeData.session.access_token,
              refresh_token: edgeData.session.refresh_token,
            });

            const userProfile = edgeData.profile as UserProfile;
            setCurrentUser(userProfile);
            safeStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(userProfile));
            setIsLoading(false);
            return { success: true, user: userProfile };
          }
        } catch (edgeErr) {
          console.warn('[Auth] Edge Function login invocation error:', edgeErr);
        }

        // 3. Resilient Fallback: Resolve username via secure PostgreSQL RPC & direct Supabase Auth
        try {
          const { data: resolvedEmail, error: rpcErr } = await supabase.rpc('resolve_username_to_auth_email', {
            p_username: identifier,
          });

          if (!rpcErr && resolvedEmail) {
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
              email: resolvedEmail,
              password,
            });

            if (authError || !authData?.user) {
              setIsLoading(false);
              return { success: false, error: 'Invalid username or password. Please verify your credentials.' };
            }

            const { data: profile, error: pError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', authData.user.id)
              .single();

            if (pError || !profile || !profile.is_active) {
              await supabase.auth.signOut();
              setIsLoading(false);
              return {
                success: false,
                error: !profile?.is_active
                  ? 'Your account has been deactivated. Contact Secretariat Admin.'
                  : 'Authorized user profile not found in database. Contact Secretariat Admin.',
              };
            }

            const userProfile = profile as UserProfile;
            setCurrentUser(userProfile);
            safeStorage.setItem(CURRENT_USER_STORAGE_KEY, JSON.stringify(userProfile));
            setIsLoading(false);
            return { success: true, user: userProfile };
          }
        } catch (rpcFallbackErr) {
          console.warn('[Auth] RPC username fallback error:', rpcFallbackErr);
        }

        setIsLoading(false);
        return { success: false, error: 'Invalid username or password. Please verify your credentials.' };
      } catch (err: any) {
        setIsLoading(false);
        return { success: false, error: err.message || 'An unexpected error occurred during sign-in.' };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    } finally {
      setCurrentUser(null);
      safeStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      setIsLoading(false);
    }
  }, []);

  // Preserved for interface compatibility (disabled in production - users cannot bypass their assigned role)
  const switchRole = useCallback(async (_targetRole: UserRole) => {
    console.warn('Role switching is disabled. User roles are strictly enforced from your authenticated Supabase profile.');
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
        return '/';
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
