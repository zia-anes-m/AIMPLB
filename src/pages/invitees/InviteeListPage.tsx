import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  UserPlus,
  Download,
  Filter,
  Phone,
  MapPin,
  Eye,
  Trash2,
  Edit,
  LayoutGrid,
  List,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { PageHeader } from '@/components/common/PageHeader';
import { MobileDataCard } from '@/components/common/MobileDataCard';
import { SearchInput } from '@/components/common/SearchInput';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { ConfirmModal } from '@/components/common/ConfirmModal';
import { InviteeFormModal } from './InviteeFormModal';
import { Invitee, InviteeCategory } from '@/types';
import { getInvitees, deleteInvitee } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { exportToCSV } from '@/lib/exportUtils';
import { formatDate } from '@/lib/utils';

export const InviteeListPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const toast = useToast();

  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'auto' | 'cards' | 'table'>('auto');

  // Modal states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [inviteeToEdit, setInviteeToEdit] = useState<Invitee | null>(null);
  const [inviteeToDelete, setInviteeToDelete] = useState<Invitee | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Stable data loader that runs on mount and refreshes silently on changes
  // Never sets isLoading back to true, preventing flickering/blinking
  const loadData = useCallback(async () => {
    try {
      const data = await getInvitees();
      setInvitees(data);
    } catch (err) {
      console.error('Error fetching invitees:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    const handleUpdate = () => {
      loadData();
    };

    window.addEventListener('aimplb_db_update', handleUpdate);
    return () => window.removeEventListener('aimplb_db_update', handleUpdate);
  }, [loadData]);

  const filteredInvitees = useMemo(() => {
    return invitees.filter((inv) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inv.full_name.toLowerCase().includes(q) ||
        inv.invitee_code.toLowerCase().includes(q) ||
        inv.phone.includes(q) ||
        inv.city.toLowerCase().includes(q) ||
        inv.state.toLowerCase().includes(q);

      const matchesCat = categoryFilter === 'ALL' || inv.category === categoryFilter;

      return matchesSearch && matchesCat;
    });
  }, [invitees, searchQuery, categoryFilter]);

  const handleDelete = async () => {
    if (!inviteeToDelete || !currentUser) return;
    setIsDeleting(true);
    try {
      await deleteInvitee(inviteeToDelete.id, currentUser);
      toast.show(
        `Invitee ${inviteeToDelete.full_name} (${inviteeToDelete.invitee_code}) removed successfully.`,
        'success'
      );
      setInviteeToDelete(null);
      await loadData();
    } catch (err) {
      console.error('Delete error:', err);
      toast.show('Failed to delete invitee record.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleExportCSV = () => {
    if (filteredInvitees.length === 0) {
      toast.show('No records available to export.', 'warning');
      return;
    }

    const headers = [
      'Invitee Code',
      'Full Name',
      'Category',
      'Phone Number',
      'Alternate Phone',
      'City',
      'State',
      'Address',
      'Remarks',
      'Registered Date',
    ];

    const rows = filteredInvitees.map((i) => [
      i.invitee_code,
      i.full_name,
      i.category,
      i.phone,
      i.alternate_phone || '',
      i.city,
      i.state,
      i.address || '',
      i.remarks || '',
      formatDate(i.created_at),
    ]);

    exportToCSV('AIMPLB_30th_Session_Invitees', headers, rows);
    toast.show(`Exported ${filteredInvitees.length} delegates to CSV.`, 'success');
  };

  const getCategoryStatusVariant = (category: InviteeCategory) => {
    switch (category) {
      case 'Founder Members':
        return 'founder' as const;
      case 'General Members':
        return 'general' as const;
      case 'Special Invitees':
        return 'special' as const;
      default:
        return 'neutral' as const;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <PageHeader
        title="Centralized Invitees"
        subtitle="Single unified delegate directory accessible to all operational departments"
        badge={`${invitees.length} Delegates`}
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
                setInviteeToEdit(null);
                setIsFormOpen(true);
              }}
              className="flex items-center gap-1.5 bg-[#164734] hover:bg-[#113829] text-white shadow-sm"
            >
              <UserPlus className="h-3.5 w-3.5" />
              <span>Register Invitee</span>
            </Button>
          </div>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E3E7E4] shadow-card-subtle flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <SearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search by name, ID (e.g. AIM-INV-0001), phone, city..."
          className="w-full md:w-96"
        />

        <div className="flex flex-wrap items-center gap-2 justify-between md:justify-end">
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <Filter className="h-3.5 w-3.5 text-[#69756F] shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="h-9 w-full sm:w-auto text-xs rounded-lg border border-[#E3E7E4] bg-white px-3 text-[#1A221E] font-medium focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            >
              <option value="ALL">All Categories ({invitees.length})</option>
              <option value="Founder Members">Founder Members</option>
              <option value="General Members">General Members</option>
              <option value="Special Invitees">Special Invitees</option>
            </select>
          </div>

          {/* View mode toggle on tablet/desktop */}
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

          <span className="text-xs text-[#69756F] font-medium hidden lg:inline">
            Showing <strong className="text-[#1A221E]">{filteredInvitees.length}</strong> records
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <LoadingSkeleton rows={6} />
      ) : filteredInvitees.length === 0 ? (
        <EmptyState
          title="No invitees found"
          description={
            searchQuery || categoryFilter !== 'ALL'
              ? 'Try modifying your search or category filter criteria.'
              : 'Start by registering the first invitee to the AIMPLB 30th Annual Session.'
          }
          actionLabel="Register New Invitee"
          onAction={() => {
            setInviteeToEdit(null);
            setIsFormOpen(true);
          }}
        />
      ) : (
        <>
          {/* Mobile Cards View (Visible on mobile screens < 768px, or when forced by viewMode === 'cards') */}
          <div
            className={`space-y-3 ${
              viewMode === 'table'
                ? 'hidden'
                : viewMode === 'cards'
                ? 'block'
                : 'block md:hidden'
            }`}
          >
            {filteredInvitees.map((inv) => (
              <MobileDataCard
                key={inv.id}
                title={inv.full_name}
                identifier={inv.invitee_code}
                subtitle={`${inv.city}, ${inv.state}`}
                badge={
                  <StatusBadge
                    variant={getCategoryStatusVariant(inv.category)}
                    label={inv.category}
                    size="sm"
                  />
                }
                onClick={() => navigate(`/invitees/${inv.id}`)}
                fields={[
                  {
                    label: 'Primary Phone',
                    value: (
                      <a
                        href={`tel:${inv.phone}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#164734] font-semibold hover:underline flex items-center gap-1"
                      >
                        <Phone className="h-3 w-3" />
                        <span>{inv.phone}</span>
                      </a>
                    ),
                  },
                  {
                    label: 'Location',
                    value: (
                      <span className="flex items-center gap-1 text-[#4A5550]">
                        <MapPin className="h-3 w-3 text-[#69756F] shrink-0" />
                        <span className="truncate">{inv.city}, {inv.state}</span>
                      </span>
                    ),
                  },
                ]}
                expandableFields={[
                  ...(inv.alternate_phone
                    ? [
                        {
                          label: 'Alternate Phone',
                          value: inv.alternate_phone,
                        },
                      ]
                    : []),
                  ...(inv.address
                    ? [
                        {
                          label: 'Address',
                          value: inv.address,
                        },
                      ]
                    : []),
                  ...(inv.remarks
                    ? [
                        {
                          label: 'Remarks',
                          value: inv.remarks,
                        },
                      ]
                    : []),
                  {
                    label: 'Registered On',
                    value: formatDate(inv.created_at),
                  },
                ]}
                actions={
                  <div className="flex items-center gap-1.5 w-full justify-between">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 flex-1"
                      onClick={() => navigate(`/invitees/${inv.id}`)}
                    >
                      <Eye className="h-3.5 w-3.5 mr-1 text-[#164734]" />
                      <span>View Profile</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-8 px-2.5"
                      onClick={() => {
                        setInviteeToEdit(inv);
                        setIsFormOpen(true);
                      }}
                      title="Edit delegate"
                    >
                      <Edit className="h-3.5 w-3.5 text-[#4A5550]" />
                    </Button>

                    {isAdmin && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-8 px-2.5 text-red-600 hover:bg-red-50 hover:border-red-200"
                        onClick={() => setInviteeToDelete(inv)}
                        title="Delete delegate"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                }
              />
            ))}
          </div>

          {/* Desktop Table View (Visible on >= 768px unless viewMode === 'cards') */}
          <div
            className={`bg-white rounded-xl border border-[#E3E7E4] shadow-card-subtle overflow-hidden ${
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
                    <th className="py-3 px-4">Invitee ID</th>
                    <th className="py-3 px-4">Full Name</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Location</th>
                    <th className="py-3 px-4">Remarks</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6F4]">
                  {filteredInvitees.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-[#FAF9F6]/80 transition-colors cursor-pointer group"
                      onClick={() => navigate(`/invitees/${inv.id}`)}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold text-[#164734] whitespace-nowrap">
                        <span className="bg-[#E8F1EC] px-2 py-0.5 rounded text-[11px]">
                          {inv.invitee_code}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#1A221E]">
                        <div className="font-semibold text-sm group-hover:text-[#164734] transition-colors">
                          {inv.full_name}
                        </div>
                        {inv.address && (
                          <div className="text-[11px] text-[#69756F] truncate max-w-xs mt-0.5">
                            {inv.address}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge
                          variant={getCategoryStatusVariant(inv.category)}
                          label={inv.category}
                          size="sm"
                        />
                      </td>
                      <td className="py-3.5 px-4 text-[#1A221E] whitespace-nowrap">
                        <a
                          href={`tel:${inv.phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="flex items-center gap-1.5 font-mono text-[12px] hover:text-[#164734] hover:underline"
                        >
                          <Phone className="h-3 w-3 text-[#69756F]" />
                          <span>{inv.phone}</span>
                        </a>
                        {inv.alternate_phone && (
                          <div className="text-[10px] text-[#69756F] font-mono mt-0.5">
                            Alt: {inv.alternate_phone}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-[#4A5550]">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3 w-3 text-[#69756F] shrink-0" />
                          <span className="truncate max-w-[150px]">
                            {inv.city}, {inv.state}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#69756F] max-w-[180px] truncate">
                        {inv.remarks || '—'}
                      </td>
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap space-x-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          title="View Complete Profile"
                          onClick={() => navigate(`/invitees/${inv.id}`)}
                          className="p-1.5 text-[#69756F] hover:text-[#164734] hover:bg-[#E8F1EC] rounded-lg transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </button>

                        <button
                          title="Edit Details"
                          onClick={() => {
                            setInviteeToEdit(inv);
                            setIsFormOpen(true);
                          }}
                          className="p-1.5 text-[#69756F] hover:text-[#164734] hover:bg-[#E8F1EC] rounded-lg transition-colors"
                        >
                          <Edit className="h-4 w-4" />
                        </button>

                        {isAdmin && (
                          <button
                            title="Delete Invitee"
                            onClick={() => setInviteeToDelete(inv)}
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
        </>
      )}

      {/* Register / Edit Modal */}
      <InviteeFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setInviteeToEdit(null);
        }}
        onSuccess={() => {
          loadData();
          toast.show(
            inviteeToEdit
              ? 'Invitee details updated successfully.'
              : 'New invitee registered successfully.',
            'success'
          );
        }}
        inviteeToEdit={inviteeToEdit}
      />

      {/* Delete Confirmation Modal (Admin only) */}
      <ConfirmModal
        isOpen={Boolean(inviteeToDelete)}
        onClose={() => setInviteeToDelete(null)}
        onConfirm={handleDelete}
        title="Delete Invitee Record"
        message={`Are you sure you want to permanently delete ${inviteeToDelete?.full_name} (${inviteeToDelete?.invitee_code})? All associated transportation, accommodation, meal, and seating records will be cascade removed.`}
        confirmLabel="Permanently Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
};
