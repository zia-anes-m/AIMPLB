import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  Users,
  PlaneTakeoff,
  Building2,
  UtensilsCrossed,
  UserCheck,
  Armchair,
  LayoutDashboard,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  UserCog,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Shield,
  X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { UserRole } from '@/types';

interface SidebarProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onCloseMobile?: () => void;
  isMobile?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isCollapsed = false,
  onToggleCollapse,
  onCloseMobile,
  isMobile = false,
}) => {
  const { currentUser, logout, isAdmin, switchRole } = useAuth();

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      'group relative flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 select-none',
      isActive
        ? 'bg-[#164734] text-white shadow-xs font-semibold'
        : 'text-[#37433D] hover:bg-[#E8F1EC] hover:text-[#164734]'
    );

  const demoRoles: UserRole[] = [
    'Admin',
    'Transportation Team',
    'Accommodation Team',
    'Food Team',
    'Reception Team',
    'Meeting Hall Team',
  ];

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

  return (
    <aside
      className={cn(
        'bg-white border-r border-[#E3E7E4] flex flex-col h-full shrink-0 transition-all duration-300 relative select-none',
        isMobile ? 'w-72 max-w-[85vw]' : isCollapsed ? 'w-[70px]' : 'w-64'
      )}
    >
      {/* Brand & Event Header */}
      <div className="p-3.5 border-b border-[#F4F6F4] flex items-center justify-between gap-3 h-16 shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <img
            src="/new_logo.png"
            alt="AIMPLB Logo"
            className="h-9 w-9 object-contain rounded-md shrink-0"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          {(!isCollapsed || isMobile) && (
            <div className="overflow-hidden min-w-0">
              <h1 className="text-xs font-extrabold uppercase tracking-wider text-[#164734] leading-tight truncate">
                AIMPLB
              </h1>
              <p className="text-[11px] font-semibold text-[#1A221E] truncate">30th Annual Session</p>
              <p className="text-[10px] text-[#69756F] truncate">Chennai • Dec 2026</p>
            </div>
          )}
        </div>

        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-[#69756F] hover:text-[#1A221E] hover:bg-[#F4F6F4] rounded-lg transition-colors"
            aria-label="Close navigation drawer"
          >
            <X className="h-5 w-5" />
          </button>
        )}

        {/* Desktop collapse button */}
        {!isMobile && onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="hidden lg:flex p-1 rounded-md text-[#69756F] hover:bg-[#F4F6F4] hover:text-[#164734] transition-colors"
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto p-2.5 space-y-1 overscroll-contain">
        {(!isCollapsed || isMobile) && (
          <div className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#69756F]">
            Overview
          </div>
        )}

        {/* Dashboard link */}
        <NavLink
          to={getDashboardRoute()}
          className={navLinkClass}
          onClick={onCloseMobile}
          title={isCollapsed ? (isAdmin ? 'Executive Dashboard' : 'My Dashboard') : undefined}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          {(!isCollapsed || isMobile) && (
            <span className="truncate">{isAdmin ? 'Executive Dashboard' : 'My Dashboard'}</span>
          )}
        </NavLink>

        {/* Centralized Invitees Database */}
        <NavLink
          to="/invitees"
          className={navLinkClass}
          onClick={onCloseMobile}
          title={isCollapsed ? 'Centralized Invitees' : undefined}
        >
          <Users className="h-4 w-4 shrink-0" />
          {(!isCollapsed || isMobile) && (
            <span className="truncate">Centralized Invitees</span>
          )}
        </NavLink>

        {(!isCollapsed || isMobile) && (
          <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#69756F]">
            Departments
          </div>
        )}

        <NavLink
          to="/transportation"
          className={navLinkClass}
          onClick={onCloseMobile}
          title={isCollapsed ? 'Transportation' : undefined}
        >
          <PlaneTakeoff className="h-4 w-4 shrink-0" />
          {(!isCollapsed || isMobile) && <span className="truncate">Transportation</span>}
        </NavLink>

        <NavLink
          to="/accommodation"
          className={navLinkClass}
          onClick={onCloseMobile}
          title={isCollapsed ? 'Accommodation' : undefined}
        >
          <Building2 className="h-4 w-4 shrink-0" />
          {(!isCollapsed || isMobile) && <span className="truncate">Accommodation</span>}
        </NavLink>

        <NavLink
          to="/food"
          className={navLinkClass}
          onClick={onCloseMobile}
          title={isCollapsed ? 'Food & Catering' : undefined}
        >
          <UtensilsCrossed className="h-4 w-4 shrink-0" />
          {(!isCollapsed || isMobile) && <span className="truncate">Food & Catering</span>}
        </NavLink>

        <NavLink
          to="/reception"
          className={navLinkClass}
          onClick={onCloseMobile}
          title={isCollapsed ? 'Reception & Desk' : undefined}
        >
          <UserCheck className="h-4 w-4 shrink-0" />
          {(!isCollapsed || isMobile) && <span className="truncate">Reception & Desk</span>}
        </NavLink>

        <NavLink
          to="/meeting-hall"
          className={navLinkClass}
          onClick={onCloseMobile}
          title={isCollapsed ? 'Meeting Hall & Seating' : undefined}
        >
          <Armchair className="h-4 w-4 shrink-0" />
          {(!isCollapsed || isMobile) && <span className="truncate">Meeting Hall & Seating</span>}
        </NavLink>

        {/* Admin Controls */}
        {isAdmin && (
          <>
            {(!isCollapsed || isMobile) && (
              <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#69756F]">
                Secretariat Admin
              </div>
            )}

            <NavLink
              to="/admin/volunteers"
              className={navLinkClass}
              onClick={onCloseMobile}
              title={isCollapsed ? 'Volunteer Management' : undefined}
            >
              <UserCog className="h-4 w-4 shrink-0" />
              {(!isCollapsed || isMobile) && <span className="truncate">Volunteer Governance</span>}
            </NavLink>

            <NavLink
              to="/admin/reports"
              className={navLinkClass}
              onClick={onCloseMobile}
              title={isCollapsed ? 'Official Reports' : undefined}
            >
              <FileSpreadsheet className="h-4 w-4 shrink-0" />
              {(!isCollapsed || isMobile) && <span className="truncate">Official Reports</span>}
            </NavLink>

            <NavLink
              to="/admin/audit-logs"
              className={navLinkClass}
              onClick={onCloseMobile}
              title={isCollapsed ? 'Audit Trail' : undefined}
            >
              <ShieldCheck className="h-4 w-4 shrink-0" />
              {(!isCollapsed || isMobile) && <span className="truncate">Audit Trail</span>}
            </NavLink>

            <NavLink
              to="/admin/settings"
              className={navLinkClass}
              onClick={onCloseMobile}
              title={isCollapsed ? 'System Settings' : undefined}
            >
              <Settings className="h-4 w-4 shrink-0" />
              {(!isCollapsed || isMobile) && <span className="truncate">System Settings</span>}
            </NavLink>
          </>
        )}
      </nav>

      {/* Role Simulation Switcher (Clean, compact) */}
      {(!isCollapsed || isMobile) && (
        <div className="p-3 border-t border-[#F4F6F4] bg-[#FAF9F6]">
          <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-wider text-[#69756F]">
            <Shield className="h-3 w-3 text-[#164734]" />
            <span>Simulate Role (Demo)</span>
          </div>
          <select
            value={currentUser?.role || ''}
            onChange={(e) => switchRole(e.target.value as UserRole)}
            className="w-full text-xs bg-white border border-[#E3E7E4] rounded-lg px-2.5 py-1.5 text-[#1A221E] shadow-card-subtle focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734] outline-none"
          >
            {demoRoles.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Logged in User Bar & Logout */}
      <div className="p-3 border-t border-[#F4F6F4] flex items-center justify-between bg-white shrink-0">
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="h-8 w-8 rounded-full bg-[#164734] text-white flex items-center justify-center font-bold text-xs uppercase shrink-0">
            {currentUser?.full_name?.charAt(0) || 'U'}
          </div>
          {(!isCollapsed || isMobile) && (
            <div className="overflow-hidden min-w-0">
              <p className="text-xs font-semibold text-[#1A221E] truncate">
                {currentUser?.full_name?.split('(')[0].trim()}
              </p>
              <p className="text-[10px] text-[#164734] font-medium truncate">
                {currentUser?.role}
              </p>
            </div>
          )}
        </div>
        <button
          onClick={logout}
          title="Sign out"
          className="p-1.5 text-[#69756F] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
          aria-label="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
};
