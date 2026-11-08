import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlaneTakeoff,
  Calendar,
  Plus,
  Download,
  Edit,
  Trash2,
  AlertCircle,
  Eye,
  CheckCircle2,
  Clock,
  Phone,
  LayoutGrid,
  List,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { MobileDataCard } from '@/components/common/MobileDataCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { SearchInput } from '@/components/common/SearchInput';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { TransportationFormModal } from './TransportationFormModal';
import { TransportationRecord, Invitee } from '@/types';
import {
  getTransportationRecords,
  getInvitees,
  deleteTransportation,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { exportToCSV } from '@/lib/exportUtils';
import { formatDate, formatTime } from '@/lib/utils';

export const TransportationDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [records, setRecords] = useState<TransportationRecord[]>([]);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'auto' | 'cards' | 'table'>('auto');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [journeyFilter, setJourneyFilter] = useState<'all' | 'arrival' | 'departure'>('all');
  const [modeFilter, setModeFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<TransportationRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<TransportationRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [trans, inv] = await Promise.all([
        getTransportationRecords(),
        getInvitees(),
      ]);
      setRecords(trans);
      setInvitees(inv);
    } catch (err) {
      console.error('Error fetching transportation:', err);
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

  // Compute actual metrics from database records
  const stats = useMemo(() => {
    const totalInvitees = invitees.length;
    const arrivalInviteeIds = new Set(
      records.filter((r) => r.journey_type === 'arrival').map((r) => r.invitee_id)
    );
    const departureInviteeIds = new Set(
      records.filter((r) => r.journey_type === 'departure').map((r) => r.invitee_id)
    );

    const arrivalsCompleted = arrivalInviteeIds.size;
    const arrivalsPending = Math.max(0, totalInvitees - arrivalsCompleted);
    const departuresCompleted = departureInviteeIds.size;
    const departuresPending = Math.max(0, totalInvitees - departuresCompleted);

    const todayStr = '2026-12-14'; // Primary opening session date
    const arrivingToday = records.filter(
      (r) => r.journey_type === 'arrival' && r.journey_date === todayStr
    ).length;
    const departingToday = records.filter(
      (r) => r.journey_type === 'departure' && r.journey_date === todayStr
    ).length;

    return {
      totalInvitees,
      arrivalsCompleted,
      arrivalsPending,
      departuresCompleted,
      departuresPending,
      arrivingToday,
      departingToday,
    };
  }, [invitees, records]);

  // Invitees without any transportation record
  const inviteesWithoutTransport = useMemo(() => {
    const assignedSet = new Set(records.map((r) => r.invitee_id));
    return invitees.filter((inv) => !assignedSet.has(inv.id));
  }, [invitees, records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.invitee?.full_name.toLowerCase().includes(q) ||
        r.invitee?.invitee_code.toLowerCase().includes(q) ||
        r.location_name.toLowerCase().includes(q) ||
        (r.transport_number && r.transport_number.toLowerCase().includes(q)) ||
        (r.driver_name && r.driver_name.toLowerCase().includes(q)) ||
        (r.driver_phone && r.driver_phone.includes(q));

      const matchesJourney = journeyFilter === 'all' || r.journey_type === journeyFilter;
      const matchesMode = modeFilter === 'all' || r.transport_mode === modeFilter;
      const matchesDate = dateFilter === 'all' || r.journey_date === dateFilter;

      return matchesSearch && matchesJourney && matchesMode && matchesDate;
    });
  }, [records, searchQuery, journeyFilter, modeFilter, dateFilter]);

  const handleDelete = async () => {
    if (!recordToDelete || !currentUser) return;
    setIsDeleting(true);
    try {
      await deleteTransportation(recordToDelete.id, currentUser);
      toast.success(
        'Travel record removed',
        `Journey for ${recordToDelete.invitee?.full_name} has been deleted.`
      );
      setRecordToDelete(null);
      await loadData();
    } catch (err) {
      console.error('Delete transport error:', err);
      toast.error('Failed to delete transportation record.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      toast.warning('No records to export.');
      return;
    }

    const headers = [
      'Invitee Code',
      'Invitee Name',
      'Phone',
      'Journey Type',
      'Date',
      'Time',
      'Mode',
      'Number / Flight',
      'Location / Station',
      'Pickup Required',
      'Pickup Point',
      'Driver Name',
      'Driver Phone',
      'Remarks',
    ];

    const rows = filteredRecords.map((r) => [
      r.invitee?.invitee_code || '',
      r.invitee?.full_name || '',
      r.invitee?.phone || '',
      r.journey_type,
      r.journey_date,
      r.journey_time || '',
      r.transport_mode,
      r.transport_number || '',
      r.location_name,
      r.pickup_required ? 'YES' : 'NO',
      r.pickup_point || '',
      r.driver_name || '',
      r.driver_phone || '',
      r.remarks || '',
    ]);

    exportToCSV('AIMPLB_Transportation_Schedule', headers, rows);
    toast.success('Schedule exported to CSV', `${filteredRecords.length} records exported.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Transportation Coordination"
        subtitle="Manage airport & railway station transfers, driver dispatches, and schedule coordination"
        badge={`${records.length} Journeys`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5"
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Export CSV</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setRecordToEdit(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 bg-[#164734] hover:bg-[#113829] text-white shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Transportation</span>
            </Button>
          </div>
        }
      />

      {/* Real Computed Statistical Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <StatCard
          title="Total Invitees"
          value={stats.totalInvitees}
          subtitle="Registered delegates"
          icon={PlaneTakeoff}
        />
        <StatCard
          title="Arrivals Set"
          value={stats.arrivalsCompleted}
          subtitle="Delegates with arrival"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Arrivals Pend."
          value={stats.arrivalsPending}
          subtitle="Need arrival plan"
          icon={AlertCircle}
          variant={stats.arrivalsPending > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="Departures Set"
          value={stats.departuresCompleted}
          subtitle="Return booked"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Departures Pend."
          value={stats.departuresPending}
          subtitle="Need return plan"
          icon={AlertCircle}
          variant={stats.departuresPending > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="Arriving 14 Dec"
          value={stats.arrivingToday}
          subtitle="Main session day"
          icon={Calendar}
          variant="highlight"
        />
        <StatCard
          title="Departing 14 Dec"
          value={stats.departingToday}
          subtitle="Early departures"
          icon={Calendar}
        />
      </div>

      {/* Pending Action Banner if delegates have no travel arrangements */}
      {inviteesWithoutTransport.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-amber-700 shrink-0" />
            <span>
              <strong>{inviteesWithoutTransport.length} delegates</strong> currently have no travel arrangements recorded.
            </span>
          </div>
          <button
            onClick={() => setShowPendingOnly(!showPendingOnly)}
            className="font-bold underline text-amber-900 hover:text-black text-left sm:text-right shrink-0"
          >
            {showPendingOnly ? 'View all scheduled journeys' : 'View unassigned delegates'}
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E3E7E4] shadow-card-subtle flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by delegate name, station, flight no, driver..."
          className="w-full md:w-80"
        />

        <div className="flex flex-wrap items-center gap-2 justify-between md:justify-end">
          {/* Journey filter */}
          <select
            value={journeyFilter}
            onChange={(e) => setJourneyFilter(e.target.value as any)}
            className="h-9 text-xs rounded-lg border border-[#E3E7E4] bg-white px-2.5 text-[#1A221E] font-medium focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
          >
            <option value="all">All Journeys ({records.length})</option>
            <option value="arrival">Arrivals Only</option>
            <option value="departure">Departures Only</option>
          </select>

          {/* Mode filter */}
          <select
            value={modeFilter}
            onChange={(e) => setModeFilter(e.target.value)}
            className="h-9 text-xs rounded-lg border border-[#E3E7E4] bg-white px-2.5 text-[#1A221E] font-medium focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
          >
            <option value="all">All Modes</option>
            <option value="Flight">Flight</option>
            <option value="Train">Train</option>
            <option value="Bus">Bus</option>
            <option value="Car">Car</option>
          </select>

          {/* Date filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-9 text-xs rounded-lg border border-[#E3E7E4] bg-white px-2.5 text-[#1A221E] font-medium focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
          >
            <option value="all">All Dates</option>
            <option value="2026-12-13">13 Dec 2026 (Pre-session)</option>
            <option value="2026-12-14">14 Dec 2026 (Inaugural)</option>
            <option value="2026-12-15">15 Dec 2026 (Day 2)</option>
            <option value="2026-12-16">16 Dec 2026 (Concluding)</option>
          </select>

          {/* View toggle */}
          <div className="hidden sm:flex items-center rounded-lg border border-[#E3E7E4] bg-[#FAF9F6] p-0.5">
            <button
              onClick={() => setViewMode('auto')}
              title="Responsive View"
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'auto'
                  ? 'bg-white text-[#164734] shadow-xs'
                  : 'text-[#69756F] hover:text-[#1A221E]'
              }`}
            >
              <Sparkles className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Table View"
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-[#164734] shadow-xs'
                  : 'text-[#69756F] hover:text-[#1A221E]'
              }`}
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              title="Cards View"
              className={`p-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'cards'
                  ? 'bg-white text-[#164734] shadow-xs'
                  : 'text-[#69756F] hover:text-[#1A221E]'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Main View Area */}
      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : showPendingOnly ? (
        /* View for Invitees Without Travel Arrangements */
        <div className="bg-white rounded-2xl border border-[#E3E7E4] p-5 shadow-card-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-[#F4F6F4] mb-4">
            <h2 className="text-sm font-bold text-[#1A221E]">
              Delegates Awaiting Transportation Arrangements ({inviteesWithoutTransport.length})
            </h2>
            <Button size="sm" variant="outline" onClick={() => setShowPendingOnly(false)}>
              Back to Schedules
            </Button>
          </div>
          <div className="divide-y divide-[#F4F6F4] text-xs">
            {inviteesWithoutTransport.map((inv) => (
              <div key={inv.id} className="py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <span className="font-mono font-bold text-[#164734] mr-2 bg-[#E8F1EC] px-2 py-0.5 rounded text-[11px]">
                    {inv.invitee_code}
                  </span>
                  <span className="font-semibold text-sm text-[#1A221E]">{inv.full_name}</span>
                  <span className="text-[#69756F] ml-2">
                    ({inv.category}) • {inv.city}, {inv.state}
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="self-start sm:self-center h-8 text-xs text-[#164734] border-[#164734]/30 hover:bg-[#E8F1EC]"
                  onClick={() => {
                    setRecordToEdit(null);
                    setIsModalOpen(true);
                  }}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  <span>Schedule Transport</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          title="No transportation records found"
          description="No journeys match the selected criteria. Add flight or train schedules for arriving delegates."
          actionLabel="Add Schedule"
          onAction={() => {
            setRecordToEdit(null);
            setIsModalOpen(true);
          }}
        />
      ) : (
        <>
          {/* Mobile Cards View */}
          <div
            className={`space-y-3 ${
              viewMode === 'table'
                ? 'hidden'
                : viewMode === 'cards'
                ? 'block'
                : 'block md:hidden'
            }`}
          >
            {filteredRecords.map((r) => (
              <MobileDataCard
                key={r.id}
                title={r.invitee?.full_name || 'Unknown Delegate'}
                identifier={r.invitee?.invitee_code}
                subtitle={r.location_name}
                badge={
                  <StatusBadge
                    variant={r.journey_type === 'arrival' ? 'success' : 'warning'}
                    label={r.journey_type.toUpperCase()}
                    size="sm"
                  />
                }
                onClick={() => r.invitee && navigate(`/invitees/${r.invitee.id}`)}
                fields={[
                  {
                    label: 'Date & Time',
                    value: `${formatDate(r.journey_date)} at ${formatTime(r.journey_time)}`,
                    icon: Clock,
                  },
                  {
                    label: 'Mode & Number',
                    value: `${r.transport_mode} ${r.transport_number ? `(${r.transport_number})` : ''}`,
                    icon: PlaneTakeoff,
                  },
                  {
                    label: 'Pickup Escort',
                    value: r.pickup_required
                      ? r.driver_name
                        ? `Driver: ${r.driver_name}`
                        : 'Yes (Lobby)'
                      : 'Self Managed',
                  },
                  {
                    label: 'Driver Phone',
                    value: r.driver_phone ? (
                      <a
                        href={`tel:${r.driver_phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#164734] font-semibold hover:underline flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{r.driver_phone}</span>
                      </a>
                    ) : (
                      '—'
                    ),
                  },
                ]}
                expandableFields={[
                  ...(r.pickup_point
                    ? [{ label: 'Pickup Point', value: r.pickup_point }]
                    : []),
                  ...(r.booking_reference
                    ? [{ label: 'PNR / Booking Ref', value: r.booking_reference }]
                    : []),
                  ...(r.remarks
                    ? [{ label: 'Remarks / Protocol', value: r.remarks }]
                    : []),
                ]}
                actions={
                  <div className="flex items-center gap-1.5 w-full justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 flex-1"
                      onClick={() => r.invitee && navigate(`/invitees/${r.invitee.id}`)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1 text-[#164734]" />
                      <span>Delegate Profile</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 px-2.5"
                      onClick={() => {
                        setRecordToEdit(r);
                        setIsModalOpen(true);
                      }}
                      title="Edit Journey"
                    >
                      <Edit className="h-3.5 w-3.5 text-[#4A5550]" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 px-2.5 text-red-600 hover:bg-red-50 hover:border-red-200"
                      onClick={() => setRecordToDelete(r)}
                      title="Delete Journey"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                }
              />
            ))}
          </div>

          {/* Desktop Table View */}
          <div
            className={`bg-white rounded-2xl border border-[#E3E7E4] shadow-card-subtle overflow-hidden ${
              viewMode === 'cards'
                ? 'hidden'
                : viewMode === 'table'
                ? 'block'
                : 'hidden md:block'
            }`}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E3E7E4] bg-[#FAF9F6] text-[#69756F] font-semibold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4">Delegate</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Mode & Number</th>
                    <th className="py-3 px-4">Arrival / Departure Point</th>
                    <th className="py-3 px-4">Pickup / Escort</th>
                    <th className="py-3 px-4">Remarks</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6F4]">
                  {filteredRecords.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-[#FAF9F6]/80 transition-colors cursor-pointer group"
                      onClick={() => r.invitee && navigate(`/invitees/${r.invitee.id}`)}
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-mono text-[11px] font-bold text-[#164734]">
                          <span className="bg-[#E8F1EC] px-2 py-0.5 rounded">
                            {r.invitee?.invitee_code}
                          </span>
                        </div>
                        <div className="font-semibold text-[#1A221E] text-sm mt-1 group-hover:text-[#164734] transition-colors">
                          {r.invitee?.full_name}
                        </div>
                        <a
                          href={`tel:${r.invitee?.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[11px] text-[#69756F] hover:underline"
                        >
                          {r.invitee?.phone}
                        </a>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge
                          variant={r.journey_type === 'arrival' ? 'success' : 'warning'}
                          label={r.journey_type.toUpperCase()}
                          size="sm"
                        />
                      </td>

                      <td className="py-3.5 px-4 text-[#1A221E] whitespace-nowrap">
                        <div className="font-medium">{formatDate(r.journey_date)}</div>
                        <div className="text-[11px] text-[#69756F] font-mono">
                          {formatTime(r.journey_time)}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[#1A221E] whitespace-nowrap">
                        <div className="font-semibold">{r.transport_mode}</div>
                        <div className="text-[11px] text-[#69756F] font-mono">
                          {r.transport_number || '—'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-[#4A5550] max-w-[200px]">
                        <div className="truncate font-medium">{r.location_name}</div>
                        {r.pickup_point && (
                          <div className="text-[10px] text-[#69756F] truncate">
                            Point: {r.pickup_point}
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#1A221E] whitespace-nowrap">
                        {r.pickup_required ? (
                          <div>
                            <span className="font-semibold text-xs text-emerald-800">
                              Pickup Required
                            </span>
                            {r.driver_name && (
                              <div className="text-[11px] text-[#69756F]">
                                Driver: {r.driver_name}
                                {r.driver_phone && (
                                  <a
                                    href={`tel:${r.driver_phone}`}
                                    onClick={(e) => e.stopPropagation()}
                                    className="ml-1 text-[#164734] hover:underline font-mono"
                                  >
                                    ({r.driver_phone})
                                  </a>
                                )}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#69756F] text-[11px]">Self Managed</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#69756F] max-w-[150px] truncate">
                        {r.remarks || '—'}
                      </td>

                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap space-x-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          title="View Delegate"
                          onClick={() => r.invitee && navigate(`/invitees/${r.invitee.id}`)}
                          className="p-1.5 text-[#69756F] hover:text-[#164734] hover:bg-[#E8F1EC] rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          title="Edit Journey"
                          onClick={() => {
                            setRecordToEdit(r);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-[#69756F] hover:text-[#164734] hover:bg-[#E8F1EC] rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        <button
                          title="Delete Journey"
                          onClick={() => setRecordToDelete(r)}
                          className="p-1.5 text-[#69756F] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Form Modal */}
      <TransportationFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setRecordToEdit(null);
        }}
        onSuccess={() => {
          loadData();
          toast.success(
            recordToEdit
              ? 'Transportation schedule updated.'
              : 'New travel schedule recorded.'
          );
        }}
        recordToEdit={recordToEdit}
      />

      {/* Delete Confirmation */}
      <ConfirmModal
        isOpen={Boolean(recordToDelete)}
        onClose={() => setRecordToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Travel Schedule"
        message={`Are you sure you want to remove the ${recordToDelete?.journey_type} schedule for ${recordToDelete?.invitee?.full_name}?`}
        confirmLabel="Delete Schedule"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
