import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  Clock,
  CheckCircle2,
  Eye,
  Download,
  LayoutGrid,
  List,
  Calendar,
  LogOut,
  LogIn,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { MobileDataCard } from '@/components/common/MobileDataCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { SearchInput } from '@/components/common/SearchInput';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { Invitee, EventAttendanceRecord } from '@/types';
import {
  getInvitees,
  getEventAttendanceRecords,
  recordEventEntry,
  recordEventExit,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { exportToCSV } from '@/lib/exportUtils';
import { formatDateTime, formatDate } from '@/lib/utils';

export const ReceptionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<EventAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'auto' | 'cards' | 'table'>('auto');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'inside' | 'outside'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('2026-12-14');

  const loadData = useCallback(async () => {
    try {
      const [invs, atts] = await Promise.all([
        getInvitees(),
        getEventAttendanceRecords(),
      ]);
      setInvitees(invs);
      setAttendanceRecords(atts);
    } catch (err) {
      console.error('Error loading gate reception data:', err);
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

  // Compute Active Presence map: Invitee ID -> active session (if status === 'IN' and !exit_time)
  const activeSessionMap = useMemo(() => {
    const map = new Map<string, EventAttendanceRecord>();
    for (const att of attendanceRecords) {
      if (att.status === 'IN' && !att.exit_time && !map.has(att.invitee_id)) {
        map.set(att.invitee_id, att);
      }
    }
    return map;
  }, [attendanceRecords]);

  // Compute stats for selected date
  const stats = useMemo(() => {
    const totalInvitees = invitees.length;
    const currentlyInside = activeSessionMap.size;
    const currentlyOutside = Math.max(0, totalInvitees - currentlyInside);

    // Records on selected date
    const dateRecords = selectedDate === 'all'
      ? attendanceRecords
      : attendanceRecords.filter((r) => r.event_date === selectedDate);

    const totalEntriesToday = dateRecords.filter((r) => Boolean(r.entry_time)).length;
    const totalExitsToday = dateRecords.filter((r) => Boolean(r.exit_time)).length;

    return {
      totalInvitees,
      currentlyInside,
      currentlyOutside,
      totalEntriesToday,
      totalExitsToday,
    };
  }, [invitees, attendanceRecords, activeSessionMap, selectedDate]);

  // One-click Gate Entry (IN)
  const handleQuickEntry = async (inviteeId: string, inviteeName: string) => {
    if (!currentUser) return;
    setIsActionLoading(true);
    try {
      await recordEventEntry(inviteeId, currentUser, selectedDate === 'all' ? '2026-12-14' : selectedDate);
      toast.show(`Gate entry (IN) recorded for ${inviteeName}.`, 'success');
      await loadData();
    } catch (err: any) {
      toast.show(err.message || 'Failed to record gate entry.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // One-click Gate Exit (OUT)
  const handleQuickExit = async (inviteeId: string, inviteeName: string) => {
    if (!currentUser) return;
    setIsActionLoading(true);
    try {
      await recordEventExit(inviteeId, currentUser);
      toast.show(`Gate exit (OUT) recorded for ${inviteeName}.`, 'info');
      await loadData();
    } catch (err: any) {
      toast.show(err.message || 'Failed to record gate exit.', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  // Filtered invitees based on search and inside/outside presence
  const filteredInvitees = useMemo(() => {
    return invitees.filter((inv) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inv.full_name.toLowerCase().includes(q) ||
        inv.invitee_code.toLowerCase().includes(q) ||
        inv.phone.includes(q) ||
        inv.city.toLowerCase().includes(q);

      const isInside = activeSessionMap.has(inv.id);
      let matchesStatus = true;
      if (statusFilter === 'inside') matchesStatus = isInside;
      if (statusFilter === 'outside') matchesStatus = !isInside;

      return matchesSearch && matchesStatus;
    });
  }, [invitees, activeSessionMap, searchQuery, statusFilter]);

  const handleExportCSV = () => {
    if (attendanceRecords.length === 0) {
      toast.show('No gate attendance movements to export.', 'warning');
      return;
    }

    const headers = [
      'Invitee Code',
      'Invitee Name',
      'Category',
      'Phone',
      'Event Date',
      'Entry Time (IN)',
      'Exit Time (OUT)',
      'Duration (Mins)',
      'Status',
      'Recorded By',
    ];

    const recordsToExport = selectedDate === 'all'
      ? attendanceRecords
      : attendanceRecords.filter((r) => r.event_date === selectedDate);

    const rows = recordsToExport.map((r) => [
      r.invitee?.invitee_code || '',
      r.invitee?.full_name || '',
      r.invitee?.category || '',
      r.invitee?.phone || '',
      r.event_date,
      r.entry_time,
      r.exit_time || 'Active Inside',
      r.duration_minutes || '',
      r.status,
      r.entry_recorded_by_name || '',
    ]);

    exportToCSV(`AIMPLB_Gate_Attendance_${selectedDate}`, headers, rows);
    toast.show('Gate attendance export downloaded.', 'success');
  };

  if (isLoading) {
    return <LoadingSkeleton rows={6} />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Event Reception & Gate Attendance"
        subtitle="Live physical venue entry and exit verification across session dates. Decoupled from hotel and room management."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 h-9 text-xs"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Export Gate Log</span>
            </Button>
          </div>
        }
      />

      {/* Date Filter Bar */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#E3E7E4] shadow-card-subtle flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-[#164734]" />
          <span className="text-xs font-bold uppercase tracking-wider text-[#164734]">
            Session Operating Date:
          </span>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {[
            { label: 'Day 1 (14 Dec 2026)', value: '2026-12-14' },
            { label: 'Day 2 (15 Dec 2026)', value: '2026-12-15' },
            { label: 'Day 3 (16 Dec 2026)', value: '2026-12-16' },
            { label: 'All Session Dates', value: 'all' },
          ].map((df) => (
            <button
              key={df.value}
              onClick={() => setSelectedDate(df.value)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                selectedDate === df.value
                  ? 'bg-[#164734] text-white font-semibold shadow-xs'
                  : 'bg-[#FAF9F6] text-[#69756F] hover:bg-[#E8F1EC] border border-[#E3E7E4]'
              }`}
            >
              {df.label}
            </button>
          ))}
        </div>
      </div>

      {/* 5 Core Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <StatCard
          title="Total Invitees"
          value={stats.totalInvitees}
          subtitle="All confirmed delegates"
          icon={UserCheck}
        />
        <StatCard
          title="Currently Inside"
          value={stats.currentlyInside}
          subtitle="Physical venue presence"
          icon={LogIn}
          variant="success"
        />
        <StatCard
          title="Currently Outside"
          value={stats.currentlyOutside}
          subtitle="Not checked in at gate"
          icon={LogOut}
        />
        <StatCard
          title="Total Entries Today"
          value={stats.totalEntriesToday}
          subtitle={`Gate check-ins on ${selectedDate === 'all' ? 'all days' : formatDate(selectedDate)}`}
          icon={Clock}
        />
        <StatCard
          title="Total Exits Today"
          value={stats.totalExitsToday}
          subtitle="Gate checkout events"
          icon={CheckCircle2}
        />
      </div>

      {/* Search & Presence Filter Bar */}
      <div className="bg-white p-4 rounded-2xl border border-[#E3E7E4] shadow-card-subtle flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex-1 max-w-md">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search delegate by name, phone, or city..."
          />
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-[#FAF9F6] p-1 rounded-lg border border-[#E3E7E4] text-xs">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'all'
                  ? 'bg-white text-[#164734] shadow-xs font-semibold'
                  : 'text-[#69756F] hover:text-[#1A221E]'
              }`}
            >
              All ({invitees.length})
            </button>
            <button
              onClick={() => setStatusFilter('inside')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'inside'
                  ? 'bg-[#E8F1EC] text-[#164734] shadow-xs font-semibold'
                  : 'text-[#69756F] hover:text-[#1A221E]'
              }`}
            >
              Inside ({stats.currentlyInside})
            </button>
            <button
              onClick={() => setStatusFilter('outside')}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                statusFilter === 'outside'
                  ? 'bg-white text-[#164734] shadow-xs font-semibold'
                  : 'text-[#69756F] hover:text-[#1A221E]'
              }`}
            >
              Outside ({stats.currentlyOutside})
            </button>
          </div>

          {/* View toggle */}
          <div className="hidden md:flex items-center bg-[#FAF9F6] p-1 rounded-lg border border-[#E3E7E4]">
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'table' ? 'bg-white shadow-xs text-[#164734]' : 'text-[#69756F]'
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === 'cards' ? 'bg-white shadow-xs text-[#164734]' : 'text-[#69756F]'
              }`}
              title="Cards View"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Directory with One-Click IN/OUT */}
      {filteredInvitees.length === 0 ? (
        <EmptyState
          title="No delegates match search"
          description="Adjust search keywords or presence filters to view delegates."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchQuery('');
            setStatusFilter('all');
          }}
        />
      ) : (
        <>
          {/* Mobile Cards View */}
          <div
            className={`space-y-3 ${
              viewMode === 'table' ? 'hidden' : viewMode === 'cards' ? 'block' : 'block md:hidden'
            }`}
          >
            {filteredInvitees.map((inv) => {
              const activeSession = activeSessionMap.get(inv.id);
              const isInside = Boolean(activeSession);
              return (
                <MobileDataCard
                  key={inv.id}
                  title={inv.full_name}
                  subtitle={`${inv.city}, ${inv.state}`}
                  badge={
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                        isInside
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-gray-100 text-gray-700 border border-gray-200'
                      }`}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${isInside ? 'bg-emerald-600 animate-pulse' : 'bg-gray-400'}`} />
                      <span>{isInside ? 'INSIDE' : 'OUTSIDE'}</span>
                    </span>
                  }
                  onClick={() => navigate(`/invitees/${inv.id}`)}
                  fields={[
                    {
                      label: 'Phone',
                      value: inv.phone,
                    },
                    {
                      label: 'Presence Info',
                      value: isInside ? (
                        <span className="text-[#164734] font-medium">
                          In since {formatDateTime(activeSession?.entry_time)}
                        </span>
                      ) : (
                        <span className="text-[#69756F]">Gate exit complete</span>
                      ),
                    },
                  ]}
                  actions={
                    <div className="flex items-center gap-2 w-full">
                      {isInside ? (
                        <Button
                          size="sm"
                          disabled={isActionLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickExit(inv.id, inv.full_name);
                          }}
                          className="flex-1 h-8 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white"
                        >
                          <LogOut className="h-3.5 w-3.5 mr-1" />
                          <span>Record OUT</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={isActionLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickEntry(inv.id, inv.full_name);
                          }}
                          className="flex-1 h-8 text-xs font-semibold bg-[#164734] hover:bg-[#123829] text-white"
                        >
                          <LogIn className="h-3.5 w-3.5 mr-1" />
                          <span>Record IN</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/invitees/${inv.id}`);
                        }}
                        className="h-8 text-xs px-2.5"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  }
                />
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div
            className={`bg-white rounded-xl border border-[#E3E7E4] shadow-card-subtle overflow-hidden ${
              viewMode === 'cards' ? 'hidden' : viewMode === 'table' ? 'block' : 'hidden md:block'
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E3E7E4] bg-[#FAF9F6] text-[#69756F] font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Delegate Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Current Gate Presence</th>
                    <th className="py-3 px-4">Recent Movement Time</th>
                    <th className="py-3 px-4 text-right">Quick Gate Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6F4]">
                  {filteredInvitees.map((inv) => {
                    const activeSession = activeSessionMap.get(inv.id);
                    const isInside = Boolean(activeSession);
                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-[#FAF9F6]/80 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/invitees/${inv.id}`)}
                      >
                        <td className="py-3.5 px-4 font-medium text-[#1A221E]">
                          <div className="font-semibold text-sm group-hover:text-[#164734] transition-colors">
                            {inv.full_name}
                          </div>
                          <div className="text-[11px] text-[#69756F]">
                            {inv.city}, {inv.state}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge
                            variant={
                              inv.category === 'Founder Members'
                                ? 'founder'
                                : inv.category === 'General Members'
                                ? 'general'
                                : 'special'
                            }
                            label={inv.category}
                            size="sm"
                          />
                        </td>
                        <td className="py-3.5 px-4 text-[#1A221E] whitespace-nowrap font-mono text-[11px]">
                          {inv.phone}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                              isInside
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-gray-100 text-gray-700 border border-gray-200'
                            }`}
                          >
                            <span
                              className={`h-2 w-2 rounded-full ${
                                isInside ? 'bg-emerald-600 animate-pulse' : 'bg-gray-400'
                              }`}
                            />
                            <span>{isInside ? 'INSIDE VENUE' : 'OUTSIDE'}</span>
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#69756F] whitespace-nowrap">
                          {isInside ? (
                            <span className="text-[#164734] font-semibold">
                              IN: {formatDateTime(activeSession?.entry_time)}
                            </span>
                          ) : (
                            <span>Exit Logged</span>
                          )}
                        </td>
                        <td
                          className="py-3.5 px-4 text-right whitespace-nowrap space-x-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isInside ? (
                            <Button
                              size="sm"
                              disabled={isActionLoading}
                              onClick={() => handleQuickExit(inv.id, inv.full_name)}
                              className="h-7 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs px-3"
                            >
                              <LogOut className="h-3 w-3 mr-1" />
                              <span>Record OUT</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              disabled={isActionLoading}
                              onClick={() => handleQuickEntry(inv.id, inv.full_name)}
                              className="h-7 text-xs font-semibold bg-[#164734] hover:bg-[#123829] text-white shadow-xs px-3"
                            >
                              <LogIn className="h-3 w-3 mr-1" />
                              <span>Record IN</span>
                            </Button>
                          )}

                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigate(`/invitees/${inv.id}`)}
                            className="h-7 text-xs px-2.5 text-[#164734] hover:bg-[#E8F1EC] border-[#C5DEC8]"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            <span>Profile</span>
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
