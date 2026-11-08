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
import { MeetingHallFormModal } from './MeetingHallFormModal';
import { MeetingHallRecord, Invitee } from '@/types';
import {
  getMeetingHallRecords,
  getInvitees,
  deleteMeetingHallRecord,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { exportToCSV } from '@/lib/exportUtils';

export const MeetingHallDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [records, setRecords] = useState<MeetingHallRecord[]>([]);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'auto' | 'cards' | 'table'>('auto');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [hallFilter, setHallFilter] = useState<string>('all');
  const [sectionFilter, setSectionFilter] = useState<string>('all');
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<MeetingHallRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<MeetingHallRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [halls, invs] = await Promise.all([getMeetingHallRecords(), getInvitees()]);
      setRecords(halls);
      setInvitees(invs);
    } catch (err) {
      console.error('Error loading hall assignments:', err);
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
    const presentCount = records.filter((r) => r.attendance_status === 'Present').length;
    const vipCount = records.filter((r) => r.assignment_status === 'VIP').length;

    return {
      totalInvitees,
      completed,
      pending,
      mainAuditoriumCount,
      presentCount,
      vipCount,
    };
  }, [invitees, records]);

  // Invitees without seat assignments
  const unassignedInvitees = useMemo(() => {
    const assignedIds = new Set(records.map((r) => r.invitee_id));
    return invitees.filter((i) => !assignedIds.has(i.id));
  }, [invitees, records]);

  // Filtered records
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

  const handleDelete = async () => {
    if (!recordToDelete || !currentUser) return;
    setIsDeleting(true);
    try {
      await deleteMeetingHallRecord(recordToDelete.id, currentUser);
      toast.success(
        'Seat assignment removed',
        `Seat ${recordToDelete.seat_number} for ${recordToDelete.invitee?.full_name} unassigned.`
      );
      setRecordToDelete(null);
      await loadData();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to remove seat assignment.');
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
    toast.success('Seating chart exported to CSV', `${filteredRecords.length} records.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Meeting Hall & Seating Management"
        subtitle="Manage stage presidium, founder members blocks, general seating, and attendance verification"
        badge={`${records.length} Seats Assigned`}
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
              <span>Assign Seat</span>
            </Button>
          </div>
        }
      />

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
          title="Present in Hall"
          value={stats.presentCount}
          subtitle="Verified attendance"
          icon={CheckCircle2}
          variant="success"
        />
      </div>

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
          {/* Hall filter */}
          <select
            value={hallFilter}
            onChange={(e) => setHallFilter(e.target.value)}
            className="h-9 text-xs rounded-lg border border-[#E3E7E4] bg-white px-2.5 text-[#1A221E] font-medium focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
          >
            <option value="all">All Meeting Halls ({records.length})</option>
            <option value="Main Auditorium">Main Auditorium</option>
            <option value="Conference Hall A">Conference Hall A</option>
            <option value="Conference Hall B">Conference Hall B</option>
            <option value="Executive Committee Room">Executive Committee Room</option>
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

      {/* Main Content Area */}
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
          description="No delegates match this query. Assign seats for Main Auditorium and committee halls."
          actionLabel="Assign Seat"
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
                subtitle={r.meeting_hall}
                badge={
                  <span className="font-mono text-xs font-bold text-[#164734] bg-[#E8F1EC] px-2.5 py-0.5 rounded-md">
                    Seat {r.seat_number}
                  </span>
                }
                onClick={() => r.invitee && navigate(`/invitees/${r.invitee.id}`)}
                fields={[
                  {
                    label: 'Seating Section',
                    value: r.seating_section,
                    icon: Armchair,
                  },
                  {
                    label: 'Assignment Tier',
                    value: (
                      <StatusBadge
                        variant={r.assignment_status === 'VIP' ? 'vip' : 'neutral'}
                        label={r.assignment_status}
                        size="sm"
                      />
                    ),
                  },
                  {
                    label: 'Attendance',
                    value: (
                      <span
                        className={`font-semibold text-xs ${
                          r.attendance_status === 'Present'
                            ? 'text-emerald-700'
                            : 'text-[#69756F]'
                        }`}
                      >
                        {r.attendance_status}
                      </span>
                    ),
                  },
                  {
                    label: 'Delegate Category',
                    value: r.invitee?.category || 'General',
                  },
                ]}
                expandableFields={[
                  ...(r.invitee?.phone
                    ? [{ label: 'Delegate Phone', value: r.invitee.phone }]
                    : []),
                  ...(r.remarks ? [{ label: 'Protocol Notes', value: r.remarks }] : []),
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
                      title="Edit Seat"
                    >
                      <Edit className="h-3.5 w-3.5 text-[#4A5550]" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 px-2.5 text-red-600 hover:bg-red-50 hover:border-red-200"
                      onClick={() => setRecordToDelete(r)}
                      title="Delete Seat"
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
                    <th className="py-3 px-4">Meeting Hall</th>
                    <th className="py-3 px-4">Seating Section</th>
                    <th className="py-3 px-4">Seat Number</th>
                    <th className="py-3 px-4">Tier</th>
                    <th className="py-3 px-4">Attendance</th>
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
                        <div className="text-[11px] text-[#69756F]">{r.invitee?.category}</div>
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

                      <td className="py-3.5 px-4 text-[#69756F] max-w-[150px] truncate">
                        {r.remarks || '—'}
                      </td>

                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap space-x-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          title="View Complete Profile"
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

                        <button
                          title="Delete Seat Assignment"
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
      <MeetingHallFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setRecordToEdit(null);
        }}
        onSuccess={() => {
          loadData();
          toast.success(
            recordToEdit ? 'Seat assignment updated.' : 'Seat successfully allocated.'
          );
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
    </div>
  );
};
