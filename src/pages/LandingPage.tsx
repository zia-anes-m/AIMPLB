import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, ShieldCheck, ArrowRight, Lock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { Logo } from '@/components/common/Logo';

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
            <Logo
              size="lg"
              className="h-12 sm:h-14 w-auto object-contain shrink-0"
              alt="AIMPLB Official Emblem"
            />
            <div className="border-l border-[#E3E7E4] pl-3 sm:pl-4 overflow-hidden">
              <span className="block text-xs sm:text-sm font-extrabold tracking-widest text-[#164734] uppercase font-sans truncate">
                All India Muslim Personal Law Board
              </span>
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
      <main className="flex-1 max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col items-center text-center">
        {/* Subtle Institutional Tag */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#E8F1EC] border border-[#C5DEC8] text-[#164734] text-xs font-semibold uppercase tracking-wider mb-6 sm:mb-8 shadow-xs">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Official Event Operations Platform</span>
        </div>

        {/* Primary H1: Organization Name in both Urdu and English */}
        <h1 className="w-full max-w-4xl mx-auto text-center">
          {/* Urdu Title with Proper RTL and Calligraphic Font */}
          <span
            dir="rtl"
            lang="ur"
            className="block font-urdu text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-bold text-[#164734] leading-[2.2] sm:leading-[2.4] pb-2 sm:pb-3 mb-5 sm:mb-7 select-none"
          >
            آل انڈیا مسلم پرسنل لا بورڈ
          </span>

          {/* English Title */}
          <span className="block text-xl xs:text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#164734] tracking-tight uppercase leading-tight sm:leading-snug">
            All India Muslim Personal Law Board
          </span>
        </h1>

        {/* Subtitle / Secondary Heading (H2): 30th Annual Session */}
        <div className="mt-4 sm:mt-5 flex items-center justify-center gap-3">
          <span className="h-px w-6 sm:w-12 bg-gradient-to-r from-transparent to-[#164734]/30" />
          <h2 className="text-lg xs:text-xl sm:text-2xl md:text-3xl font-extrabold text-[#1A221E] tracking-tight flex items-center gap-2">
            <span className="text-[#164734]">30th</span>
            <span>Annual Session</span>
          </h2>
          <span className="h-px w-6 sm:w-12 bg-gradient-to-l from-transparent to-[#164734]/30" />
        </div>

        {/* Event Date and Venue as Clean, Readable Text */}
        <div className="mt-4 sm:mt-5 flex flex-wrap items-center justify-center gap-y-2 gap-x-3 sm:gap-x-6 text-xs sm:text-sm md:text-base font-semibold text-[#2C3832]">
          <div className="inline-flex items-center gap-2">
            <Calendar className="h-4 w-4 text-[#164734] shrink-0" />
            <span>14, 15 and 16 December 2026</span>
          </div>

          <span className="hidden sm:inline text-[#C5DEC8] font-bold text-base">•</span>

          <div className="inline-flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#164734] shrink-0" />
            <span>Hajj House, Chennai, Tamil Nadu, India</span>
          </div>
        </div>

        {/* Supporting Portal Description */}
        <div className="mt-6 sm:mt-8 max-w-2xl">
          <p className="text-base sm:text-lg font-bold text-[#1A221E]">
            Event Coordination and Volunteer Management Portal
          </p>
          <p className="mt-2 text-xs sm:text-sm md:text-base text-[#69756F] leading-relaxed max-w-xl mx-auto">
            A centralized platform for coordinating invitee transportation, accommodation, food arrangements,
            and event operations.
          </p>
        </div>

        {/* Action Button */}
        <div className="mt-7 sm:mt-9 flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Button
            size="lg"
            onClick={handleAction}
            className="w-full sm:w-auto px-8 bg-[#164734] text-white hover:bg-[#103728] font-semibold text-sm flex items-center justify-center gap-2 shadow-sm"
          >
            <span>{currentUser ? 'Proceed to Operations Dashboard' : 'Volunteer Login'}</span>
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>

        {/* Operational Highlights Pill */}
        <div className="mt-10 sm:mt-12 flex flex-wrap items-center justify-center gap-3 text-xs text-[#69756F]">
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
