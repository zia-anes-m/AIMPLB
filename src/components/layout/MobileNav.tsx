import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Menu,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';

interface MobileNavProps {
  onOpenMenu: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ onOpenMenu }) => {
  const { currentUser, isAdmin } = useAuth();

  const getDashboardRoute = () => {
    if (isAdmin) return '/admin/dashboard';
    switch (currentUser?.role) {
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
  };

  const getMyDeptRoute = () => {
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
        return '/transportation';
    }
  };

  const navClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'flex flex-col items-center justify-center flex-1 py-1.5 px-1 text-[10px] font-semibold transition-colors duration-150',
      isActive
        ? 'text-[#164734]'
        : 'text-[#69756F] hover:text-[#1A221E]'
    );

  return (
    <nav
      aria-label="Mobile Navigation"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#E3E7E4] shadow-dropdown safe-bottom"
    >
      <div className="flex items-center justify-around h-14 max-w-lg mx-auto">
        {/* Dashboard */}
        <NavLink to={getDashboardRoute()} className={navClass}>
          <LayoutDashboard className="h-5 w-5 mb-0.5" />
          <span>Dashboard</span>
        </NavLink>

        {/* Invitees */}
        <NavLink to="/invitees" className={navClass}>
          <Users className="h-5 w-5 mb-0.5" />
          <span>Invitees</span>
        </NavLink>

        {/* Department Module */}
        <NavLink to={getMyDeptRoute()} className={navClass}>
          <Briefcase className="h-5 w-5 mb-0.5" />
          <span>{currentUser?.role === 'Admin' ? 'Depts' : 'My Dept'}</span>
        </NavLink>

        {/* Menu Drawer Toggle */}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center flex-1 py-1.5 px-1 text-[10px] font-semibold text-[#69756F] hover:text-[#1A221E] transition-colors"
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5 mb-0.5" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
};

