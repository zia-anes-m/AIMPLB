import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Armchair,
  CheckCircle2,
  AlertCircle,
  Plus,
  Download,
  Eye,
  Edit,
  Trash2,
  Users,
  LayoutGrid,
  List,
  Sparkles,
  Settings,
  LogOut,
  DoorOpen,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { SearchInput } from '@/components/common/SearchInput';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { MeetingHallFormModal } from './MeetingHallFormModal';
import { MeetingHallRecord, Invitee, MeetingRoom, MeetingAttendanceRecord } from '@/types';
import {
  getMeetingHallRecords,
  getInvitees,
  deleteMeetingHallRecord,
  getMeetingRooms,
  createMeetingRoom,
  updateMeetingRoom,
  getMeetingAttendanceRecords,
  recordMeetingEntry,
  recordMeetingExit,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { exportToCSV } from '@/lib/exportUtils';
import { formatDateTime, formatDuration } from '@/lib/utils';

export const MeetingHallDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<'seating' | 'movements' | 'rooms'>('seating');

  const [records, setRecords] = useState<MeetingHallRecord[]>([]);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [rooms, setRooms] = useState<MeetingRoom[]>([]);
  const [movements, setMovements] = useState<MeetingAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'auto' | 'cards' | 'table'>('auto');

  // Filters for Seating
  const [searchQuery, setSearchQuery] = useState('');
  const [hallFilter, setHallFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  // Filters for Movements
  const [movementSearch, setMovementSearch] = useState('');
  const [movementRoomFilter, setMovementRoomFilter] = useState<string>('all');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<MeetingHallRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<MeetingHallRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Room Management State
  const [isNewRoomOpen, setIsNewRoomOpen] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomCapacity, setNewRoomCapacity] = useState(100);
  const [editingRoom, setEditingRoom] = useState<MeetingRoom | null>(null);
  const [editingRoomName, setEditingRoomName] = useState('');

  // Check In to Room Modal
  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementInviteeId, setMovementInviteeId] = useState('');
  const [movementRoomName, setMovementRoomName] = useState('Main Auditorium');
  const [movementSessionName, setMovementSessionName] = useState('General Session');

  const loadData = useCallback(async () => {
    try {
      const [halls, invs, roomList, movementList] = await Promise.all([
        getMeetingHallRecords(),
        getInvitees(),
        getMeetingRooms(),
        getMeetingAttendanceRecords(),
      ]);
      setRecords(halls);
      setInvitees(invs);
      setRooms(roomList);
      setMovements(movementList);
    } catch (err) {
      console.error('Error loading meeting hall data:', err);
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
    const completed = assignedIds.size;
    const pending = Math.max(0, totalInvitees - completed);

    const mainAuditoriumCount = records.filter(
      (r) => r.meeting_hall === 'Main Auditorium'
    ).length;
    const activeInRoomCount = movements.filter((m) => m.status === 'IN' && !m.out_time).length;
    const vipCount = records.filter((r) => r.assignment_status === 'VIP').length;

    return {
      totalInvitees,
      completed,
      pending,
      mainAuditoriumCount,
      activeInRoomCount,
      vipCount,
    };
  }, [invitees, records, movements]);

  // Invitees without seat assignments
  const unassignedInvitees = useMemo(() => {
    const assignedIds = new Set(records.map((r) => r.invitee_id));
    return invitees.filter((i) => !assignedIds.has(i.id));
  }, [invitees, records]);

  // Filtered seating records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.invitee?.full_name.toLowerCase().includes(q) ||
        r.invitee?.invitee_code.toLowerCase().includes(q) ||
        r.seat_number.toLowerCase().includes(q) ||
        r.meeting_hall.toLowerCase().includes(q) ||
        r.seating_section.toLowerCase().includes(q);

      const matchesHall = hallFilter === 'all' || r.meeting_hall === hallFilter;
      const matchesSection = sectionFilter === 'all' || r.seating_section === sectionFilter;

      return matchesSearch && matchesHall && matchesSection;
    });
  }, [records, searchQuery, hallFilter, sectionFilter]);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const q = movementSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        m.invitee?.full_name.toLowerCase().includes(q) ||
        m.invitee?.invitee_code.toLowerCase().includes(q) ||
        m.room_name.toLowerCase().includes(q) ||
        (m.session_name && m.session_name.toLowerCase().includes(q));

      const matchesRoom = movementRoomFilter === 'all' || m.room_name === movementRoomFilter;
      return matchesSearch && matchesRoom;
    });
  }, [movements, movementSearch, movementRoomFilter]);

  const handleDelete = async () => {
    if (!recordToDelete || !currentUser) return;
    setIsDeleting(true);
    try {
      await deleteMeetingHallRecord(recordToDelete.id, currentUser);
      toast.show(
        `Seat ${recordToDelete.seat_number} for ${recordToDelete.invitee?.full_name} unassigned.`,
        'info'
      );
      setRecordToDelete(null);
      await loadData();
    } catch (err) {
      console.error('Delete error:', err);
      toast.show('Failed to remove seat assignment.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Add new meeting room
  const handleCreateRoom = async () => {
    if (!newRoomName.trim() || !currentUser) return;
    try {
      await createMeetingRoom(newRoomName, newRoomCapacity, currentUser);
      toast.show(`Meeting Room "${newRoomName}" created.`, 'success');
      setNewRoomName('');
      setIsNewRoomOpen(false);
      await loadData();
    } catch (err: any) {
      toast.show(err.message || 'Failed to create room', 'error');
    }
  };

  // Update room name
  const handleUpdateRoomName = async () => {
    if (!editingRoom || !editingRoomName.trim() || !currentUser) return;
    try {
      await updateMeetingRoom(editingRoom.id, { name: editingRoomName.trim() }, currentUser);
      toast.show(`Room name updated to "${editingRoomName}".`, 'success');
      setEditingRoom(null);
      await loadData();
    } catch (err: any) {
      toast.show(err.message || 'Failed to update room', 'error');
    }
  };

  // Toggle room active state
  const handleToggleRoomActive = async (room: MeetingRoom) => {
    if (!currentUser) return;
    try {
      await updateMeetingRoom(room.id, { is_active: !room.is_active }, currentUser);
      toast.show(`Room "${room.name}" is now ${!room.is_active ? 'Active' : 'Deactivated'}.`, 'info');
      await loadData();
    } catch (err: any) {
      toast.show(err.message || 'Failed to toggle room status', 'error');
    }
  };

  // Quick Room Check-in
  const handleRecordMovement = async () => {
    if (!movementInviteeId || !currentUser) return;
    try {
      await recordMeetingEntry(movementInviteeId, movementRoomName, movementSessionName, currentUser);
      toast.show(`Delegate checked into ${movementRoomName}`, 'success');
      setIsMovementModalOpen(false);
      setMovementInviteeId('');
      await loadData();
    } catch (err: any) {
      toast.show(err.message || 'Failed to record check in', 'error');
    }
  };

  // Quick Room Exit
  const handleExitMovement = async (movementId: string) => {
    if (!currentUser) return;
    try {
      await recordMeetingExit(movementId, currentUser);
      toast.show('Delegate recorded as exited room', 'info');
      await loadData();
    } catch (err: any) {
      toast.show(err.message || 'Failed to record exit', 'error');
    }
  };

  const handleExportCSV = () => {
    if (filteredRecords.length === 0) {
      toast.show('No records to export.', 'warning');
      return;
    }

    const headers = [
      'Invitee Code',
      'Invitee Name',
      'Category',
      'Meeting Hall',
      'Seating Section',
      'Seat Number',
      'Assignment Type',
      'Attendance Status',
      'Remarks',
    ];

    const rows = filteredRecords.map((r) => [
      r.invitee?.invitee_code || '',
      r.invitee?.full_name || '',
      r.invitee?.category || '',
      r.meeting_hall,
      r.seating_section,
      r.seat_number,
      r.assignment_status,
      r.attendance_status,
      r.remarks || '',
    ]);

    exportToCSV('AIMPLB_Meeting_Hall_Seating_Allocation', headers, rows);
    toast.show('Seating chart exported to CSV.', 'success');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Meeting Halls & Delegate Movement Management"
        subtitle="Designated hall seating, delegate movements across sessions, and room master governance."
        actions={
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 h-9 sm:h-8 text-xs flex-1 sm:flex-initial"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Export</span>
            </Button>

            {activeTab === 'seating' && (
              <Button
                size="sm"
                onClick={() => {
                  setRecordToEdit(null);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-1.5 bg-[#164734] hover:bg-[#113829] text-white shadow-xs h-9 sm:h-8 text-xs flex-1 sm:flex-initial"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Assign Seat</span>
              </Button>
            )}

            {activeTab === 'movements' && (
              <Button
                size="sm"
                onClick={() => setIsMovementModalOpen(true)}
                className="flex items-center gap-1.5 bg-[#164734] hover:bg-[#113829] text-white shadow-xs h-9 sm:h-8 text-xs flex-1 sm:flex-initial"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Record Check-In</span>
              </Button>
            )}

            {activeTab === 'rooms' && isAdmin && (
              <Button
                size="sm"
                onClick={() => setIsNewRoomOpen(true)}
                className="flex items-center gap-1.5 bg-[#164734] hover:bg-[#113829] text-white shadow-xs h-9 sm:h-8 text-xs flex-1 sm:flex-initial"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Room</span>
              </Button>
            )}
          </div>
        }
      />

      {/* Primary Tab Switcher */}
      <div className="flex items-center gap-1.5 border-b border-[#E3E7E4] pb-2 text-xs font-semibold overflow-x-auto scrollbar-none -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
        <button
          onClick={() => setActiveTab('seating')}
          className={`px-3.5 py-2 min-h-[40px] rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'seating'
              ? 'bg-[#164734] text-white shadow-xs'
              : 'text-[#69756F] hover:bg-[#E8F1EC] hover:text-[#164734]'
          }`}
        >
          <Armchair className="h-4 w-4" />
          <span>Designated Seating ({records.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`px-3.5 py-2 min-h-[40px] rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'movements'
              ? 'bg-[#164734] text-white shadow-xs'
              : 'text-[#69756F] hover:bg-[#E8F1EC] hover:text-[#164734]'
          }`}
        >
          <DoorOpen className="h-4 w-4" />
          <span>Delegate Movements ({movements.length})</span>
          {stats.activeInRoomCount > 0 && (
            <span className="bg-emerald-100 text-emerald-800 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
              {stats.activeInRoomCount} Active
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('rooms')}
          className={`px-3.5 py-2 min-h-[40px] rounded-xl transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'rooms'
              ? 'bg-[#164734] text-white shadow-xs'
              : 'text-[#69756F] hover:bg-[#E8F1EC] hover:text-[#164734]'
          }`}
        >
          <Settings className="h-4 w-4" />
          <span>Rooms Master ({rooms.length})</span>
        </button>
      </div>

      {/* Real Computed Statistical Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Total Delegates"
          value={stats.totalInvitees}
          subtitle="Registered delegates"
          icon={Users}
        />
        <StatCard
          title="Seats Assigned"
          value={stats.completed}
          subtitle="Delegates with seats"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Seats Pending"
          value={stats.pending}
          subtitle="Unassigned delegates"
          icon={AlertCircle}
          variant={stats.pending > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="Main Auditorium"
          value={stats.mainAuditoriumCount}
          subtitle="Auditorium seats"
          icon={Armchair}
          variant="highlight"
        />
        <StatCard
          title="VIP Presidium"
          value={stats.vipCount}
          subtitle="Dais & Stage rows"
          icon={Armchair}
          variant="special"
        />
        <StatCard
          title="Active in Rooms"
          value={stats.activeInRoomCount}
          subtitle="Delegates inside rooms"
          icon={CheckCircle2}
          variant="success"
        />
      </div>

      {/* TAB 1: DESIGNATED SEATING ASSIGNMENTS */}
      {activeTab === 'seating' && (
        <div className="space-y-4">
          {/* Pending Warning Banner */}
          {unassignedInvitees.length > 0 && (
            <div className="p-4 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-[#1A221E] shadow-xs">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="h-4 w-4 text-[#C59A3F] shrink-0" />
                <span>
                  <strong>{unassignedInvitees.length} delegates</strong> currently do not have an assigned seat in any hall.
                </span>
              </div>
              <button
                onClick={() => setShowPendingOnly(!showPendingOnly)}
                className="font-bold text-[#164734] hover:underline text-left sm:text-right shrink-0"
              >
                {showPendingOnly ? 'View all seat allocations' : 'View unassigned delegates'}
              </button>
            </div>
          )}

          {/* Filter and Search Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-[#E3E7E4] shadow-card-subtle flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search delegate, seat number, block, hall..."
              className="w-full md:w-80"
            />

            <div className="flex flex-wrap items-center gap-2 justify-between md:justify-end">
              {/* Hall filter with 4 Official Rooms */}
              <select
                value={hallFilter}
                onChange={(e) => setHallFilter(e.target.value)}
                className="h-9 text-xs rounded-lg border border-[#E3E7E4] bg-white px-2.5 text-[#1A221E] font-medium focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
              >
                <option value="all">All Meeting Halls ({records.length})</option>
                <option value="Main Auditorium">Main Auditorium</option>
                <option value="Founder Committee Room">Founder Committee Room</option>
                <option value="Executive Committee Room">Executive Committee Room</option>
                <option value="Member Committee Room">Member Committee Room</option>
              </select>

              {/* Section filter */}
              <select
                value={sectionFilter}
                onChange={(e) => setSectionFilter(e.target.value)}
                className="h-9 text-xs rounded-lg border border-[#E3E7E4] bg-white px-2.5 text-[#1A221E] font-medium focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
              >
                <option value="all">All Seating Sections</option>
                <option value="Presidium / VIP Row">Presidium / VIP Row</option>
                <option value="Founder Members Section">Founder Members Section</option>
                <option value="General Members - Block A">General Members - Block A</option>
                <option value="General Members - Block B">General Members - Block B</option>
                <option value="Special Invitees Wing">Special Invitees Wing</option>
                <option value="Press & Media Gallery">Press & Media Gallery</option>
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

          {/* Main Seating Content */}
          {isLoading ? (
            <LoadingSkeleton rows={6} />
          ) : showPendingOnly ? (
            <div className="bg-white rounded-2xl border border-[#E3E7E4] p-5 shadow-card-subtle">
              <div className="flex items-center justify-between pb-3 border-b border-[#F4F6F4] mb-4">
                <h2 className="text-sm font-bold text-[#1A221E]">
                  Delegates Awaiting Seat Assignment ({unassignedInvitees.length})
                </h2>
                <Button size="sm" variant="outline" onClick={() => setShowPendingOnly(false)}>
                  Back to Assigned Seats
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
                      <span>Assign Seat</span>
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ) : filteredRecords.length === 0 ? (
            <EmptyState
              title="No seating assignments found"
              description="No delegates match this query. Assign seats for Main Auditorium and committee rooms."
              actionLabel="Assign Seat"
              onAction={() => {
                setRecordToEdit(null);
                setIsModalOpen(true);
              }}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-[#E3E7E4] shadow-card-subtle overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E3E7E4] bg-[#FAF9F6] text-[#69756F] font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Delegate</th>
                      <th className="py-3 px-4">Meeting Hall</th>
                      <th className="py-3 px-4">Seating Section</th>
                      <th className="py-3 px-4">Seat Number</th>
                      <th className="py-3 px-4">Tier</th>
                      <th className="py-3 px-4">Attendance</th>
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
                          <div className="font-semibold text-[#1A221E] text-sm group-hover:text-[#164734] transition-colors">
                            {r.invitee?.full_name}
                          </div>
                          <div className="text-[11px] text-[#69756F]">
                            {r.invitee?.category} • {r.invitee?.city}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-[#1A221E] whitespace-nowrap">
                          {r.meeting_hall}
                        </td>
                        <td className="py-3.5 px-4 text-[#1A221E] whitespace-nowrap">
                          <span className="font-medium">{r.seating_section}</span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-base text-[#164734] bg-[#E8F1EC] px-3 py-0.5 rounded-lg border border-[#C5DEC8]">
                            {r.seat_number}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge
                            variant={r.assignment_status === 'VIP' ? 'vip' : 'neutral'}
                            label={r.assignment_status}
                            size="sm"
                          />
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              r.attendance_status === 'Present'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-[#FAF9F6] text-[#69756F] border-[#E3E7E4]'
                            }`}
                          >
                            {r.attendance_status}
                          </span>
                        </td>
                        <td
                          className="py-3.5 px-4 text-right whitespace-nowrap space-x-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            title="View Profile"
                            onClick={() => r.invitee && navigate(`/invitees/${r.invitee.id}`)}
                            className="p-1.5 text-[#69756F] hover:text-[#164734] hover:bg-[#E8F1EC] rounded-lg transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            title="Edit Seat Assignment"
                            onClick={() => {
                              setRecordToEdit(r);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-[#69756F] hover:text-[#164734] hover:bg-[#E8F1EC] rounded-lg transition-colors"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {isAdmin && (
                            <button
                              title="Delete Seat Assignment"
                              onClick={() => setRecordToDelete(r)}
                              className="p-1.5 text-[#69756F] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DELEGATE ROOM MOVEMENTS & ATTENDANCE */}
      {activeTab === 'movements' && (
        <div className="space-y-4">
          <div className="bg-white p-3.5 rounded-xl border border-[#E3E7E4] shadow-card-subtle flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
            <SearchInput
              value={movementSearch}
              onChange={setMovementSearch}
              placeholder="Search delegate in room movements..."
              className="w-full md:w-80"
            />
            <div className="flex items-center gap-2">
              <select
                value={movementRoomFilter}
                onChange={(e) => setMovementRoomFilter(e.target.value)}
                className="h-9 text-xs rounded-lg border border-[#E3E7E4] bg-white px-2.5 text-[#1A221E] font-medium"
              >
                <option value="all">All Rooms ({movements.length})</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.name}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {filteredMovements.length === 0 ? (
            <EmptyState
              title="No delegate room movements recorded"
              description="Track movements as delegates enter working committee rooms and auditoriums."
              actionLabel="Record Room Check-In"
              onAction={() => setIsMovementModalOpen(true)}
            />
          ) : (
            <div className="bg-white rounded-2xl border border-[#E3E7E4] shadow-card-subtle overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#E3E7E4] bg-[#FAF9F6] text-[#69756F] font-semibold uppercase tracking-wider text-[11px]">
                      <th className="py-3 px-4">Delegate</th>
                      <th className="py-3 px-4">Meeting Room</th>
                      <th className="py-3 px-4">Session Name</th>
                      <th className="py-3 px-4">In Time</th>
                      <th className="py-3 px-4">Out Time</th>
                      <th className="py-3 px-4">Duration</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F6F4]">
                    {filteredMovements.map((m) => (
                      <tr key={m.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                        <td className="py-3 px-4 font-semibold text-[#1A221E]">
                          <div>{m.invitee?.full_name || 'Delegate'}</div>
                          <div className="text-[10px] text-[#69756F]">{m.invitee?.category}</div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-[#164734]">{m.room_name}</td>
                        <td className="py-3 px-4 text-[#4A5550]">{m.session_name}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#164734]">
                          {formatDateTime(m.in_time)}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#4A5550]">
                          {m.out_time ? formatDateTime(m.out_time) : <span className="text-blue-700 font-bold">Inside Room</span>}
                        </td>
                        <td className="py-3 px-4 text-[#4A5550]">{formatDuration(m.duration_minutes)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                              m.status === 'IN' && !m.out_time
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {m.status === 'IN' && !m.out_time ? 'IN ROOM' : 'EXITED'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {m.status === 'IN' && !m.out_time ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleExitMovement(m.id)}
                              className="h-7 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                            >
                              <LogOut className="h-3 w-3 mr-1" />
                              <span>Exit Room</span>
                            </Button>
                          ) : (
                            <span className="text-[11px] text-[#69756F] italic">Completed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: MEETING ROOMS MASTER CONFIGURATION */}
      {activeTab === 'rooms' && (
        <div className="bg-white rounded-2xl border border-[#E3E7E4] p-5 shadow-card-subtle space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[#F4F6F4] gap-2">
            <div>
              <h2 className="text-sm font-bold text-[#1A221E]">
                Official Committee Rooms & Auditorium Master
              </h2>
              <p className="text-xs text-[#69756F]">
                Configure official room designations. Admin can edit room names, add halls, or deactivate rooms.
              </p>
            </div>
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => setIsNewRoomOpen(true)}
                className="h-8 text-xs bg-[#164734] hover:bg-[#123829] text-white self-start sm:self-center"
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                <span>Add Room</span>
              </Button>
            )}
          </div>

          <div className="overflow-x-auto border border-[#E3E7E4] rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF9F6] border-b border-[#E3E7E4] text-[#69756F] font-semibold text-[11px] uppercase tracking-wider">
                  <th className="py-3 px-4">Room Name</th>
                  <th className="py-3 px-4">Standard Capacity</th>
                  <th className="py-3 px-4">Operating Status</th>
                  <th className="py-3 px-4 text-right">Admin Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4F6F4]">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-sm text-[#1A221E]">
                      {room.name}
                    </td>
                    <td className="py-3.5 px-4 text-[#4A5550]">
                      {room.capacity} seats
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                          room.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                        }`}
                      >
                        {room.is_active ? 'Active' : 'Deactivated'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingRoom(room);
                              setEditingRoomName(room.name);
                            }}
                            className="h-7 text-xs px-2.5"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            <span>Rename</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleToggleRoomActive(room)}
                            className={`h-7 text-xs px-2.5 ${
                              room.is_active ? 'text-amber-700 border-amber-300' : 'text-emerald-700 border-emerald-300'
                            }`}
                          >
                            <span>{room.is_active ? 'Deactivate' : 'Activate'}</span>
                          </Button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Form Modal for Seating Assignment */}
      <MeetingHallFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setRecordToEdit(null);
        }}
        onSuccess={() => {
          loadData();
          toast.show(recordToEdit ? 'Seat assignment updated.' : 'Seat successfully allocated.', 'success');
        }}
        recordToEdit={recordToEdit}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(recordToDelete)}
        onClose={() => setRecordToDelete(null)}
        onConfirm={handleDelete}
        title="Remove Seat Assignment"
        message={`Are you sure you want to remove designated seat ${recordToDelete?.seat_number} for ${recordToDelete?.invitee?.full_name}?`}
        confirmLabel="Remove Seat"
        variant="danger"
        isLoading={isDeleting}
      />

      {/* Add New Room Modal */}
      {isNewRoomOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 border border-[#E3E7E4] shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-bold text-[#1A221E]">Add New Meeting Room</h3>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#1A221E] mb-1.5">Room Name</label>
                <input
                  type="text"
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="e.g. Media Committee Hall"
                  className="w-full h-10 rounded-lg border border-[#E3E7E4] px-3 text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#1A221E] mb-1.5">Capacity</label>
                <input
                  type="number"
                  value={newRoomCapacity}
                  onChange={(e) => setNewRoomCapacity(parseInt(e.target.value, 10) || 50)}
                  className="w-full h-10 rounded-lg border border-[#E3E7E4] px-3 text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20"
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-[#F4F6F4]">
              <Button variant="outline" size="sm" onClick={() => setIsNewRoomOpen(false)} className="w-full sm:w-auto h-10 sm:h-9 text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleCreateRoom} className="w-full sm:w-auto h-10 sm:h-9 text-xs bg-[#164734] hover:bg-[#123829] text-white">
                Create Room
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Rename Room Modal */}
      {editingRoom && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 border border-[#E3E7E4] shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-bold text-[#1A221E]">Rename Room</h3>
            <div className="text-xs">
              <label className="block font-semibold text-[#1A221E] mb-1.5">Room Name</label>
              <input
                type="text"
                value={editingRoomName}
                onChange={(e) => setEditingRoomName(e.target.value)}
                className="w-full h-10 rounded-lg border border-[#E3E7E4] px-3 text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20"
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-[#F4F6F4]">
              <Button variant="outline" size="sm" onClick={() => setEditingRoom(null)} className="w-full sm:w-auto h-10 sm:h-9 text-xs">
                Cancel
              </Button>
              <Button size="sm" onClick={handleUpdateRoomName} className="w-full sm:w-auto h-10 sm:h-9 text-xs bg-[#164734] hover:bg-[#123829] text-white">
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Record Delegate Room Check-In Modal */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 border border-[#E3E7E4] shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base sm:text-lg font-bold text-[#1A221E]">Record Room Check-In</h3>
            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#1A221E] mb-1.5">Select Delegate</label>
                <select
                  value={movementInviteeId}
                  onChange={(e) => setMovementInviteeId(e.target.value)}
                  className="w-full h-10 rounded-lg border border-[#E3E7E4] px-3 bg-white text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20"
                >
                  <option value="">Choose a delegate...</option>
                  {invitees.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.full_name} ({inv.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#1A221E] mb-1.5">Select Room</label>
                <select
                  value={movementRoomName}
                  onChange={(e) => setMovementRoomName(e.target.value)}
                  className="w-full h-10 rounded-lg border border-[#E3E7E4] px-3 bg-white text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20"
                >
                  {rooms.filter((r) => r.is_active).map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#1A221E] mb-1.5">Session Name</label>
                <input
                  type="text"
                  value={movementSessionName}
                  onChange={(e) => setMovementSessionName(e.target.value)}
                  placeholder="e.g. Inaugural Session or Working Council"
                  className="w-full h-10 rounded-lg border border-[#E3E7E4] px-3 text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20"
                />
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-[#F4F6F4]">
              <Button variant="outline" size="sm" onClick={() => setIsMovementModalOpen(false)} className="w-full sm:w-auto h-10 sm:h-9 text-xs">
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!movementInviteeId}
                onClick={handleRecordMovement}
                className="w-full sm:w-auto h-10 sm:h-9 text-xs bg-[#164734] hover:bg-[#123829] text-white"
              >
                Record Entry
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
