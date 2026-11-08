import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UtensilsCrossed,
  Coffee,
  Plus,
  Download,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit,
  Trash2,
  Calendar,
  Sparkles,
  LayoutGrid,
  List,
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
import { FoodFormModal } from './FoodFormModal';
import { FoodRecord, Invitee } from '@/types';
import { getFoodRecords, getInvitees, deleteFoodRecord } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { exportToCSV } from '@/lib/exportUtils';
import { formatDate } from '@/lib/utils';

export const FoodDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const toast = useToast();

  const [records, setRecords] = useState<FoodRecord[]>([]);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'auto' | 'cards' | 'table'>('auto');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [dietFilter, setDietFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [showPendingOnly, setShowPendingOnly] = useState(false);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<FoodRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<FoodRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [foods, invs] = await Promise.all([getFoodRecords(), getInvitees()]);
      setRecords(foods);
      setInvitees(invs);
    } catch (err) {
      console.error('Error loading food records:', err);
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

    const breakfastCount = records.filter((r) => r.breakfast).length;
    const lunchCount = records.filter((r) => r.lunch).length;
    const dinnerCount = records.filter((r) => r.dinner).length;
    const specialDietCount = records.filter(
      (r) => r.dietary_preference !== 'Non-vegetarian' || Boolean(r.special_requirements)
    ).length;

    return {
      totalInvitees,
      completed,
      pending,
      breakfastCount,
      lunchCount,
      dinnerCount,
      specialDietCount,
    };
  }, [invitees, records]);

  // Invitees without food arrangement
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
        r.food_provider?.toLowerCase().includes(q) ||
        r.delivery_location?.toLowerCase().includes(q);

      const matchesDiet = dietFilter === 'all' || r.dietary_preference === dietFilter;
      const matchesDate = dateFilter === 'all' || r.meal_date === dateFilter;

      return matchesSearch && matchesDiet && matchesDate;
    });
  }, [records, searchQuery, dietFilter, dateFilter]);

  const handleDelete = async () => {
    if (!recordToDelete || !currentUser) return;
    setIsDeleting(true);
    try {
      await deleteFoodRecord(recordToDelete.id, currentUser);
      toast.success(
        'Meal schedule removed',
        `Meal record for ${recordToDelete.invitee?.full_name} deleted.`
      );
      setRecordToDelete(null);
      await loadData();
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to delete meal schedule.');
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
      'Meal Date',
      'Breakfast',
      'Lunch',
      'Dinner',
      'Tea & Refreshments',
      'Dietary Preference',
      'Special Dietary Notes',
      'Caterer / Provider',
      'Delivery Location',
      'Remarks',
    ];

    const rows = filteredRecords.map((r) => [
      r.invitee?.invitee_code || '',
      r.invitee?.full_name || '',
      r.invitee?.category || '',
      formatDate(r.meal_date),
      r.breakfast ? 'YES' : 'NO',
      r.lunch ? 'YES' : 'NO',
      r.dinner ? 'YES' : 'NO',
      r.refreshments ? 'YES' : 'NO',
      r.dietary_preference,
      r.special_requirements || '',
      r.food_provider || '',
      r.delivery_location || '',
      r.remarks || '',
    ]);

    exportToCSV('AIMPLB_Food_And_Catering_Requirements', headers, rows);
    toast.success('Catering sheet exported to CSV', `${filteredRecords.length} records.`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Food & Catering Management"
        subtitle="Coordinate breakfast, banquet lunches, dinners, and special diabetic & dietary provisions"
        badge={`${records.length} Meal Schedules`}
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
              <span>New Meal Schedule</span>
            </Button>
          </div>
        }
      />

      {/* Real Computed Statistical Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
        <StatCard
          title="Total Delegates"
          value={stats.totalInvitees}
          subtitle="Registered delegates"
          icon={UtensilsCrossed}
        />
        <StatCard
          title="Arrangements Set"
          value={stats.completed}
          subtitle="Delegates with food"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Arrang. Pending"
          value={stats.pending}
          subtitle="Awaiting meal plan"
          icon={AlertCircle}
          variant={stats.pending > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="Breakfasts"
          value={stats.breakfastCount}
          subtitle="Morning servings"
          icon={Coffee}
        />
        <StatCard
          title="Lunches"
          value={stats.lunchCount}
          subtitle="Afternoon banquets"
          icon={UtensilsCrossed}
          variant="highlight"
        />
        <StatCard
          title="Dinners"
          value={stats.dinnerCount}
          subtitle="Evening banquets"
          icon={UtensilsCrossed}
        />
        <StatCard
          title="Special Diets"
          value={stats.specialDietCount}
          subtitle="Diabetic / Medical"
          icon={AlertCircle}
          variant="special"
        />
      </div>

      {/* Pending Unassigned Banner */}
      {unassignedInvitees.length > 0 && (
        <div className="p-4 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-[#1A221E] shadow-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="h-4 w-4 text-[#C59A3F] shrink-0" />
            <span>
              <strong>{unassignedInvitees.length} delegates</strong> currently have no meal arrangements recorded.
            </span>
          </div>
          <button
            onClick={() => setShowPendingOnly(!showPendingOnly)}
            className="font-bold text-[#164734] hover:underline text-left sm:text-right shrink-0"
          >
            {showPendingOnly ? 'Show all meal schedules' : 'View unassigned delegates'}
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E3E7E4] shadow-card-subtle flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by delegate name, ID, caterer, dining hall..."
          className="w-full md:w-80"
        />

        <div className="flex flex-wrap items-center gap-2 justify-between md:justify-end">
          {/* Dietary preference filter */}
          <select
            value={dietFilter}
            onChange={(e) => setDietFilter(e.target.value)}
            className="h-9 text-xs rounded-lg border border-[#E3E7E4] bg-white px-2.5 text-[#1A221E] font-medium focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
          >
            <option value="all">All Dietary Preferences</option>
            <option value="Non-vegetarian">Non-vegetarian</option>
            <option value="Vegetarian">Vegetarian</option>
            <option value="Diabetic">Diabetic / Low Sugar</option>
            <option value="Low Sodium">Low Sodium (BP Friendly)</option>
            <option value="Other">Other Medical Diet</option>
          </select>

          {/* Date filter */}
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="h-9 text-xs rounded-lg border border-[#E3E7E4] bg-white px-2.5 text-[#1A221E] font-medium focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
          >
            <option value="all">All Session Dates</option>
            <option value="2026-12-14">14 Dec 2026 (Day 1)</option>
            <option value="2026-12-15">15 Dec 2026 (Day 2)</option>
            <option value="2026-12-16">16 Dec 2026 (Day 3)</option>
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
        /* Invitees Without Food Arrangement View */
        <div className="bg-white rounded-2xl border border-[#E3E7E4] p-5 shadow-card-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-[#F4F6F4] mb-4">
            <h2 className="text-sm font-bold text-[#1A221E]">
              Delegates Awaiting Food Arrangement ({unassignedInvitees.length})
            </h2>
            <Button size="sm" variant="outline" onClick={() => setShowPendingOnly(false)}>
              Back to Meal Schedules
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
                  <span>Assign Meals</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : filteredRecords.length === 0 ? (
        <EmptyState
          title="No meal records found"
          description="No catering schedules match the selected criteria. Set up daily meal plans for session delegates."
          actionLabel="Add Meal Plan"
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
                subtitle={`Meal Date: ${formatDate(r.meal_date)}`}
                badge={
                  <StatusBadge
                    variant={r.dietary_preference === 'Non-vegetarian' ? 'neutral' : 'special'}
                    label={r.dietary_preference}
                    size="sm"
                  />
                }
                onClick={() => r.invitee && navigate(`/invitees/${r.invitee.id}`)}
                fields={[
                  {
                    label: 'Session Date',
                    value: formatDate(r.meal_date),
                    icon: Calendar,
                  },
                  {
                    label: 'Caterer',
                    value: r.food_provider || 'Official Caterer',
                  },
                  {
                    label: 'Dining Point',
                    value: r.delivery_location || 'Hajj House Hall',
                  },
                  {
                    label: 'Dietary Note',
                    value: r.special_requirements ? (
                      <span className="text-amber-800 font-semibold">{r.special_requirements}</span>
                    ) : (
                      'Standard'
                    ),
                  },
                ]}
                expandableFields={[
                  {
                    label: 'Included Meals',
                    value: (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {r.breakfast && (
                          <span className="px-2 py-0.5 rounded bg-[#E8F1EC] text-[#164734] font-semibold text-[10px]">
                            Breakfast
                          </span>
                        )}
                        {r.lunch && (
                          <span className="px-2 py-0.5 rounded bg-[#E8F1EC] text-[#164734] font-semibold text-[10px]">
                            Lunch
                          </span>
                        )}
                        {r.dinner && (
                          <span className="px-2 py-0.5 rounded bg-[#E8F1EC] text-[#164734] font-semibold text-[10px]">
                            Dinner
                          </span>
                        )}
                        {r.refreshments && (
                          <span className="px-2 py-0.5 rounded bg-[#E8F1EC] text-[#164734] font-semibold text-[10px]">
                            Tea & Snacks
                          </span>
                        )}
                      </div>
                    ),
                  },
                  ...(r.remarks ? [{ label: 'Remarks', value: r.remarks }] : []),
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
                      title="Edit Meals"
                    >
                      <Edit className="h-3.5 w-3.5 text-[#4A5550]" />
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 px-2.5 text-red-600 hover:bg-red-50 hover:border-red-200"
                      onClick={() => setRecordToDelete(r)}
                      title="Delete Meals"
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
                    <th className="py-3 px-4">Meal Date</th>
                    <th className="py-3 px-4">Included Servings</th>
                    <th className="py-3 px-4">Dietary Category</th>
                    <th className="py-3 px-4">Special Dietary Instructions</th>
                    <th className="py-3 px-4">Caterer & Dining Point</th>
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
                        <div className="text-[11px] text-[#69756F]">{r.invitee?.phone}</div>
                      </td>

                      <td className="py-3.5 px-4 text-[#1A221E] font-medium whitespace-nowrap">
                        {formatDate(r.meal_date)}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <span
                            title="Breakfast"
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.breakfast
                                ? 'bg-[#E8F1EC] text-[#164734] border border-[#C5DEC8]'
                                : 'bg-[#FAF9F6] text-[#98A39C] border border-[#E3E7E4]'
                            }`}
                          >
                            B
                          </span>
                          <span
                            title="Lunch"
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.lunch
                                ? 'bg-[#E8F1EC] text-[#164734] border border-[#C5DEC8]'
                                : 'bg-[#FAF9F6] text-[#98A39C] border border-[#E3E7E4]'
                            }`}
                          >
                            L
                          </span>
                          <span
                            title="Dinner"
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.dinner
                                ? 'bg-[#E8F1EC] text-[#164734] border border-[#C5DEC8]'
                                : 'bg-[#FAF9F6] text-[#98A39C] border border-[#E3E7E4]'
                            }`}
                          >
                            D
                          </span>
                          <span
                            title="Refreshments / Tea"
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              r.refreshments
                                ? 'bg-[#E8F1EC] text-[#164734] border border-[#C5DEC8]'
                                : 'bg-[#FAF9F6] text-[#98A39C] border border-[#E3E7E4]'
                            }`}
                          >
                            T
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge
                          variant={r.dietary_preference === 'Non-vegetarian' ? 'neutral' : 'special'}
                          label={r.dietary_preference}
                          size="sm"
                        />
                      </td>

                      <td className="py-3.5 px-4 text-[#1A221E] max-w-[200px]">
                        {r.special_requirements ? (
                          <span className="text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200 block truncate">
                            {r.special_requirements}
                          </span>
                        ) : (
                          <span className="text-[#69756F]">Standard</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-[#4A5550] whitespace-nowrap">
                        <div className="font-medium">{r.food_provider || 'Official Caterer'}</div>
                        <div className="text-[11px] text-[#69756F]">
                          {r.delivery_location || 'Hajj House Hall'}
                        </div>
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
                          title="Edit Meal Plan"
                          onClick={() => {
                            setRecordToEdit(r);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 text-[#69756F] hover:text-[#164734] hover:bg-[#E8F1EC] rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        <button
                          title="Delete Meal Plan"
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
      <FoodFormModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setRecordToEdit(null);
        }}
        onSuccess={() => {
          loadData();
          toast.success(
            recordToEdit ? 'Meal arrangements updated.' : 'New meal plan recorded.'
          );
        }}
        recordToEdit={recordToEdit}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={Boolean(recordToDelete)}
        onClose={() => setRecordToDelete(null)}
        onConfirm={handleDelete}
        title="Remove Meal Schedule"
        message={`Are you sure you want to delete the meal schedule for ${recordToDelete?.invitee?.full_name} on ${recordToDelete ? formatDate(recordToDelete.meal_date) : ''}?`}
        confirmLabel="Delete Meal Plan"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
