import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/common/Logo';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, login, logout, getDashboardRoute } = useAuth();

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;
    setError(null);

    const trimmedId = userId.trim();
    if (!trimmedId) {
      setError('Please enter your assigned User ID or email.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await login(trimmedId, password);
      if (res.success && res.user) {
        navigate(getDashboardRoute(res.user.role), { replace: true });
      } else if (res.success) {
        navigate(getDashboardRoute(), { replace: true });
      } else {
        setError(res.error || 'Authentication failed. Please check your credentials.');
        setIsLoading(false);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setError(err.message || 'An unexpected error occurred during sign-in.');
      setIsLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen relative flex flex-col justify-between text-[#1A221E] selection:bg-[#E8F1EC] selection:text-[#164734] overflow-x-hidden bg-[#FAF9F6] bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/a_clean_abstract_background_with_no_text_a_very_l.png')",
      }}
    >
      {/* 1. Header: Institutional header preserved exactly as is */}
      <header className="relative z-20 bg-white/80 backdrop-blur-md border-b border-[#BFCFC6] shadow-card-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 sm:h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <Logo
              size="lg"
              className="h-9 sm:h-11 w-auto object-contain shrink-0"
              alt="AIMPLB Official Emblem"
            />
            <div className="border-l border-[#BFCFC6] pl-2.5 sm:pl-3 min-w-0">
              <span className="block text-[11px] xs:text-xs sm:text-sm font-extrabold tracking-wide text-[#164734] uppercase font-sans truncate">
                All India Muslim Personal Law Board
              </span>
              <p className="text-[9px] xs:text-[10px] sm:text-[11px] text-[#4F6357] font-semibold truncate">
                30th Annual Session • Central Secretariat
              </p>
            </div>
          </div>

          {/* User shortcut if already authenticated */}
          {currentUser && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(getDashboardRoute(currentUser.role))}
              className="flex items-center gap-1.5 border-[#164734] text-[#164734] hover:bg-white/90 shrink-0 font-semibold text-xs h-8 px-2.5 sm:px-3 bg-white/60"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">{currentUser.role === 'Admin' ? 'Centralized Invitees' : 'Dashboard'}</span>
              <span className="xs:hidden">Portal</span>
            </Button>
          )}
        </div>
      </header>

      {/* 2. Main Content Body: Matching /login clean & minimal centered layout */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center py-8 sm:py-12 md:py-16 px-4 sm:px-6 lg:px-8">
        {/* A. Organisation Logo */}
        <Logo
          size="xl"
          className="mx-auto h-20 sm:h-24 md:h-28 w-auto object-contain mb-3 sm:mb-4 drop-shadow-xs"
          alt="AIMPLB Logo"
        />

        {/* B. Organisation Name */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold tracking-tight text-[#164734] uppercase font-sans text-center">
          ALL INDIA MUSLIM PERSONAL LAW BOARD
          <span className="sr-only" lang="ur" dir="rtl">
            <span className="font-urdu">آل انڈیا مسلم پرسنل لا بورڈ</span>
          </span>
        </h1>

        {/* C. Subtitle */}
        <h2 className="mt-1 sm:mt-1.5 text-xs sm:text-sm font-semibold text-[#1A221E] text-center">
          30th Annual Session • Volunteer Coordination Portal
        </h2>

        {/* D. Event Details */}
        <div className="mt-2.5 sm:mt-3 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs sm:text-sm font-semibold text-[#164734]">
          <div className="inline-flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-[#164734] shrink-0" />
            <span>14–16 December 2026</span>
            <span className="sr-only">14, 15 and 16 December 2026</span>
          </div>
          <span className="text-[#8BA395] font-bold hidden xs:inline">•</span>
          <div className="inline-flex items-center gap-1.5">
            <MapPin className="h-4 w-4 text-[#164734] shrink-0" />
            <span>Hajj House, Chennai, Tamil Nadu, India</span>
          </div>
        </div>

        {/* 3. Volunteer Sign-in Card */}
        <div className="mt-6 sm:mt-8 w-full max-w-md sm:max-w-lg md:max-w-[560px]">
          <div className="bg-white py-7 sm:py-9 px-5 sm:px-10 shadow-dropdown border border-[#E3E7E4] rounded-2xl">
            {currentUser ? (
              /* Logged-In User Profile State */
              <div className="text-center py-2">
                <div className="w-14 h-14 mx-auto rounded-full bg-[#164734] text-white flex items-center justify-center font-extrabold text-xl mb-3 shadow-xs">
                  {currentUser.full_name.charAt(0)}
                </div>
                <h3 className="text-base sm:text-lg font-bold text-[#1A221E]">{currentUser.full_name}</h3>
                <p className="text-xs sm:text-sm text-[#164734] font-semibold mt-0.5">{currentUser.role}</p>
                <p className="text-xs text-[#69756F] mt-1">@{currentUser.username} • {currentUser.department}</p>

                <div className="mt-6 flex flex-col gap-2.5">
                  <Button
                    size="lg"
                    onClick={() => navigate(getDashboardRoute(currentUser.role))}
                    className="w-full h-11 bg-[#164734] text-white hover:bg-[#103728] font-semibold text-sm flex items-center justify-center gap-2 shadow-xs rounded-xl transition-all"
                  >
                    <span>{currentUser.role === 'Admin' ? 'Open Centralized Invitees' : 'Open My Dashboard'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logout()}
                    className="w-full h-9 text-xs text-[#69756F] hover:text-red-600 hover:bg-red-50 hover:border-red-200 border-[#E3E7E4] rounded-xl"
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            ) : (
              /* Volunteer Sign-In Form */
              <div>
                <div className="mb-6 pb-4 border-b border-[#F4F6F4] text-center">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#1A221E]">
                    Authorized Volunteer Sign In
                  </h3>
                  <p className="text-xs text-[#69756F] mt-1">
                    Enter your assigned username to access your department
                  </p>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-start gap-2.5 animate-fade-in"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {showForgotNotice && (
                  <div
                    role="alert"
                    className="mb-4 p-3.5 rounded-xl bg-[#E8F1EC] border border-[#C5DEC8] text-xs text-[#164734] flex items-start gap-2.5 animate-fade-in"
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[#164734] mt-0.5" />
                    <span>
                      To reset volunteer credentials, contact the Chief Event Coordinator at the Central Secretariat desk.
                    </span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    id="userId"
                    label="User ID / Volunteer Username"
                    required
                    value={userId}
                    onChange={(e) => setUserId(e.target.value)}
                    placeholder="e.g. admin or transport_team"
                    icon={<User className="h-4 w-4" />}
                  />

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label htmlFor="password" className="block text-xs font-semibold text-[#1A221E]">
                        Password <span className="text-red-500 font-bold">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotNotice(!showForgotNotice)}
                        className="text-[11px] text-[#164734] hover:underline font-semibold"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div className="relative flex items-center">
                      <div className="absolute left-3 text-[#69756F] pointer-events-none flex items-center">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="h-10 w-full rounded-lg border border-[#E3E7E4] bg-white pl-9 pr-10 text-sm text-[#1A221E] shadow-card-subtle transition-all duration-150 placeholder:text-[#AAB3AE] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 p-1 text-[#69756F] hover:text-[#1A221E] rounded-md transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="w-full mt-2 font-semibold shadow-xs flex items-center justify-center gap-2"
                    isLoading={isLoading}
                  >
                    <span>Sign In to Portal</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* 4. Institutional Footer */}
      <footer className="relative z-10 border-t border-[#BFCFC6] bg-white/70 backdrop-blur-sm py-4 text-center text-xs text-[#4F6357]">
        <div className="max-w-6xl mx-auto px-4 space-y-0.5">
          <p className="font-bold text-[#1A221E]">All India Muslim Personal Law Board • 30th Annual Session</p>
          <p className="text-[11px]">14–16 December 2026 • Hajj House, Chennai</p>
        </div>
      </footer>
    </div>
  );
};
