import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  PlaneTakeoff,
  Building2,
  UtensilsCrossed,
  UserCheck,
  Armchair,
  Shield,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, login, getDashboardRoute, isLoading: authLoading } = useAuth();

  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showForgotNotice, setShowForgotNotice] = useState(false);

  // If already authenticated, redirect straight to user's assigned dashboard
  useEffect(() => {
    if (currentUser && !authLoading) {
      navigate(getDashboardRoute(currentUser.role), { replace: true });
    }
  }, [currentUser, authLoading, navigate, getDashboardRoute]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return; // Prevent concurrent submissions
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
        // Navigate immediately using the returned user profile role on the very first click
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

  const handleQuickFill = (roleUsername: string) => {
    setUserId(roleUsername);
    setPassword('Aim2026!');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center py-8 sm:py-16 px-4 sm:px-6 lg:px-8 selection:bg-[#E8F1EC] selection:text-[#164734]">
      {/* Branding Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <img
          src="/new_logo.png"
          alt="AIMPLB Logo"
          className="mx-auto h-16 sm:h-20 w-auto object-contain mb-3.5 drop-shadow-xs"
        />
        <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-[#164734] uppercase">
          All India Muslim Personal Law Board
        </h1>
        <p className="mt-1 text-xs font-semibold text-[#1A221E]">
          30th Annual Session • Volunteer Coordination Portal
        </p>
      </div>

      <div className="mt-6 sm:mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 sm:py-9 px-4 sm:px-10 shadow-dropdown border border-[#E3E7E4] rounded-2xl">
          <div className="mb-6 pb-4 border-b border-[#F4F6F4] text-center">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#1A221E]">
              Authorized Volunteer Sign In
            </h2>
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

          {/* Quick Access Preset Accounts Chips */}
          <div className="mt-6 pt-5 border-t border-[#F4F6F4]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#69756F] text-center mb-2.5">
              Fast Access (Select Role to Test)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => handleQuickFill('admin')}
                className="p-2 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl text-left hover:bg-[#E8F1EC] hover:border-[#C5DEC8] transition-all flex items-center gap-2"
              >
                <div className="p-1 rounded bg-[#164734] text-white shrink-0">
                  <Shield className="h-3 w-3" />
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="font-bold text-[#164734] text-[11px] truncate">Admin</div>
                  <div className="text-[10px] text-[#69756F] truncate">admin</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('transport_team')}
                className="p-2 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl text-left hover:bg-[#E8F1EC] hover:border-[#C5DEC8] transition-all flex items-center gap-2"
              >
                <div className="p-1 rounded bg-[#164734] text-white shrink-0">
                  <PlaneTakeoff className="h-3 w-3" />
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="font-bold text-[#164734] text-[11px] truncate">Transport</div>
                  <div className="text-[10px] text-[#69756F] truncate">transport_team</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('accommodation_team')}
                className="p-2 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl text-left hover:bg-[#E8F1EC] hover:border-[#C5DEC8] transition-all flex items-center gap-2"
              >
                <div className="p-1 rounded bg-[#164734] text-white shrink-0">
                  <Building2 className="h-3 w-3" />
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="font-bold text-[#164734] text-[11px] truncate">Accommodation</div>
                  <div className="text-[10px] text-[#69756F] truncate">accommodation_team</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('food_team')}
                className="p-2 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl text-left hover:bg-[#E8F1EC] hover:border-[#C5DEC8] transition-all flex items-center gap-2"
              >
                <div className="p-1 rounded bg-[#164734] text-white shrink-0">
                  <UtensilsCrossed className="h-3 w-3" />
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="font-bold text-[#164734] text-[11px] truncate">Food Team</div>
                  <div className="text-[10px] text-[#69756F] truncate">food_team</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('reception_team')}
                className="p-2 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl text-left hover:bg-[#E8F1EC] hover:border-[#C5DEC8] transition-all flex items-center gap-2"
              >
                <div className="p-1 rounded bg-[#164734] text-white shrink-0">
                  <UserCheck className="h-3 w-3" />
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="font-bold text-[#164734] text-[11px] truncate">Reception</div>
                  <div className="text-[10px] text-[#69756F] truncate">reception_team</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('hall_team')}
                className="p-2 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl text-left hover:bg-[#E8F1EC] hover:border-[#C5DEC8] transition-all flex items-center gap-2"
              >
                <div className="p-1 rounded bg-[#164734] text-white shrink-0">
                  <Armchair className="h-3 w-3" />
                </div>
                <div className="overflow-hidden min-w-0">
                  <div className="font-bold text-[#164734] text-[11px] truncate">Meeting Hall</div>
                  <div className="text-[10px] text-[#69756F] truncate">hall_team</div>
                </div>
              </button>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-xs text-[#69756F]">
          Hajj House, Chennai • 14, 15, 16 December 2026
        </p>
      </div>
    </div>
  );
};
