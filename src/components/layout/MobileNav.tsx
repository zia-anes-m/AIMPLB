import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  onOpenMenu: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenMenu }) => {
  const { currentUser, isAdmin } = useAuth();
  const location = useLocation();
  const currentPath = location.pathname;

  const getDashboardRoute = () => {
    if (isAdmin) return '/admin';
    switch (currentUser?.role) {
      case 'Transportation Team':
        return '/transportation';
      case 'Accommodation Team':
        return '/accommodation';
      case 'Food Team':
        return '/food';
      case 'Reception Team':
        return '/reception';
      case 'Meeting Hall Team':
        return '/meeting-hall';
      default:
        return '/';
    }
  };

  const isInviteesActive = currentPath === '/invitees' || currentPath.startsWith('/invitees/');

  const isDashboardActive = isAdmin
    ? currentPath === '/admin' || currentPath === '/admin/dashboard'
    : currentPath === getDashboardRoute() ||
      currentPath === `${getDashboardRoute()}/dashboard` ||
      currentPath.startsWith(`${getDashboardRoute()}/`);

  const getNavClass = (isActive: boolean) =>
    cn(
      'flex flex-col items-center justify-center flex-1 py-1.5 px-1 min-h-[48px] text-[10px] font-semibold transition-all duration-150 select-none relative',
      isActive
        ? 'text-[#164734] font-bold'
        : 'text-[#69756F] hover:text-[#1A221E]'
    );

  const inviteesButton = (
    <NavLink to="/invitees" className={getNavClass(isInviteesActive)}>
      {isInviteesActive && (
        <span className="absolute top-0 w-8 h-0.5 bg-[#164734] rounded-full" />
      )}
      <Users className={cn('h-5 w-5 mb-0.5', isInviteesActive && 'text-[#164734] scale-105')} />
      <span>Invitees</span>
    </NavLink>
  );

  const dashboardButton = (
    <NavLink to={getDashboardRoute()} className={getNavClass(isDashboardActive)}>
      {isDashboardActive && (
        <span className="absolute top-0 w-8 h-0.5 bg-[#164734] rounded-full" />
      )}
      <LayoutDashboard className={cn('h-5 w-5 mb-0.5', isDashboardActive && 'text-[#164734] scale-105')} />
      <span>Dashboard</span>
    </NavLink>
  );

  const moreButton = (
    <button
      type="button"
      onClick={onOpenMenu}
      className="flex flex-col items-center justify-center flex-1 py-1.5 px-1 min-h-[48px] text-[10px] font-semibold text-[#69756F] hover:text-[#1A221E] active:text-[#164734] transition-colors select-none"
      aria-label="Open navigation menu"
    >
      <Menu className="h-5 w-5 mb-0.5" />
      <span>More</span>
    </button>
  );

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E3E7E4] shadow-dropdown pb-[max(0.25rem,env(safe-area-inset-bottom))]"
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto px-1">
        {isAdmin ? (
          <>
            {inviteesButton}
            {dashboardButton}
            {moreButton}
          </>
        ) : (
          <>
            {dashboardButton}
            {inviteesButton}
            {moreButton}
          </>
        )}
      </div>
    </nav>
  );
};
