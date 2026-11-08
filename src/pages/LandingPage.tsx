import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, Building, ShieldCheck, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export const LandingPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, getDashboardRoute } = useAuth();

  const handleAction = () => {
    if (currentUser) {
      navigate(getDashboardRoute());
    } else {
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-between text-[#1A221E] selection:bg-[#E8F1EC] selection:text-[#164734]">
      {/* Institutional Top Header */}
      <header className="border-b border-[#E3E7E4] bg-white/95 backdrop-blur-md sticky top-0 z-30 shadow-card-subtle">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 sm:h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
            <img
              src="/logo.png"
              alt="AIMPLB Official Emblem"
              className="h-12 sm:h-14 w-auto object-contain shrink-0"
            />
            <div className="border-l border-[#E3E7E4] pl-3 sm:pl-4 overflow-hidden">
              <h1 className="text-xs sm:text-sm font-extrabold tracking-widest text-[#164734] uppercase font-sans truncate">
                All India Muslim Personal Law Board
              </h1>
              <p className="text-[10px] sm:text-[11px] text-[#69756F] tracking-wider font-semibold truncate">
                30th Annual Session • Central Secretariat
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAction}
            className="flex items-center gap-2 border-[#164734] text-[#164734] hover:bg-[#E8F1EC] shrink-0 font-semibold text-xs"
          >
            <Lock className="h-3.5 w-3.5" />
            <span className="hidden xs:inline">{currentUser ? 'Open Dashboard' : 'Volunteer Login'}</span>
            <span className="xs:hidden">{currentUser ? 'Portal' : 'Login'}</span>
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-20 flex flex-col items-center text-center">
        {/* Subtle Institutional Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8F1EC] border border-[#C5DEC8] text-[#164734] text-xs font-semibold uppercase tracking-wider mb-6 sm:mb-8 shadow-xs">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Official Event Operations Platform</span>
        </div>

        {/* Main Session Title */}
        <h2 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold text-[#164734] tracking-tight leading-tight">
          30th Annual Session
        </h2>

        {/* Date and Venue Badge */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2 text-sm sm:text-base font-semibold text-[#1A221E]">
          <span className="font-bold">14</span>
          <span className="text-[#AAB3AE]">•</span>
          <span className="font-bold">15</span>
          <span className="text-[#AAB3AE]">•</span>
          <span className="font-bold">16 December 2026</span>
          <span className="text-[#E3E7E4] hidden sm:inline">|</span>
          <span className="text-[#164734] font-bold">Hajj House, Chennai</span>
        </div>

        {/* Supporting Portal Description */}
        <div className="mt-6 sm:mt-8 max-w-2xl">
          <p className="text-base sm:text-lg font-bold text-[#1A221E]">
            Event Coordination and Volunteer Management Portal
          </p>
          <p className="mt-2 text-xs sm:text-base text-[#69756F] leading-relaxed max-w-xl mx-auto">
            A centralized platform for coordinating invitee transportation, accommodation, food arrangements,
            and event operations.
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Button
            size="lg"
            onClick={handleAction}
            className="w-full sm:w-auto px-8 bg-[#164734] text-white hover:bg-[#103728] font-semibold text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            <span>{currentUser ? 'Proceed to Operations Dashboard' : 'Volunteer Login'}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Three Verified Event Details Cards */}
        <div className="mt-12 sm:mt-16 w-full grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 text-left">
          <div className="p-5 rounded-2xl border border-[#E3E7E4] bg-white shadow-card-subtle hover:shadow-card-hover transition-all duration-200">
            <div className="p-2.5 rounded-xl bg-[#F2F7F4] text-[#164734] w-fit mb-3 border border-[#C5DEC8]/50">
              <Calendar className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#69756F]">Session Dates</p>
            <p className="text-base font-bold text-[#1A221E] mt-1">14–16 December 2026</p>
            <p className="text-xs text-[#69756F] mt-0.5">Monday to Wednesday</p>
          </div>

          <div className="p-5 rounded-2xl border border-[#E3E7E4] bg-white shadow-card-subtle hover:shadow-card-hover transition-all duration-200">
            <div className="p-2.5 rounded-xl bg-[#F2F7F4] text-[#164734] w-fit mb-3 border border-[#C5DEC8]/50">
              <MapPin className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#69756F]">Official Venue</p>
            <p className="text-base font-bold text-[#1A221E] mt-1">Hajj House, Chennai</p>
            <p className="text-xs text-[#69756F] mt-0.5">Tamil Nadu, India</p>
          </div>

          <div className="p-5 rounded-2xl border border-[#E3E7E4] bg-white shadow-card-subtle hover:shadow-card-hover transition-all duration-200">
            <div className="p-2.5 rounded-xl bg-[#F2F7F4] text-[#164734] w-fit mb-3 border border-[#C5DEC8]/50">
              <Building className="h-5 w-5" />
            </div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#69756F]">Organization</p>
            <p className="text-base font-bold text-[#1A221E] mt-1">AIMPLB</p>
            <p className="text-xs text-[#69756F] mt-0.5">All India Muslim Personal Law Board</p>
          </div>
        </div>

        {/* Operational Highlights Pill */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-xs text-[#69756F]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#164734]" /> Real-time Logistics
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#164734]" /> 5 Operations Teams
          </span>
          <span>•</span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-[#164734]" /> Role-based Security
          </span>
        </div>
      </main>

      {/* Institutional Footer */}
      <footer className="border-t border-[#E3E7E4] bg-white py-8 text-center text-xs text-[#69756F]">
        <div className="max-w-6xl mx-auto px-4 space-y-1">
          <p className="font-bold text-[#1A221E]">AIMPLB 30th Annual Session</p>
          <p>14–16 December 2026 • Hajj House, Chennai</p>
          <p className="text-[11px] text-[#AAB3AE] pt-1">Volunteer Coordination Portal • Authorized Access Only</p>
        </div>
      </footer>
    </div>
  );
};
