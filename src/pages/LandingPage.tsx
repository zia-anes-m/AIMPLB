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
      className="min-h-screen relative flex flex-col justify-between text-[#1A221E] selection:bg-[#B8CCC1] selection:text-[#164734] overflow-x-hidden bg-[#D2DBD5] bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/a_clean_abstract_background_with_no_text_a_very_l.png')",
      }}
    >
      {/* Full-viewport background layer using the uploaded clean abstract image */}
      <div
        className="fixed inset-0 pointer-events-none bg-cover bg-center bg-no-repeat z-0"
        style={{
          backgroundImage: "url('/a_clean_abstract_background_with_no_text_a_very_l.png')",
        }}
        aria-hidden="true"
      />

      {/* 1. Header: Compact, border-minimal, seamless institutional bar */}
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

          {/* User shortcut if already authenticated (No "Sign In Below" button) */}
          {currentUser && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(getDashboardRoute())}
              className="flex items-center gap-1.5 border-[#164734] text-[#164734] hover:bg-white/90 shrink-0 font-semibold text-xs h-8 px-2.5 sm:px-3 bg-white/60"
            >
              <Lock className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">{currentUser.role === 'Admin' ? 'Centralized Invitees' : 'Dashboard'}</span>
              <span className="xs:hidden">Portal</span>
            </Button>
          )}
        </div>
      </header>

      {/* =========================================================================
          DESKTOP VIEW (lg: 1024px and above)
          Redesigned based on handwritten wireframe:
          1. Bismillah centered
          2. Two blue horizontal lines with English & Urdu official name images
          3. 30th Annual Session with compact date & venue
          4. Centered translucent login card (~480px width)
          ========================================================================= */}
      <div className="hidden lg:flex flex-col items-center justify-center flex-1 w-full max-w-5xl xl:max-w-6xl mx-auto px-6 py-2 relative z-10">
        <h1 className="sr-only">
          <span>All India Muslim Personal Law Board</span>
          <span lang="ur" dir="rtl" className="font-urdu">آل انڈیا مسلم پرسنل لا بورڈ</span>
        </h1>

        {/* 1. Bismillah Section */}
        <div className="text-center pt-1 pb-2">
          <p
            className="font-arabic text-2xl xl:text-[28px] font-bold text-[#164734] tracking-wide select-none"
            dir="rtl"
            aria-label="Bismillah ir-Rahman ir-Rahim"
          >
            بِسمِ اللّٰهِ الرَّحمٰنِ الرَّحِیم
          </p>
        </div>

        {/* 2. Official Bilingual Organization Name flanked by two dark-blue lines (150–180px section height) */}
        <div className="w-full max-w-4xl xl:max-w-5xl my-2">
          {/* Top Blue Line */}
          <div className="w-full h-[1.5px] bg-[#163A50]" />

          {/* Bilingual Name Row: English on Left, Urdu on Right (Refined sizes for desktop) */}
          <div className="h-[180px] xl:h-[205px] flex items-center justify-between px-6 sm:px-10 lg:px-12 py-2.5 sm:py-3">
            {/* Left: Official English Name Image (+12-15% size increase) */}
            <div className="flex-1 flex justify-start items-center h-full">
              <img
                src="/English_name.png"
                alt="All India Muslim Personal Law Board"
                className="h-[146px] xl:h-[170px] max-h-[88%] w-auto max-w-[540px] xl:max-w-[580px] object-contain select-none"
                loading="eager"
              />
            </div>

            {/* Right: Official Urdu Calligraphy Name Image (Unchanged) */}
            <div className="flex-1 flex justify-end items-center h-full">
              <img
                src="/urdu_name_new.png"
                alt="آل انڈیا مسلم پرسنل لا بورڈ"
                className="h-[118px] xl:h-[136px] max-h-[84%] w-auto max-w-[480px] xl:max-w-[500px] object-contain select-none"
                loading="eager"
              />
            </div>
          </div>

          {/* Bottom Blue Line */}
          <div className="w-full h-[1.5px] bg-[#163A50]" />
        </div>

        {/* 3. Event Information */}
        <div className="text-center mt-3 mb-2.5">
          <div className="inline-flex items-center justify-center gap-3">
            <span className="h-px w-8 bg-[#163A50]/40" />
            <h2 className="text-lg xl:text-xl font-extrabold text-[#164734] tracking-wider uppercase font-sans">
              30th Annual Session
            </h2>
            <span className="h-px w-8 bg-[#163A50]/40" />
          </div>

          <div className="mt-1 flex items-center justify-center gap-3 text-xs sm:text-sm font-semibold text-[#2D3F35]">
            <div className="inline-flex items-center gap-1.5">
              <Calendar className="h-4 w-4 text-[#164734] shrink-0" />
              <span>14–16 December 2026</span>
              <span className="sr-only">14, 15 and 16 December 2026</span>
            </div>
            <span className="text-[#8BA395] font-bold">•</span>
            <div className="inline-flex items-center gap-1.5">
              <MapPin className="h-4 w-4 text-[#164734] shrink-0" />
              <span>Hajj House, Chennai, Tamil Nadu, India</span>
            </div>
          </div>
        </div>

        {/* 4. Desktop Centered Volunteer Sign In Card (480px width, subtle translucent background, thin border) */}
        <div className="w-full max-w-[480px] bg-white/75 backdrop-blur-md border border-[#BFCFC6] rounded-xl shadow-xs p-5 xl:p-6 mt-1">
          {currentUser ? (
            /* Logged-In User Profile State */
            <div className="text-center py-2">
              <div className="w-12 h-12 mx-auto rounded-full bg-[#164734] text-white flex items-center justify-center font-extrabold text-lg mb-2 shadow-xs">
                {currentUser.full_name.charAt(0)}
              </div>
              <h3 className="text-base font-bold text-[#1A221E]">{currentUser.full_name}</h3>
              <p className="text-xs text-[#164734] font-semibold mt-0.5">{currentUser.role}</p>
              <p className="text-[11px] text-[#4F6357] mt-0.5">@{currentUser.username} • {currentUser.department}</p>

              <div className="mt-4 flex flex-col gap-2">
                <Button
                  size="lg"
                  onClick={() => navigate(getDashboardRoute())}
                  className="w-full h-10 bg-[#164734] text-white hover:bg-[#103728] font-semibold text-sm flex items-center justify-center gap-2 shadow-xs rounded-lg transition-all"
                >
                  <span>{currentUser.role === 'Admin' ? 'Open Centralized Invitees' : 'Open My Dashboard'}</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => logout()}
                  className="w-full h-8 text-xs text-[#4F6357] hover:text-red-600 hover:bg-red-50 hover:border-red-200 border-[#B5C7BD] bg-white/40"
                >
                  Sign Out
                </Button>
              </div>
            </div>
          ) : (
            /* Volunteer Sign-In Form */
            <div>
              <div className="mb-3 text-center">
                <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#1A221E]">
                  AUTHORIZED VOLUNTEER SIGN IN
                </h3>
                <p className="text-[11px] sm:text-xs text-[#45564D] mt-0.5">
                  Enter your assigned credentials to access the event operations portal.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-3 p-2.5 rounded-lg bg-red-100/90 border border-red-300 text-xs text-red-900 flex items-start gap-2 animate-fade-in"
                >
                  <AlertCircle className="h-4 w-4 shrink-0 text-red-700 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {showForgotNotice && (
                <div
                  role="alert"
                  className="mb-3 p-2.5 rounded-lg bg-white/90 border border-[#AEC0B6] text-xs text-[#164734] flex items-start gap-2 animate-fade-in"
                >
                  <ShieldCheck className="h-4 w-4 shrink-0 text-[#164734] mt-0.5" />
                  <span>
                    To reset volunteer credentials, contact the Chief Event Coordinator at the Central Secretariat desk.
                  </span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-2.5">
                <div>
                  <div className="relative flex items-center bg-white/90 hover:bg-white focus-within:bg-white rounded-lg border border-[#BFCFC6] focus-within:border-[#164734] transition-all">
                    <div className="pl-3 pr-2 text-[#45564D]">
                      <User className="h-4 w-4" />
                    </div>
                    <input
                      type="text"
                      id="desktop-userId"
                      value={userId}
                      onChange={(e) => setUserId(e.target.value)}
                      placeholder="User ID / Volunteer Username"
                      required
                      className="w-full h-10 bg-transparent pr-3 text-sm text-[#1A221E] placeholder:text-[#6E8276] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1 px-1">
                    <label htmlFor="desktop-password" className="text-[11px] font-semibold text-[#45564D]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowForgotNotice(!showForgotNotice)}
                      className="text-[11px] text-[#164734] hover:underline font-semibold"
                    >
                      Forgot password?
                    </button>
                  </div>

                  <div className="relative flex items-center bg-white/90 hover:bg-white focus-within:bg-white rounded-lg border border-[#BFCFC6] focus-within:border-[#164734] transition-all">
                    <div className="pl-3 pr-2 text-[#45564D]">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="desktop-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="w-full h-10 bg-transparent pr-10 text-sm text-[#1A221E] placeholder:text-[#6E8276] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 p-1 text-[#45564D] hover:text-[#1A221E] rounded transition-colors"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-10 mt-1 font-semibold text-sm shadow-xs flex items-center justify-center gap-2 bg-[#164734] hover:bg-[#103728] text-white rounded-lg transition-all"
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

      {/* =========================================================================
          MOBILE VIEW (below 1024px / lg:hidden)
          PRESERVED COMPLETELY UNCHANGED as requested:
          Full-width hero banner, cardless event information & cardless login
          ========================================================================= */}
      <div className="lg:hidden flex flex-col flex-1 w-full">
        {/* Full-Width Hero Banner */}
        <section className="relative z-10 w-full mt-3 sm:mt-4 md:mt-6 overflow-hidden">
          <h1 className="sr-only">
            <span>All India Muslim Personal Law Board</span>
            <span lang="ur" dir="rtl" className="font-urdu">آل انڈیا مسلم پرسنل لا بورڈ</span>
          </h1>

          {/* Full-bleed, edge-to-edge hero image */}
          <div className="w-full">
            <img
              src="/AIMPLB_banner.png"
              alt="All India Muslim Personal Law Board - آل انڈیا مسلم پرسنل لا بورڈ"
              className="w-full h-auto object-contain block select-none pointer-events-none [mask-image:linear-gradient(to_bottom,transparent_0%,black_3px,black_calc(100%-3px),transparent_100%)]"
              loading="eager"
            />
          </div>
        </section>

        {/* Centered Event Information & Cardless Login */}
        <main className="relative z-10 flex-1 w-full max-w-xl mx-auto px-4 py-3 sm:py-5 flex flex-col items-center">
          {/* Event Details: 30th Annual Session, Dates, Venue */}
          <div className="text-center">
            <div className="inline-flex items-center justify-center gap-2">
              <span className="h-px w-5 sm:w-8 bg-[#163A50]/35" />
              <h2 className="text-base sm:text-xl font-bold text-[#1A221E] tracking-tight uppercase flex items-center gap-1.5 font-sans">
                <span className="text-[#164734] font-extrabold">30th</span>
                <span>Annual Session</span>
              </h2>
              <span className="h-px w-5 sm:w-8 bg-[#163A50]/35" />
            </div>

            <div className="mt-1 flex flex-wrap items-center justify-center gap-y-1 gap-x-3 sm:gap-x-4 text-xs sm:text-sm font-semibold text-[#37473E]">
              <div className="inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-[#164734] shrink-0" />
                <span>14–16 December 2026</span>
                <span className="sr-only">14, 15 and 16 December 2026</span>
                <span className="sr-only">14, 15 and 16 December 2026</span>
              </div>
              <span className="text-[#9DB0A4] font-bold text-sm">•</span>
              <div className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#164734] shrink-0" />
                <span>Hajj House, Chennai, Tamil Nadu, India</span>
              </div>
            </div>
          </div>

          {/* Cardless Login Form Directly on Mint Background */}
          <section id="login-section" className="w-full max-w-[400px] sm:max-w-[420px] mx-auto mt-4 sm:mt-5">
            {currentUser ? (
              /* Logged-In User Cardless Profile State */
              <div className="text-center py-3">
                <div className="w-12 h-12 mx-auto rounded-full bg-[#164734] text-white flex items-center justify-center font-extrabold text-lg mb-2 shadow-xs">
                  {currentUser.full_name.charAt(0)}
                </div>
                <h3 className="text-sm sm:text-base font-bold text-[#1A221E]">{currentUser.full_name}</h3>
                <p className="text-xs text-[#164734] font-semibold mt-0.5">{currentUser.role}</p>
                <p className="text-[11px] text-[#4F6357] mt-0.5">@{currentUser.username} • {currentUser.department}</p>

                <div className="mt-4 flex flex-col gap-2">
                  <Button
                    size="lg"
                    onClick={() => navigate(getDashboardRoute())}
                    className="w-full h-11 bg-[#164734] text-white hover:bg-[#103728] font-semibold text-sm flex items-center justify-center gap-2 shadow-xs rounded-lg transition-all"
                  >
                    <span>{currentUser.role === 'Admin' ? 'Open Centralized Invitees' : 'Open My Dashboard'}</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logout()}
                    className="w-full h-9 text-xs text-[#4F6357] hover:text-red-600 hover:bg-red-50 hover:border-red-200 border-[#B5C7BD] bg-white/40"
                  >
                    Sign Out
                  </Button>
                </div>
              </div>
            ) : (
              /* Cardless Volunteer Sign-In Form Directly on the Mint Background */
              <div className="py-1">
                <div className="mb-3.5 text-center">
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#1A221E]">
                    AUTHORIZED VOLUNTEER SIGN IN
                  </h3>
                  <p className="text-[11px] sm:text-xs text-[#45564D] mt-0.5">
                    Enter your assigned credentials to access the event operations portal.
                  </p>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mb-3 p-2.5 rounded-lg bg-red-100/90 border border-red-300 text-xs text-red-900 flex items-start gap-2 animate-fade-in"
                  >
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-700 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {showForgotNotice && (
                  <div
                    role="alert"
                    className="mb-3 p-2.5 rounded-lg bg-white/80 border border-[#AEC0B6] text-xs text-[#164734] flex items-start gap-2 animate-fade-in"
                  >
                    <ShieldCheck className="h-4 w-4 shrink-0 text-[#164734] mt-0.5" />
                    <span>
                      To reset volunteer credentials, contact the Chief Event Coordinator at the Central Secretariat desk.
                    </span>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-3">
                  {/* Minimalist Underline Username Input */}
                  <div>
                    <div className="relative flex items-center bg-white/65 hover:bg-white/80 focus-within:bg-white/95 rounded-t-lg border-b-2 border-[#164734]/35 focus-within:border-[#164734] transition-all">
                      <div className="pl-3 pr-2 text-[#45564D]">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        id="userId"
                        value={userId}
                        onChange={(e) => setUserId(e.target.value)}
                        placeholder="User ID / Volunteer Username"
                        required
                        className="w-full h-11 bg-transparent pr-3 text-sm text-[#1A221E] placeholder:text-[#6E8276] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Minimalist Underline Password Input */}
                  <div>
                    <div className="flex items-center justify-between mb-1 px-1">
                      <label htmlFor="password" className="text-[11px] font-semibold text-[#45564D]">
                        Password
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowForgotNotice(!showForgotNotice)}
                        className="text-[11px] text-[#164734] hover:underline font-semibold"
                      >
                        Forgot password?
                      </button>
                    </div>

                    <div className="relative flex items-center bg-white/65 hover:bg-white/80 focus-within:bg-white/95 rounded-t-lg border-b-2 border-[#164734]/35 focus-within:border-[#164734] transition-all">
                      <div className="pl-3 pr-2 text-[#45564D]">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="w-full h-11 bg-transparent pr-10 text-sm text-[#1A221E] placeholder:text-[#6E8276] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 p-1 text-[#45564D] hover:text-[#1A221E] rounded transition-colors"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Dark Green Sign In Button */}
                  <Button
                    type="submit"
                    size="lg"
                    className="w-full h-11 mt-1 font-semibold text-sm shadow-xs flex items-center justify-center gap-2 bg-[#164734] hover:bg-[#103728] text-white rounded-lg transition-all"
                    isLoading={isLoading}
                  >
                    <span>Sign In to Portal</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </form>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Institutional Footer */}
      <footer className="relative z-10 border-t border-[#BFCFC6] bg-white/50 py-3.5 text-center text-xs text-[#4F6357]">
        <div className="max-w-6xl mx-auto px-4 space-y-0.5">
          <p className="font-bold text-[#1A221E]">All India Muslim Personal Law Board • 30th Annual Session</p>
          <p className="text-[11px]">14–16 December 2026 • Hajj House, Chennai</p>
        </div>
      </footer>
    </div>
  );
};
