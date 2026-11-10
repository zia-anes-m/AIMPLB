import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Calendar,
  Plus,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  Moon,
  Phone,
  LayoutGrid,
  List,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { MobileDataCard } from '@/components/common/MobileDataCard';
import { SearchInput } from '@/components/common/SearchInput';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { AccommodationFormModal } from './AccommodationFormModal';
import { AccommodationRecord, Invitee } from '@/types';
import {
  getAccommodations,
  getInvitees,
  deleteAccommodation,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { exportToCSV } from '@/lib/exportUtils';
import { formatDate, formatTime } from '@/lib/utils';

export const AccommodationDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [records, setRecords] = useState<AccommodationRecord[]>([]);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'auto' | 'cards' | 'table'>('auto');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [hotelFilter, setHotelFilter] = useState<string>('all');
  const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<AccommodationRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<AccommodationRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [accs, invs] = await Promise.all([
        getAccommodations(),
        getInvitees(),
      ]);
      setRecords(accs);
      setInvitees(invs);
    } catch (err) {
      console.error('Error loading accommodation data:', err);
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

  // Compute actual database metrics
  const stats = useMemo(() => {
    const totalInvitees = invitees.length;
    const assignedIds = new Set(records.map((r) => r.invitee_id));
    const assignedCount = assignedIds.size;
    const pendingCount = Math.max(0, totalInvitees - assignedCount);

    const hotelCount = records.filter((r) => r.accommodation_type === 'Hotel').length;
    const hajjHouseCount = records.filter((r) => r.accommodation_type === 'Hajj House').length;

    const targetDate = '2026-12-14';
    const checkInsToday = records.filter((r) => r.check_in_date === targetDate).length;
    const checkOutsToday = records.filter((r) => r.check_out_date === targetDate).length;

    return {
      totalInvitees,
      assignedCount,
      pendingCount,
      hotelCount,
      hajjHouseCount,
      checkInsToday,
      checkOutsToday,
    };
  }, [invitees, records]);

  // Unassigned invitees
  const unassignedInvitees = useMemo(() => {
    const assignedIds = new Set(records.map((r) => r.invitee_id));
    return invitees.filter((inv) => !assignedIds.has(inv.id));
  }, [invitees, records]);

  // Collision detection
  const conflicts = useMemo(() => {
    const roomMap: Record<string, AccommodationRecord[]> = {};
    const conflictList: { room: string; hotel: string; records: AccommodationRecord[] }[] = [];

    records.forEach((r) => {
      if (r.hotel_name && r.room_number) {
        const key = `${r.hotel_name.toLowerCase().trim()}-${r.room_number.toLowerCase().trim()}`;
        if (!roomMap[key]) roomMap[key] = [];
        roomMap[key].push(r);
      }
    });

    Object.values(roomMap).forEach((recs) => {
      if (recs.length > 1) {
        conflictList.push({
          room: recs[0].room_number || '',
          hotel: recs[0].hotel_name || '',
          records: recs,
        });
      }
    });

    return conflictList;
  }, [records]);

  // Unique hotel list for filters
  const hotels = useMemo(() => {
    const set = new Set<string>();
    records.forEach((r) => {
      if (r.hotel_name) set.add(r.hotel_name);
    });
    return Array.from(set);
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.invitee?.full_name.toLowerCase().includes(q) ||
        r.invitee?.invitee_code.toLowerCase().includes(q) ||
        (r.hotel_name && r.hotel_name.toLowerCase().includes(q)) ||
        (r.room_number && r.room_number.toLowerCase().includes(q));

      const matchesType = typeFilter === 'all' || r.accommodation_type === typeFilter;
      const matchesHotel = hotelFilter === 'all' || r.hotel_name === hotelFilter;

      return matchesSearch && matchesType && matchesHotel;
    });
  }, [records, searchQuery, typeFilter, hotelFilter]);

  const handleDelete = async () => {
    if (!recordToDelete || !currentUser) return;
    setIsDeleting(true);
    try {
      await deleteAccommodation(recordToDelete.id, currentUser);
      toast.success(
        'Accommodation deleted',
        `Room assignment for ${recordToDelete.invitee?.full_name} removed.`
      );
      setRecordToDelete(null);
      await loadData();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete accommodation record.');
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
      'Type',
      'Hotel / Facility',
      'Room Number',
      'Room Type',
      'Check-in Date',
      'Check-in Time',
      'Check-out Date',
      'Check-out Time',
      'Occupancy',
      'Remarks',
    ];

    const rows = filteredRecords.map((r) => [
      r.invitee?.invitee_code || '',
      r.invitee?.full_name || '',
      r.invitee?.phone || '',
      r.accommodation_type,
      r.hotel_name || '',
      r.room_number || '',
      r.room_type || '',
      r.check_in_date || '',
      r.check_in_time || '',
      r.check_out_date || '',
      r.check_out_time || '',
      r.occupancy || 'Single',
      r.remarks || '',
    ]);

    exportToCSV('AIMPLB_Accommodation_Allotment', headers, rows);
    toast.success('Allotment sheet exported to CSV', `${filteredRecords.length} records.`);
  };

  const calculateNights = (inDate?: string | null, outDate?: string | null) => {
    if (!inDate || !outDate) return null;
    const diff = new Date(outDate).getTime() - new Date(inDate).getTime();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Accommodation Management"
        subtitle="Coordinate hotel rooms, Hajj House residential quarters, check-in schedules, and room allotments"
        badge={`${records.length} Rooms Allocated`}
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 flex-1 sm:flex-initial h-9 sm:h-8"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export CSV</span>
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setRecordToEdit(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 flex-1 sm:flex-initial h-9 sm:h-8 bg-[#164734] hover:bg-[#113829] text-white shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Allocate Room</span>
            </Button>
          </div>
        }
      />

      {/* Real Computed Statistical Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2.5 sm:gap-3">
        <StatCard
          title="Total Invitees"
          value={stats.totalInvitees}
          subtitle="Registered delegates"
          icon={Building2}
        />
        <StatCard
          title="Allocated"
          value={stats.assignedCount}
          subtitle="Confirmed rooms"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Unassigned"
          value={stats.pendingCount}
          subtitle="Need room allocation"
          icon={AlertCircle}
          variant={stats.pendingCount > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="In Hotels"
          value={stats.hotelCount}
          subtitle="Off-site partner hotels"
          icon={Building2}
        />
        <StatCard
          title="In Hajj House"
          value={stats.hajjHouseCount}
          subtitle="On-site venue campus"
          icon={Building2}
          variant="highlight"
        />
        <StatCard
          title="Check-ins 14 Dec"
          value={stats.checkInsToday}
          subtitle="Inaugural day arrival"
          icon={Calendar}
        />
        <StatCard
          title="Check-outs 14 Dec"
          value={stats.checkOutsToday}
          subtitle="Early departures"
          icon={Calendar}
        />
      </div>

      {/* Room Overlap / Multi-occupant alert if detected */}
      {conflicts.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl space-y-2 text-xs text-amber-900 shadow-xs">
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>Multiple Occupants Assigned to Same Room ({conflicts.length} instances):</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
            {conflicts.map((c, i) => (
              <div key={i} className="p-2.5 bg-white rounded-lg border border-amber-200">
                <span className="font-bold text-[#1A221E]">{c.hotel} — Room {c.room}:</span>
                <span className="text-[#69756F] ml-1">
                  {c.records.map((r) => r.invitee?.full_name).join(' & ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Unassigned Banner */}
      {unassignedInvitees.length > 0 && (
        <div className="p-4 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-[#1A221E] shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-[#C59A3F] shrink-0" />
            <span>
              <strong>{unassignedInvitees.length} delegates</strong> currently do not have a room assigned.
            </span>
          </div>
          <button
            onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
            className="font-bold text-[#164734] hover:underline text-left sm:text-right shrink-0"
          >
            {showUnassignedOnly ? 'Show all allocated rooms' : 'View unassigned delegates'}
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E3E7E4] shadow-card-subtle flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by delegate name, ID, hotel, room number..."
          className="w-full md:w-80"
        />

        <div className="flex flex-wrap items-center gap-2 justify-between md:justify-end">
          {/* Facility Type */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 text-xs rounded-lg border border-[#E3E7E4] bg-white px-2.5 text-[#1A221E] font-medium focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
          >
            <option value="all">All Facility Types</option>
            <option value="Hotel">Hotel</option>
            <option value="Hajj House">Hajj House</option>
            <option value="Other">Other</option>
            <option value="No accommodation required">No Room Required</option>
          </select>

          {/* Hotel Specific Filter */}
          {hotels.length > 0 && (
            <select
              value={hotelFilter}
              onChange={(e) => setHotelFilter(e.target.value)}
              className="h-9 text-xs rounded-lg border border-[#E3E7E4] bg-white px-2.5 text-[#1A221E] font-medium focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            >
              <option value="all">All Hotels & Locations</option>
              {hotels.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          )}

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
      ) : showUnassignedOnly ? (
        /* Invitees Without Accommodation View */
        <div className="bg-white rounded-2xl border border-[#E3E7E4] p-5 shadow-card-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-[#F4F6F4] mb-4">
            <h2 className="text-sm font-bold text-[#1A221E]">
              Delegates Awaiting Room Allocation ({unassignedInvitees.length})
            </h2>
            <Button size="sm" variant="outline" onClick={() => setShowUnassignedOnly(false)}>
              Back to Room List
            </Button>
          </div>
          <div className="divide-y divide-[#F4F6F4] text-xs">
            {unassignedInvitees.map((inv) => (
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
                  <span>Allocate Room</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          title="No accommodations found"
          description="No room records match the selected filter criteria. Allocate rooms for arriving delegates."
          actionLabel="Allocate Room"
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
            {filteredRecords.map((r) => {
              const nights = calculateNights(r.check_in_date, r.check_out_date);
              return (
                <MobileDataCard
                  key={r.id}
                  title={r.invitee?.full_name || 'Unknown Delegate'}
                  identifier={r.invitee?.invitee_code}
                  subtitle={r.hotel_name || r.accommodation_type}
                  badge={
                    <span className="font-mono text-xs font-bold text-[#164734] bg-[#E8F1EC] px-2.5 py-0.5 rounded-md">
                      Room {r.room_number || 'TBD'}
                    </span>
                  }
                  onClick={() => r.invitee && navigate(`/invitees/${r.invitee.id}`)}
                  fields={[
                    {
                      label: 'Dates of Stay',
                      value: `${formatDate(r.check_in_date)} – ${formatDate(r.check_out_date)}`,
                      icon: Calendar,
                    },
                    {
                      label: 'Duration',
                      value: nights ? `${nights} Night${nights > 1 ? 's' : ''}` : 'Same Day',
                      icon: Moon,
                    },
                    {
                      label: 'Room Type',
                      value: r.room_type || r.accommodation_type,
                    },
                    {
                      label: 'Delegate Phone',
                      value: r.invitee?.phone ? (
                        <a
                          href={`tel:${r.invitee.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="text-[#164734] font-semibold hover:underline flex items-center gap-1 font-mono"
                        >
                          <Phone className="h-3 w-3" />
                          <span>{r.invitee.phone}</span>
                        </a>
                      ) : (
                        '—'
                      ),
                    },
                  ]}
                  expandableFields={[
                    ...(r.check_in_time
                      ? [{ label: 'Check-in Time', value: formatTime(r.check_in_time) }]
                      : []),
                    ...(r.check_out_time
                      ? [{ label: 'Check-out Time', value: formatTime(r.check_out_time) }]
                      : []),
                    ...(r.occupancy ? [{ label: 'Occupancy', value: r.occupancy }] : []),
                    ...(r.remarks ? [{ label: 'Special Instructions', value: r.remarks }] : []),
                  ]}
                  actions={
                    <div className="flex items-center gap-2 w-full">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-9 sm:h-8 flex-1 font-semibold"
                        onClick={() => r.invitee && navigate(`/invitees/${r.invitee.id}`)}
                      >
                        <Eye className="h-3.5 w-3.5 mr-1 text-[#164734]" />
                        <span>Delegate Profile</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-9 w-9 p-0 sm:h-8 sm:w-8 shrink-0 flex items-center justify-center"
                        onClick={() => {
                          setRecordToEdit(r);
                          setIsModalOpen(true);
                        }}
                        title="Edit Room"
                        aria-label="Edit Room"
                      >
                        <Edit className="h-3.5 w-3.5 text-[#4A5550]" />
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-9 w-9 p-0 sm:h-8 sm:w-8 shrink-0 flex items-center justify-center text-red-600 hover:bg-red-50 hover:border-red-200"
                        onClick={() => setRecordToDelete(r)}
                        title="Delete Room"
                        aria-label="Delete Room"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  }
                />
              );
            })}
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
                    <th className="py-3 px-4">Hotel / Venue</th>
                    <th className="py-3 px-4">Room No.</th>
                    <th className="py-3 px-4">Room Type</th>
                    <th className="py-3 px-4">Stay Duration</th>
                    <th className="py-3 px-4">Check-In / Out</th>
                    <th className="py-3 px-4">Remarks</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6F4]">
                  {filteredRecords.map((r) => {
                    const nights = calculateNights(r.check_in_date, r.check_out_date);
                    return (
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

                        <td className="py-3.5 px-4 text-[#1A221E] whitespace-nowrap">
                          <div className="font-semibold">{r.hotel_name || r.accommodation_type}</div>
                          <div className="text-[11px] text-[#69756F]">{r.accommodation_type}</div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-[#164734] bg-[#E8F1EC] px-2.5 py-0.5 rounded-md text-xs">
                            {r.room_number || 'TBD'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[#1A221E] whitespace-nowrap">
                          <div>{r.room_type || 'Standard'}</div>
                          <div className="text-[11px] text-[#69756F]">{r.occupancy || 'Single'}</div>
                        </td>

                        <td className="py-3.5 px-4 text-[#1A221E] whitespace-nowrap">
                          <span className="font-semibold text-xs text-[#164734]">
                            {nights ? `${nights} Night${nights > 1 ? 's' : ''}` : 'Same Day'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-[#1A221E] whitespace-nowrap">
                          <div className="text-[11px]">
                            <span className="text-[#69756F]">In: </span>
                            {formatDate(r.check_in_date)}
                            {r.check_in_time && (
                              <span className="text-[#69756F] font-mono ml-1">
                                ({formatTime(r.check_in_time)})
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] mt-0.5">
                            <span className="text-[#69756F]">Out: </span>
                            {formatDate(r.check_out_date)}
                            {r.check_out_time && (
                              <span className="text-[#69756F] font-mono ml-1">
                                ({formatTime(r.check_out_time)})
                              </span>
                            )}
                          </div>
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
                            title="Edit Room"
                            onClick={() => {
                              setRecordToEdit(r);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-[#69756F] hover:text-[#164734] hover:bg-[#E8F1EC] rounded-lg transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>

                          <button
                            title="Delete Room"
                            onClick={() => setRecordToDelete(r)}
                            className="p-1.5 text-[#69756F] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
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

      {/* Accommodation Modal */}
      <AccommodationFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setRecordToEdit(null);
        }}
        onSuccess={() => {
          loadData();
          toast.success(
            recordToEdit
              ? 'Accommodation details updated.'
              : 'Room successfully allocated.'
          );
        }}
        recordToEdit={recordToEdit}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(recordToDelete)}
        onClose={() => setRecordToDelete(null)}
        onConfirm={handleDelete}
        title="Remove Room Allocation"
        message={`Are you sure you want to remove the accommodation allotment for ${recordToDelete?.invitee?.full_name}?`}
        confirmLabel="Remove Allotment"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
