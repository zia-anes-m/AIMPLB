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
  QrCode,
  Edit2,
  AlertCircle,
  MapPin,
  Phone,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { MobileDataCard } from '@/components/common/MobileDataCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { SearchInput } from '@/components/common/SearchInput';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { Pagination } from '@/components/common/Pagination';
import { QRScannerModal } from '@/components/reception/QRScannerModal';
import { AttendanceCorrectionModal } from '@/components/reception/AttendanceCorrectionModal';
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
  const { currentUser, isAdmin } = useAuth();
  const toast = useToast();

  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<EventAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'auto' | 'cards' | 'table'>('auto');

  // Scanner & Correction Modal States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scannerMode, setScannerMode] = useState<'IN' | 'OUT'>('IN');
  const [lastScannedResult, setLastScannedResult] = useState<{
    invitee: Invitee;
    record: EventAttendanceRecord;
    mode: 'IN' | 'OUT';
    timestamp: string;
  } | null>(null);
  const [correctionRecord, setCorrectionRecord] = useState<EventAttendanceRecord | null>(null);
  const [isCorrectionOpen, setIsCorrectionOpen] = useState(false);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'inside' | 'outside'>('all');
  const [selectedDate, setSelectedDate] = useState<string>('2026-12-14');

  // Pagination states for smooth Android mobile scrolling
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Debounce search input by 250ms
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, selectedDate]);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [invs, atts] = await Promise.all([
        getInvitees(),
        getEventAttendanceRecords(),
      ]);
      setInvitees(invs);
      setAttendanceRecords(atts);
    } catch (err: any) {
      console.error('Error loading gate reception data:', err);
      setError(err?.message || 'Failed to load reception records from Supabase.');
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

  // Filtered invitees based on debounced search and inside/outside presence
  const filteredInvitees = useMemo(() => {
    return invitees.filter((inv) => {
      const q = debouncedSearch.toLowerCase().trim();
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
  }, [invitees, activeSessionMap, debouncedSearch, statusFilter]);

  // Paginated subset of invitees
  const totalPages = Math.ceil(filteredInvitees.length / pageSize) || 1;
  const paginatedInvitees = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredInvitees.slice(start, start + pageSize);
  }, [filteredInvitees, currentPage, pageSize]);

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
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => {
                setScannerMode('IN');
                setIsScannerOpen(true);
              }}
              className="bg-[#164734] hover:bg-[#123829] text-white flex items-center gap-1.5 h-9 text-xs font-bold shadow-xs"
            >
              <QrCode className="h-4 w-4" />
              <span>SCAN IN</span>
            </Button>
            <Button
              onClick={() => {
                setScannerMode('OUT');
                setIsScannerOpen(true);
              }}
              className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1.5 h-9 text-xs font-bold shadow-xs"
            >
              <QrCode className="h-4 w-4" />
              <span>SCAN OUT</span>
            </Button>
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

      {/* Database Error Banner */}
      {error && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in shadow-xs"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-600" />
            <span className="font-medium truncate">{error}</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="self-start sm:self-center shrink-0 border-red-300 text-red-700 hover:bg-red-100 h-8"
            onClick={() => loadData()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Real-time Scanned Invitee Attendance Confirmation Card */}
      {lastScannedResult && (
        <div
          role="region"
          aria-label="Last scanned attendance confirmation"
          className={`p-4 sm:p-5 rounded-2xl border-2 shadow-sm animate-fade-in transition-all ${
            lastScannedResult.mode === 'IN'
              ? 'bg-gradient-to-br from-emerald-50/95 via-[#F2F8F4] to-white border-[#164734]/30'
              : 'bg-gradient-to-br from-amber-50/95 via-[#FFFBF2] to-white border-amber-500/30'
          }`}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5 min-w-0">
              <div
                className={`p-3 rounded-2xl text-white shadow-xs shrink-0 ${
                  lastScannedResult.mode === 'IN' ? 'bg-[#164734]' : 'bg-amber-600'
                }`}
              >
                {lastScannedResult.mode === 'IN' ? (
                  <LogIn className="h-6 w-6" />
                ) : (
                  <LogOut className="h-6 w-6" />
                )}
              </div>

              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                      lastScannedResult.mode === 'IN'
                        ? 'bg-emerald-100 text-[#164734] border border-emerald-300'
                        : 'bg-amber-100 text-amber-900 border border-amber-300'
                    }`}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>
                      {lastScannedResult.mode === 'IN'
                        ? 'Checked IN Successfully'
                        : 'Checked OUT Successfully'}
                    </span>
                  </span>

                  <span className="text-[10px] font-mono text-[#69756F]">
                    {lastScannedResult.timestamp}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-0.5">
                  <h3 className="text-lg sm:text-xl font-bold text-[#1A221E] leading-tight">
                    {lastScannedResult.invitee.full_name}
                  </h3>
                  <span className="font-mono font-bold text-xs bg-white text-[#164734] px-2.5 py-0.5 rounded-lg border border-[#C5DEC8] shadow-2xs">
                    {lastScannedResult.invitee.invitee_code}
                  </span>
                </div>

                <div className="flex items-center gap-2.5 text-xs text-[#526058] flex-wrap pt-0.5">
                  <StatusBadge
                    variant={
                      lastScannedResult.invitee.category === 'Founder Members'
                        ? 'founder'
                        : lastScannedResult.invitee.category === 'General Members'
                        ? 'general'
                        : 'special'
                    }
                    label={lastScannedResult.invitee.category}
                    size="sm"
                  />
                  <span>•</span>
                  <span className="flex items-center gap-1 font-medium">
                    <MapPin className="h-3 w-3 text-[#69756F]" />
                    {lastScannedResult.invitee.city}, {lastScannedResult.invitee.state}
                  </span>
                  {lastScannedResult.invitee.phone && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-[#69756F]">
                        <Phone className="h-3 w-3" />
                        {lastScannedResult.invitee.phone}
                      </span>
                    </>
                  )}
                </div>

                <p className="text-xs text-[#69756F] pt-1">
                  Attendance recorded by{' '}
                  <strong className="text-[#1A221E] font-semibold">
                    {currentUser?.full_name?.split('(')[0].trim() || 'Volunteer'}
                  </strong>{' '}
                  • Invitee is now{' '}
                  <strong
                    className={
                      lastScannedResult.mode === 'IN'
                        ? 'text-emerald-700 font-bold'
                        : 'text-amber-700 font-bold'
                    }
                  >
                    {lastScannedResult.mode === 'IN' ? 'INSIDE the venue' : 'OUTSIDE the venue'}
                  </strong>
                  .
                </p>
              </div>
            </div>

            {/* Quick Actions for Next Scan */}
            <div className="flex items-center gap-2 sm:gap-2.5 shrink-0 self-stretch sm:self-auto justify-end pt-2 md:pt-0 border-t md:border-t-0 border-[#E3E7E4]">
              <Button
                onClick={() => {
                  setScannerMode(lastScannedResult.mode);
                  setIsScannerOpen(true);
                }}
                className={`flex-1 sm:flex-initial h-11 px-5 text-xs sm:text-sm font-bold text-white shadow-sm flex items-center justify-center gap-2 ${
                  lastScannedResult.mode === 'IN'
                    ? 'bg-[#164734] hover:bg-[#113829]'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                <QrCode className="h-4 w-4" />
                <span>Scan Next / Scan Another Invitee</span>
              </Button>

              <button
                type="button"
                onClick={() => setLastScannedResult(null)}
                title="Dismiss Confirmation"
                className="p-2.5 text-[#69756F] hover:text-[#1A221E] hover:bg-black/5 rounded-xl transition-colors shrink-0"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prominent Quick-Action Scanning Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 bg-gradient-to-r from-[#164734] via-[#1b563f] to-[#0D281D] p-3.5 sm:p-4 rounded-2xl text-white shadow-md">
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-[#C5DEC8]">
              <LogIn className="h-3.5 w-3.5" />
              <span>Gate Entry Scanner</span>
            </div>
            <div className="text-base sm:text-lg font-bold">Venue Inward Check-in</div>
            <div className="text-[11px] sm:text-xs text-white/80">Scan QR or enter ID to record venue arrival</div>
          </div>
          <Button
            onClick={() => {
              setScannerMode('IN');
              setIsScannerOpen(true);
            }}
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold px-4 h-11 sm:h-10 text-xs sm:text-sm shadow-md flex items-center gap-2"
          >
            <QrCode className="h-4 w-4" />
            <span>SCAN IN</span>
          </Button>
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/10 backdrop-blur-xs border border-white/15">
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5 text-xs uppercase font-bold tracking-wider text-amber-200">
              <LogOut className="h-3.5 w-3.5" />
              <span>Gate Exit Scanner</span>
            </div>
            <div className="text-base sm:text-lg font-bold">Venue Outward Checkout</div>
            <div className="text-[11px] sm:text-xs text-white/80">Scan QR or enter ID to record venue departure</div>
          </div>
          <Button
            onClick={() => {
              setScannerMode('OUT');
              setIsScannerOpen(true);
            }}
            className="bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white font-bold px-4 h-11 sm:h-10 text-xs sm:text-sm shadow-md flex items-center gap-2"
          >
            <QrCode className="h-4 w-4" />
            <span>SCAN OUT</span>
          </Button>
        </div>
      </div>

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
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-2.5">
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
            {paginatedInvitees.map((inv) => {
              const activeSession = activeSessionMap.get(inv.id);
              const isInside = Boolean(activeSession);
              return (
                <MobileDataCard
                  key={inv.id}
                  title={inv.full_name}
                  identifier={inv.invitee_code}
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
                          className="flex-1 h-11 sm:h-9 text-xs sm:text-sm font-bold bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white min-h-[44px] shadow-xs"
                        >
                          <LogOut className="h-4 w-4 mr-1.5" />
                          <span>Record Gate Exit (OUT)</span>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          disabled={isActionLoading}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickEntry(inv.id, inv.full_name);
                          }}
                          className="flex-1 h-11 sm:h-9 text-xs sm:text-sm font-bold bg-[#164734] hover:bg-[#123829] active:bg-[#0d281d] text-white min-h-[44px] shadow-xs"
                        >
                          <LogIn className="h-4 w-4 mr-1.5" />
                          <span>Record Gate Entry (IN)</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/invitees/${inv.id}`);
                        }}
                        className="h-11 w-11 sm:h-9 sm:w-9 p-0 shrink-0 flex items-center justify-center min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                        title="View Invitee Profile"
                        aria-label="View Invitee Profile"
                      >
                        <Eye className="h-4 w-4 text-[#164734]" />
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
                  {paginatedInvitees.map((inv) => {
                    const activeSession = activeSessionMap.get(inv.id);
                    const isInside = Boolean(activeSession);
                    return (
                      <tr
                        key={inv.id}
                        className="hover:bg-[#FAF9F6]/80 transition-colors cursor-pointer group"
                        onClick={() => navigate(`/invitees/${inv.id}`)}
                      >
                        <td className="py-3.5 px-4 font-medium text-[#1A221E]">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold bg-[#E8F1EC] text-[#164734] px-2 py-0.5 rounded border border-[#C5DEC8]">
                              {inv.invitee_code}
                            </span>
                            <span className="font-semibold text-sm group-hover:text-[#164734] transition-colors">
                              {inv.full_name}
                            </span>
                          </div>
                          <div className="text-[11px] text-[#69756F] mt-0.5">
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

                          {(isAdmin || currentUser?.role === 'Reception Team') && activeSession && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setCorrectionRecord(activeSession);
                                setIsCorrectionOpen(true);
                              }}
                              className="h-7 text-xs px-2 text-[#69756F] hover:text-[#164734] hover:bg-[#E8F1EC]"
                              title="Audit/Correct Attendance Record"
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Touch-Friendly Mobile & Desktop Pagination Controls */}
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={filteredInvitees.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            itemLabel="delegates"
          />
        </>
      )}

      {/* QR Scanner Modal (Dual-Mode: IN / OUT with camera & manual fallback) */}
      {isScannerOpen && (
        <QRScannerModal
          key={`qr-scanner-modal-${scannerMode}`}
          isOpen={isScannerOpen}
          onClose={() => setIsScannerOpen(false)}
          initialMode={scannerMode}
          onScanComplete={(invitee, record, mode) => {
            setLastScannedResult({
              invitee,
              record,
              mode,
              timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            });
            loadData();
          }}
        />
      )}

      {/* Attendance Audit & Correction Modal */}
      <AttendanceCorrectionModal
        isOpen={isCorrectionOpen}
        onClose={() => {
          setIsCorrectionOpen(false);
          setCorrectionRecord(null);
        }}
        record={correctionRecord}
        onSuccess={() => {
          loadData();
        }}
      />
    </div>
  );
};
