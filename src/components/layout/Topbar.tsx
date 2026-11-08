import React from 'react';
import { Menu, MapPin, Calendar, Database, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { isSupabaseConfigured } from '@/lib/supabase';

interface TopbarProps {
  onToggleMobileMenu: () => void;
  isSidebarCollapsed?: boolean;
  onToggleSidebarCollapse?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({
  onToggleMobileMenu,
  isSidebarCollapsed = false,
  onToggleSidebarCollapse,
}) => {
  const { currentUser } = useAuth();

  return (
    <header className="h-14 sm:h-16 bg-white/95 backdrop-blur-md border-b border-[#E3E7E4] px-3 sm:px-5 flex items-center justify-between shrink-0 sticky top-0 z-30 select-none">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 text-[#1A221E] hover:bg-[#F4F6F4] rounded-lg transition-colors shrink-0"
          aria-label="Open mobile menu"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Desktop Sidebar Toggle */}
        {onToggleSidebarCollapse && (
          <button
            onClick={onToggleSidebarCollapse}
            className="hidden lg:flex p-2 text-[#69756F] hover:text-[#164734] hover:bg-[#F4F6F4] rounded-lg transition-colors shrink-0"
            title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isSidebarCollapsed ? (
              <PanelLeftOpen className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        )}

        {/* Event Meta Pill for Tablet/Desktop */}
        <div className="hidden md:flex items-center gap-3 text-xs text-[#69756F] overflow-hidden">
          <span className="flex items-center gap-1.5 font-medium text-[#1A221E] truncate">
            <MapPin className="h-3.5 w-3.5 text-[#164734] shrink-0" />
            Hajj House, Chennai
          </span>
          <span className="text-[#E3E7E4]">•</span>
          <span className="flex items-center gap-1.5 font-medium text-[#1A221E] shrink-0">
            <Calendar className="h-3.5 w-3.5 text-[#164734] shrink-0" />
            14–16 Dec 2026
          </span>
        </div>

        {/* Mobile Brand Title */}
        <div className="md:hidden flex items-center gap-2 overflow-hidden">
          <span className="text-xs font-bold uppercase tracking-wider text-[#164734] truncate">
            AIMPLB 30th Session
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Database Status Indicator */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
            isSupabaseConfigured
              ? 'bg-[#E8F1EC] text-[#164734] border-[#C5DEC8]'
              : 'bg-[#FFFBEB] text-[#936E22] border-[#FDE68A]'
          }`}
          title={
            isSupabaseConfigured
              ? 'Connected to live Supabase PostgreSQL'
              : 'Interactive Store: configure Supabase in .env for live cloud sync'
          }
        >
          <span className="flex h-2 w-2 items-center justify-center">
            <span
              className={`inline-flex rounded-full h-2 w-2 ${
                isSupabaseConfigured ? 'bg-emerald-600' : 'bg-amber-500'
              }`}
            />
          </span>
          <Database className="h-3 w-3 shrink-0 hidden sm:inline" />
          <span className="text-[10px] sm:text-[11px] font-semibold">
            {isSupabaseConfigured ? 'Supabase Live' : 'Demo Store'}
          </span>
        </div>

        {/* User Pill */}
        <div className="flex items-center gap-2 pl-2 border-l border-[#E3E7E4]">
          <div className="h-8 w-8 rounded-full bg-[#164734] text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs shrink-0">
            {currentUser?.full_name?.charAt(0) || 'U'}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-[#1A221E] leading-tight truncate max-w-[130px]">
              {currentUser?.full_name?.split('(')[0].trim()}
            </p>
            <p className="text-[10px] text-[#69756F] leading-tight truncate max-w-[130px]">
              {currentUser?.department}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
};
