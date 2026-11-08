import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserCheck,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit,
  Download,
  Filter,
  Package,
  LayoutGrid,
  List,
  Sparkles,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { MobileDataCard } from '@/components/common/MobileDataCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { SearchInput } from '@/components/common/SearchInput';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ReceptionFormModal } from './ReceptionFormModal';
import { ReceptionRecord, ReceptionStatus } from '@/types';
import {
  getReceptionRecords,
  updateReceptionRecord,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { exportToCSV } from '@/lib/exportUtils';
import { formatDateTime } from '@/lib/utils';

export const ReceptionDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [records, setRecords] = useState<ReceptionRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'auto' | 'cards' | 'table'>('auto');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<ReceptionRecord | null>(null);

  const loadData = useCallback(async () => {
    try {
      const recs = await getReceptionRecords();
      setRecords(recs);
    } catch (err) {
      console.error('Error loading reception data:', err);
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
    const totalExpected = records.length;
    const checkedIn = records.filter((r) => r.reception_status === 'Checked In').length;
    const arrived = records.filter((r) => r.reception_status === 'Arrived').length;
    const received = records.filter((r) => r.reception_status === 'Received').length;
    const completed = records.filter((r) => r.reception_status === 'Completed').length;
    const arrivalsCompleted = checkedIn + completed;
    const pendingReception = records.filter((r) => r.reception_status === 'Expected').length;
    const notYetReceived = totalExpected - (arrived + received + checkedIn + completed);

    return {
      totalExpected,
      arrivalsCompleted,
      pendingReception,
      checkedIn,
      notYetReceived: Math.max(0, notYetReceived),
      kitsDistributed: records.filter((r) => r.welcome_kit_status === 'Distributed').length,
    };
  }, [records]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        r.invitee?.full_name.toLowerCase().includes(q) ||
        r.invitee?.invitee_code.toLowerCase().includes(q) ||
        r.assigned_volunteer?.toLowerCase().includes(q) ||
        r.reception_point?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || r.reception_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [records, searchQuery, statusFilter]);

  // Quick status update direct from table / mobile card
  const handleQuickStatusChange = async (
    record: ReceptionRecord,
    newStatus: ReceptionStatus
  ) => {
    if (!currentUser) return;
    try {
      const now = new Date().toISOString();
      await updateReceptionRecord(
        record.id,
        {
          reception_status: newStatus,
          actual_arrival: record.actual_arrival || now,
          welcome_kit_status: newStatus === 'Checked In' ? 'Distributed' : record.welcome_kit_status,
          registration_status: newStatus === 'Checked In' ? 'Completed' : record.registration_status,
        },
        currentUser
      );
      toast.success(
        `${record.invitee?.full_name} Checked In!`,
        'Welcome kit distributed and registration completed.'
      );
      await loadData();
    } catch (err) {
      console.error('Quick update error:', err);
      toast.error('Failed to update reception status.');
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
      'Phone',
      'Reception Status',
      'Expected Arrival',
      'Actual Arrival',
      'Assigned Volunteer',
      'Reception Desk',
      'Welcome Kit',
      'Registration Status',
      'Remarks',
    ];

    const rows = filteredRecords.map((r) => [
      r.invitee?.invitee_code || '',
      r.invitee?.full_name || '',
      r.invitee?.category || '',
      r.invitee?.phone || '',
      r.reception_status,
      formatDateTime(r.expected_arrival),
      formatDateTime(r.actual_arrival),
      r.assigned_volunteer || '',
      r.reception_point || '',
      r.welcome_kit_status || '',
      r.registration_status || '',
      r.remarks || '',
    ]);

    exportToCSV('AIMPLB_Reception_And_CheckIn_Status', headers, rows);
    toast.success('Reception log exported to CSV', `${filteredRecords.length} records.`);
  };

  const getStatusVariant = (status: ReceptionStatus) => {
    switch (status) {
      case 'Checked In':
      case 'Completed':
        return 'success' as const;
      case 'Arrived':
      case 'Received':
        return 'info' as const;
      case 'Expected':
      default:
        return 'pending' as const;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Reception & Help Desk Management"
        subtitle="Coordinate delegate greeting, registration desk check-ins, and conference kit handovers"
        badge={`${records.length} Tracked`}
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
              <UserCheck className="h-3.5 w-3.5" />
              <span>Record Arrival</span>
            </Button>
          </div>
        }
      />

      {/* Real Computed Statistical Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatCard
          title="Expected Arrivals"
          value={stats.totalExpected}
          subtitle="Tracked delegates"
          icon={Clock}
        />
        <StatCard
          title="Arrivals Done"
          value={stats.arrivalsCompleted}
          subtitle="Checked in & done"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="In Transit"
          value={stats.pendingReception}
          subtitle="Awaiting gate arrival"
          icon={AlertCircle}
          variant={stats.pendingReception > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="Checked In"
          value={stats.checkedIn}
          subtitle="At venue desk"
          icon={UserCheck}
          variant="highlight"
        />
        <StatCard
          title="Not Received"
          value={stats.notYetReceived}
          subtitle="Awaiting pickup"
          icon={AlertCircle}
        />
        <StatCard
          title="Kits Handed Over"
          value={stats.kitsDistributed}
          subtitle="Badges & bags"
          icon={Package}
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E3E7E4] shadow-card-subtle flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search delegate, volunteer, reception desk..."
          className="w-full md:w-80"
        />

        <div className="flex flex-wrap items-center gap-2 justify-between md:justify-end">
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <Filter className="h-3.5 w-3.5 text-[#69756F] shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 w-full sm:w-auto text-xs rounded-lg border border-[#E3E7E4] bg-white px-3 text-[#1A221E] font-medium focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            >
              <option value="all">All Reception Statuses ({records.length})</option>
              <option value="Expected">Expected</option>
              <option value="Arrived">Arrived</option>
              <option value="Received">Received</option>
              <option value="Checked In">Checked In</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

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
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          title="No reception records found"
          description="No delegates match this query. Record expected arrivals or check in delegates."
          actionLabel="Record Arrival"
          onAction={() => {
            setRecordToEdit(null);
            setIsModalOpen(true);
          }}
        />
      ) : (
        <>
          {/* Mobile Cards View with One-Click Check-In */}
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
              const isCheckedIn =
                r.reception_status === 'Checked In' || r.reception_status === 'Completed';

              return (
                <MobileDataCard
                  key={r.id}
                  title={r.invitee?.full_name || 'Unknown Delegate'}
                  identifier={r.invitee?.invitee_code}
                  subtitle={r.reception_point || 'Main Lobby Desk'}
                  badge={
                    <StatusBadge
                      variant={getStatusVariant(r.reception_status)}
                      label={r.reception_status}
                      size="sm"
                    />
                  }
                  onClick={() => r.invitee && navigate(`/invitees/${r.invitee.id}`)}
                  fields={[
                    {
                      label: 'Expected Arrival',
                      value: formatDateTime(r.expected_arrival),
                      icon: Clock,
                    },
                    {
                      label: 'Actual Arrival',
                      value: r.actual_arrival ? formatDateTime(r.actual_arrival) : 'Pending arrival',
                    },
                    {
                      label: 'Volunteer Lead',
                      value: r.assigned_volunteer || 'Help Desk Lead',
                      icon: User,
                    },
                    {
                      label: 'Welcome Kit',
                      value: (
                        <span
                          className={`font-semibold text-xs ${
                            r.welcome_kit_status === 'Distributed'
                              ? 'text-emerald-700'
                              : 'text-[#69756F]'
                          }`}
                        >
                          {r.welcome_kit_status || 'Pending'}
                        </span>
                      ),
                      icon: Package,
                    },
                  ]}
                  expandableFields={[
                    ...(r.invitee?.phone
                      ? [
                          {
                            label: 'Delegate Contact',
                            value: r.invitee.phone,
                          },
                        ]
                      : []),
                    ...(r.remarks ? [{ label: 'Remarks', value: r.remarks }] : []),
                  ]}
                  actions={
                    <div className="flex items-center gap-2 w-full justify-between pt-1">
                      {!isCheckedIn ? (
                        <Button
                          size="sm"
                          className="flex-1 h-9 text-xs bg-emerald-700 hover:bg-emerald-800 text-white font-bold shadow-xs flex items-center justify-center gap-1.5"
                          onClick={() => handleQuickStatusChange(r, 'Checked In')}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          <span>One-Tap Check-In</span>
                        </Button>
                      ) : (
                        <div className="flex-1 flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 py-1.5 px-3 rounded-lg justify-center">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span>Checked In</span>
                        </div>
                      )}

                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-9 px-3"
                        onClick={() => {
                          setRecordToEdit(r);
                          setIsModalOpen(true);
                        }}
                        title="Edit Details"
                      >
                        <Edit className="h-3.5 w-3.5 text-[#4A5550]" />
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
                    <th className="py-3 px-4">Reception Status</th>
                    <th className="py-3 px-4">Expected Arrival</th>
                    <th className="py-3 px-4">Actual Arrival</th>
                    <th className="py-3 px-4">Assigned Volunteer</th>
                    <th className="py-3 px-4">Kit & Badge</th>
                    <th className="py-3 px-4 text-center">Fast Check-In</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6F4]">
                  {filteredRecords.map((r) => {
                    const isCheckedIn =
                      r.reception_status === 'Checked In' || r.reception_status === 'Completed';

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

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge
                            variant={getStatusVariant(r.reception_status)}
                            label={r.reception_status}
                            size="sm"
                          />
                        </td>

                        <td className="py-3.5 px-4 text-[#1A221E] whitespace-nowrap">
                          {formatDateTime(r.expected_arrival)}
                        </td>

                        <td className="py-3.5 px-4 text-[#1A221E] whitespace-nowrap">
                          {formatDateTime(r.actual_arrival)}
                        </td>

                        <td className="py-3.5 px-4 text-[#1A221E] whitespace-nowrap">
                          <div className="font-medium">{r.assigned_volunteer || 'Help Desk Lead'}</div>
                          <div className="text-[11px] text-[#69756F]">{r.reception_point}</div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                              r.welcome_kit_status === 'Distributed'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-[#FAF9F6] text-[#69756F] border-[#E3E7E4]'
                            }`}
                          >
                            {r.welcome_kit_status || 'Pending'}
                          </span>
                        </td>

                        <td
                          className="py-3.5 px-4 text-center whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!isCheckedIn ? (
                            <Button
                              size="sm"
                              className="h-8 text-xs px-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold shadow-xs"
                              onClick={() => handleQuickStatusChange(r, 'Checked In')}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              <span>Check In</span>
                            </Button>
                          ) : (
                            <span className="text-emerald-700 font-semibold text-xs inline-flex items-center gap-1">
                              <CheckCircle2 className="h-4 w-4" />
                              <span>Checked In</span>
                            </span>
                          )}
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
                            title="Edit Reception Record"
                            onClick={() => {
                              setRecordToEdit(r);
                              setIsModalOpen(true);
                            }}
                            className="p-1.5 text-[#69756F] hover:text-[#164734] hover:bg-[#E8F1EC] rounded-lg transition-colors"
                          >
                            <Edit className="h-4 w-4" />
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

      {/* Form Modal */}
      <ReceptionFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setRecordToEdit(null);
        }}
        onSuccess={() => {
          loadData();
          toast.success(
            recordToEdit ? 'Reception status updated.' : 'Arrival recorded successfully.'
          );
        }}
        recordToEdit={recordToEdit}
      />
    </div>
  );
};
