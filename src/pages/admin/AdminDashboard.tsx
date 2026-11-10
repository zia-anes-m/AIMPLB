import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  PlaneTakeoff,
  Building2,
  UtensilsCrossed,
  UserCheck,
  Armchair,
  FileSpreadsheet,
  Settings,
  ShieldCheck,
  ArrowRight,
  TrendingUp,
  UserCog,
  History,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import {
  getInvitees,
  getTransportationRecords,
  getAccommodations,
  getFoodRecords,
  getReceptionRecords,
  getMeetingHallRecords,
  getAuditLogs,
} from '@/services/api';
import {
  Invitee,
  TransportationRecord,
  AccommodationRecord,
  FoodRecord,
  ReceptionRecord,
  MeetingHallRecord,
  AuditLog,
} from '@/types';
import { formatDateTime } from '@/lib/utils';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [transport, setTransport] = useState<TransportationRecord[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationRecord[]>([]);
  const [foods, setFoods] = useState<FoodRecord[]>([]);
  const [reception, setReception] = useState<ReceptionRecord[]>([]);
  const [halls, setHalls] = useState<MeetingHallRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [inv, tr, acc, fd, rec, hl, aud] = await Promise.all([
        getInvitees(),
        getTransportationRecords(),
        getAccommodations(),
        getFoodRecords(),
        getReceptionRecords(),
        getMeetingHallRecords(),
        getAuditLogs(),
      ]);

      setInvitees(inv);
      setTransport(tr);
      setAccommodations(acc);
      setFoods(fd);
      setReception(rec);
      setHalls(hl);
      setAuditLogs(aud);
    } catch (err) {
      console.error('Error loading admin overview:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleUpdate = () => loadData();
    window.addEventListener('aimplb_db_update', handleUpdate);
    return () => window.removeEventListener('aimplb_db_update', handleUpdate);
  }, [loadData]);

  // Compute database-derived metrics
  const metrics = useMemo(() => {
    const total = invitees.length;
    const founders = invitees.filter((i) => i.category === 'Founder Members').length;
    const generals = invitees.filter((i) => i.category === 'General Members').length;
    const specials = invitees.filter((i) => i.category === 'Special Invitees').length;

    // Distinct delegate IDs with completed records
    const transInvCount = new Set(transport.map((t) => t.invitee_id)).size;
    const accInvCount = new Set(accommodations.map((a) => a.invitee_id)).size;
    const foodInvCount = new Set(foods.map((f) => f.invitee_id)).size;
    const recInvCount = new Set(
      reception
        .filter((r) => r.reception_status === 'Checked In' || r.reception_status === 'Completed')
        .map((r) => r.invitee_id)
    ).size;
    const hallInvCount = new Set(halls.map((h) => h.invitee_id)).size;

    const calcPct = (count: number) => (total > 0 ? Math.round((count / total) * 100) : 0);

    return {
      total,
      founders,
      generals,
      specials,
      transPct: calcPct(transInvCount),
      accPct: calcPct(accInvCount),
      foodPct: calcPct(foodInvCount),
      recPct: calcPct(recInvCount),
      hallPct: calcPct(hallInvCount),
      transCount: transInvCount,
      accCount: accInvCount,
      foodCount: foodInvCount,
      recCount: recInvCount,
      hallCount: hallInvCount,
    };
  }, [invitees, transport, accommodations, foods, reception, halls]);

  if (isLoading) {
    return <LoadingSkeleton rows={8} />;
  }

  const deptReadiness = [
    {
      title: 'Transportation & Airport Dispatches',
      count: metrics.transCount,
      total: metrics.total,
      pct: metrics.transPct,
      icon: PlaneTakeoff,
      path: '/transportation',
    },
    {
      title: 'Accommodation & Room Allocations',
      count: metrics.accCount,
      total: metrics.total,
      pct: metrics.accPct,
      icon: Building2,
      path: '/accommodation',
    },
    {
      title: 'Food & Catering Banquets',
      count: metrics.foodCount,
      total: metrics.total,
      pct: metrics.foodPct,
      icon: UtensilsCrossed,
      path: '/food',
    },
    {
      title: 'Reception & Delegate Check-In',
      count: metrics.recCount,
      total: metrics.total,
      pct: metrics.recPct,
      icon: UserCheck,
      path: '/reception',
    },
    {
      title: 'Meeting Hall Seating Designated',
      count: metrics.hallCount,
      total: metrics.total,
      pct: metrics.hallPct,
      icon: Armchair,
      path: '/meeting-hall',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Institutional Intro */}
      <PageHeader
        title="Central Secretariat Administration"
        subtitle="Executive control panel for AIMPLB 30th Annual Session operations & volunteer governance"
        badge="Live Session"
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/reports')}
              className="flex items-center gap-1.5 flex-1 sm:flex-initial h-9 sm:h-8"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              <span>Reports</span>
            </Button>

            <Button
              size="sm"
              onClick={() => navigate('/invitees')}
              className="flex items-center gap-1.5 flex-1 sm:flex-initial h-9 sm:h-8 bg-[#164734] hover:bg-[#113829] text-white shadow-sm"
            >
              <Users className="h-3.5 w-3.5" />
              <span>Manage Invitees</span>
            </Button>
          </div>
        }
      />

      {/* Primary Category Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        <StatCard
          title="Total Registered"
          value={metrics.total}
          subtitle="All confirmed delegates"
          icon={Users}
          variant="highlight"
        />
        <StatCard
          title="Founder Members"
          value={metrics.founders}
          subtitle="Board Founders & Dais"
          icon={ShieldCheck}
        />
        <StatCard
          title="General Members"
          value={metrics.generals}
          subtitle="State representatives"
          icon={Users}
        />
        <StatCard
          title="Special Invitees"
          value={metrics.specials}
          subtitle="Legal experts & scholars"
          icon={Armchair}
          variant="special"
        />
      </div>

      {/* Operational Progress Across All 5 Departments */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#E3E7E4] shadow-card-subtle">
        <div className="flex items-center justify-between pb-3 border-b border-[#F4F6F4] mb-4">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#164734] flex items-center gap-2">
              <TrendingUp className="h-4 w-4 shrink-0" />
              <span>Department Readiness & Coordination Progress</span>
            </h2>
            <p className="text-xs text-[#69756F] mt-0.5">
              Live percentage of invitees with confirmed operational arrangements
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {deptReadiness.map((d, i) => {
            const Icon = d.icon;
            return (
              <div key={i} className="group">
                <div className="flex items-center justify-between text-xs mb-1.5 flex-wrap gap-1">
                  <button
                    onClick={() => navigate(d.path)}
                    className="font-semibold text-[#1A221E] group-hover:text-[#164734] flex items-center gap-2 transition-colors min-h-[36px] text-left"
                  >
                    <Icon className="h-4 w-4 text-[#164734] shrink-0" />
                    <span>{d.title}</span>
                  </button>
                  <div className="flex items-center gap-2 shrink-0 ml-auto">
                    <span className="text-[#69756F] text-[11px] sm:text-xs">
                      {d.count} of {d.total}
                    </span>
                    <span className="font-mono font-bold text-xs text-[#164734] bg-[#E8F1EC] px-2 py-0.5 rounded-md">
                      {d.pct}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-[#FAF9F6] border border-[#E3E7E4] h-2.5 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#164734] to-emerald-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Admin Module Shortcuts */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => navigate('/admin/volunteers')}
          className="p-5 rounded-2xl border border-[#E3E7E4] bg-white hover:border-[#164734]/40 hover:shadow-card-hover transition-all cursor-pointer shadow-card-subtle group"
        >
          <div className="p-2.5 rounded-xl bg-[#E8F1EC] text-[#164734] w-fit mb-3 group-hover:scale-105 transition-transform">
            <UserCog className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-[#1A221E] group-hover:text-[#164734] transition-colors">
            Volunteer Management
          </h3>
          <p className="text-xs text-[#69756F] mt-1 leading-relaxed">
            Create volunteer accounts, assign departmental roles, toggle active status, or reset credentials.
          </p>
          <div className="mt-3 text-xs font-semibold text-[#164734] flex items-center gap-1">
            <span>Manage accounts</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => navigate('/admin/reports')}
          className="p-5 rounded-2xl border border-[#E3E7E4] bg-white hover:border-[#164734]/40 hover:shadow-card-hover transition-all cursor-pointer shadow-card-subtle group"
        >
          <div className="p-2.5 rounded-xl bg-[#E8F1EC] text-[#164734] w-fit mb-3 group-hover:scale-105 transition-transform">
            <FileSpreadsheet className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-[#1A221E] group-hover:text-[#164734] transition-colors">
            Official Reports & Exports
          </h3>
          <p className="text-xs text-[#69756F] mt-1 leading-relaxed">
            Generate printable and CSV exports for flights, hotels, catering, and auditorium seating charts.
          </p>
          <div className="mt-3 text-xs font-semibold text-[#164734] flex items-center gap-1">
            <span>View reports</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        <div
          onClick={() => navigate('/admin/settings')}
          className="p-5 rounded-2xl border border-[#E3E7E4] bg-white hover:border-[#164734]/40 hover:shadow-card-hover transition-all cursor-pointer shadow-card-subtle group"
        >
          <div className="p-2.5 rounded-xl bg-[#E8F1EC] text-[#164734] w-fit mb-3 group-hover:scale-105 transition-transform">
            <Settings className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-[#1A221E] group-hover:text-[#164734] transition-colors">
            System Configuration
          </h3>
          <p className="text-xs text-[#69756F] mt-1 leading-relaxed">
            Configure partner hotel options, transport drop points, caterers, and auditorium halls.
          </p>
          <div className="mt-3 text-xs font-semibold text-[#164734] flex items-center gap-1">
            <span>Adjust settings</span>
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      </div>

      {/* Recent System Audit Events */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E3E7E4] shadow-card-subtle">
        <div className="flex items-center justify-between pb-3 border-b border-[#F4F6F4] mb-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#164734] flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            <span>Recent System Audit Events</span>
          </h2>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => navigate('/admin/audit-logs')}
            className="text-xs text-[#164734] hover:bg-[#E8F1EC]"
          >
            <History className="h-3.5 w-3.5 mr-1" />
            <span>View Full Audit Trail</span>
          </Button>
        </div>

        <div className="divide-y divide-[#F4F6F4] text-xs">
          {auditLogs.slice(0, 5).map((log) => {
            const actionColor =
              log.action === 'INSERT'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : log.action === 'DELETE'
                ? 'bg-red-50 text-red-800 border-red-200'
                : 'bg-blue-50 text-blue-800 border-blue-200';

            return (
              <div key={log.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-[10px] uppercase border px-2 py-0.5 rounded-md ${actionColor}`}>
                    {log.action}
                  </span>
                  <span className="font-semibold text-[#1A221E]">{log.user_name}</span>
                  <span className="text-[#69756F]">modified table {log.table_name}</span>
                </div>
                <span className="text-[11px] text-[#69756F] font-mono sm:text-right">
                  {formatDateTime(log.created_at)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
