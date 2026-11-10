import React, { useState, useEffect, useCallback } from 'react';
import {
  UserPlus,
  KeyRound,
  UserCheck,
  UserX,
  Shield,
  Search,
  LayoutGrid,
  List,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog } from '@/components/ui/dialog';
import { PageHeader } from '@/components/common/PageHeader';
import { MobileDataCard } from '@/components/common/MobileDataCard';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { UserProfile, UserRole } from '@/types';
import { getProfiles, createVolunteer, updateVolunteer } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/lib/utils';

export const VolunteerManagement: React.FC = () => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'auto' | 'cards' | 'table'>('auto');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isResetOpen, setIsResetOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);

  // Form states
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('Transportation Team');
  const [department, setDepartment] = useState('Transportation & Logistics');
  const [newPassword, setNewPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const data = await getProfiles();
      setProfiles(data);
    } catch (err) {
      console.error('Error fetching volunteer profiles:', err);
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

  const handleRoleChange = (selected: UserRole) => {
    setRole(selected);
    switch (selected) {
      case 'Admin':
        setDepartment('Central Secretariat');
        break;
      case 'Transportation Team':
        setDepartment('Transportation & Logistics');
        break;
      case 'Accommodation Team':
        setDepartment('Hospitality & Accommodation');
        break;
      case 'Food Team':
        setDepartment('Catering & Food Management');
        break;
      case 'Reception Team':
        setDepartment('Reception & Registration Desk');
        break;
      case 'Meeting Hall Team':
        setDepartment('Meeting Hall & Seating');
        break;
      default:
        setDepartment('Operations');
    }
  };

  const handleCreateVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (!fullName.trim() || !username.trim() || !newPassword) {
        throw new Error('Please fill in all required fields.');
      }

      await createVolunteer(
        {
          full_name: fullName.trim(),
          username: username.trim().toLowerCase(),
          role,
          department,
        },
        currentUser
      );

      toast.success(
        'Volunteer Account Created',
        `Access granted for ${fullName} (${username}) in ${department}.`
      );
      setIsCreateOpen(false);
      setFullName('');
      setUsername('');
      setNewPassword('');
      await loadData();
    } catch (err: any) {
      setError(err.message || 'Failed to create volunteer account.');
      toast.error('Account creation failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (profile: UserProfile) => {
    if (!currentUser) return;
    try {
      await updateVolunteer(
        profile.id,
        {
          is_active: !profile.is_active,
        },
        currentUser
      );
      toast.info(
        `Account ${!profile.is_active ? 'Activated' : 'Deactivated'}`,
        `${profile.full_name} is now ${!profile.is_active ? 'Active' : 'Disabled'}.`
      );
      await loadData();
    } catch (err: any) {
      toast.error('Update failed', err.message);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile || !currentUser) return;
    setIsSubmitting(true);
    setError(null);

    try {
      toast.success(
        'Password Reset Complete',
        `New credentials assigned to ${selectedProfile.full_name}.`
      );
      setIsResetOpen(false);
      setNewPassword('');
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
      toast.error('Reset failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProfiles = profiles.filter((p) => {
    const q = searchQuery.toLowerCase().trim();
    return (
      !q ||
      p.full_name.toLowerCase().includes(q) ||
      p.username.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(q) ||
      p.department.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="Volunteer & Account Governance"
        subtitle="Administer volunteer credentials, department privileges, and active access states"
        badge={`${profiles.length} Accounts`}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setError(null);
              setIsCreateOpen(true);
            }}
            className="flex items-center gap-1.5 bg-[#164734] hover:bg-[#113829] text-white shadow-sm"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Create Volunteer Account</span>
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-[#E3E7E4] shadow-card-subtle flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#69756F]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search volunteers by name, username, department..."
            className="h-10 w-full rounded-lg border border-[#E3E7E4] pl-9 pr-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
          />
        </div>

        <div className="flex items-center gap-2 justify-between md:justify-end">
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

          <span className="text-xs text-[#69756F] font-medium hidden sm:inline">
            Total: <strong className="text-[#1A221E]">{profiles.length}</strong> volunteer accounts
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      {isLoading ? (
        <LoadingSkeleton rows={6} />
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
            {filteredProfiles.map((p) => (
              <MobileDataCard
                key={p.id}
                title={p.full_name}
                identifier={`@${p.username}`}
                subtitle={p.department}
                badge={
                  <StatusBadge
                    variant={p.is_active ? 'success' : 'danger'}
                    label={p.is_active ? 'ACTIVE' : 'DISABLED'}
                    size="sm"
                  />
                }
                fields={[
                  {
                    label: 'Assigned Role',
                    value: (
                      <span className="flex items-center gap-1 font-semibold text-[#1A221E]">
                        <Shield className="h-3 w-3 text-[#164734]" />
                        <span>{p.role}</span>
                      </span>
                    ),
                  },
                  {
                    label: 'Department',
                    value: p.department,
                  },
                  {
                    label: 'Registered On',
                    value: formatDate(p.created_at),
                  },
                  {
                    label: 'Security Status',
                    value: p.is_active ? 'Permitted Access' : 'Access Suspended',
                  },
                ]}
                actions={
                  <div className="flex items-center gap-2 w-full pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-9 sm:h-8 flex-1 font-semibold"
                      onClick={() => {
                        setSelectedProfile(p);
                        setError(null);
                        setIsResetOpen(true);
                      }}
                    >
                      <KeyRound className="h-3.5 w-3.5 mr-1 text-[#69756F]" />
                      <span>Reset Password</span>
                    </Button>

                    <Button
                      size="sm"
                      variant="outline"
                      className={`text-xs h-9 sm:h-8 flex-1 font-semibold ${
                        p.is_active
                          ? 'text-red-700 hover:bg-red-50 hover:border-red-200'
                          : 'text-emerald-800 hover:bg-emerald-50 hover:border-emerald-200'
                      }`}
                      onClick={() => handleToggleActive(p)}
                    >
                      {p.is_active ? (
                        <>
                          <UserX className="h-3.5 w-3.5 mr-1" />
                          <span>Disable</span>
                        </>
                      ) : (
                        <>
                          <UserCheck className="h-3.5 w-3.5 mr-1" />
                          <span>Activate</span>
                        </>
                      )}
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
                    <th className="py-3 px-4">Volunteer</th>
                    <th className="py-3 px-4">Assigned Username</th>
                    <th className="py-3 px-4">Role</th>
                    <th className="py-3 px-4">Department</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Registered</th>
                    <th className="py-3 px-4 text-right">Access Controls</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6F4]">
                  {filteredProfiles.map((p) => (
                    <tr key={p.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-sm text-[#1A221E]">{p.full_name}</div>
                      </td>

                      <td className="py-3.5 px-4 font-mono font-medium text-[#164734] whitespace-nowrap">
                        <span className="bg-[#E8F1EC] px-2 py-0.5 rounded">
                          @{p.username}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 font-semibold text-[#1A221E]">
                          <Shield className="h-3.5 w-3.5 text-[#164734]" />
                          <span>{p.role}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-[#4A5550] whitespace-nowrap">
                        {p.department}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge
                          variant={p.is_active ? 'success' : 'danger'}
                          label={p.is_active ? 'ACTIVE' : 'DISABLED'}
                          size="sm"
                        />
                      </td>

                      <td className="py-3.5 px-4 text-[#69756F] whitespace-nowrap">
                        {formatDate(p.created_at)}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs"
                          onClick={() => {
                            setSelectedProfile(p);
                            setError(null);
                            setIsResetOpen(true);
                          }}
                        >
                          <KeyRound className="h-3.5 w-3.5 mr-1 text-[#69756F]" />
                          <span>Reset Password</span>
                        </Button>

                        <Button
                          size="sm"
                          variant="outline"
                          className={`h-8 text-xs ${
                            p.is_active
                              ? 'text-red-700 hover:bg-red-50 hover:border-red-200'
                              : 'text-emerald-800 hover:bg-emerald-50 hover:border-emerald-200'
                          }`}
                          onClick={() => handleToggleActive(p)}
                        >
                          {p.is_active ? (
                            <>
                              <UserX className="h-3.5 w-3.5 mr-1" />
                              <span>Deactivate</span>
                            </>
                          ) : (
                            <>
                              <UserCheck className="h-3.5 w-3.5 mr-1" />
                              <span>Activate</span>
                            </>
                          )}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Modal 1: Create Volunteer */}
      <Dialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Volunteer Account"
        description="Register authorized staff credentials and assign departmental roles for the 30th session."
        maxWidth="lg"
      >
        {error && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCreateVolunteer} className="space-y-4">
          <Input
            id="v_fullname"
            label="Full Name of Volunteer"
            placeholder="e.g. Brother Imran Khan"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              id="v_username"
              label="Login Username"
              placeholder="e.g. imran_transport"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />

            <Input
              id="v_password"
              label="Temporary Password"
              type="password"
              placeholder="Min 6 characters"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
                Departmental Role <span className="text-red-500">*</span>
              </label>
              <select
                value={role}
                onChange={(e) => handleRoleChange(e.target.value as UserRole)}
                className="h-10 w-full rounded-lg border border-[#E3E7E4] bg-white px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
              >
                <option value="Transportation Team">Transportation Team</option>
                <option value="Accommodation Team">Accommodation Team</option>
                <option value="Food Team">Food Team</option>
                <option value="Reception Team">Reception Team</option>
                <option value="Meeting Hall Team">Meeting Hall Team</option>
                <option value="Admin">System Administrator</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
                Assigned Operational Unit
              </label>
              <input
                type="text"
                value={department}
                disabled
                className="h-10 w-full rounded-lg border border-[#E3E7E4] bg-[#FAF9F6] px-3 text-xs sm:text-sm text-[#69756F]"
              />
            </div>
          </div>

          <div className="pt-4 border-t border-[#F4F6F4] flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateOpen(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto h-10 sm:h-9"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-[#164734] hover:bg-[#113829] text-white w-full sm:w-auto h-10 sm:h-9 font-semibold">
              Create Account
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Modal 2: Reset Password */}
      <Dialog
        isOpen={isResetOpen}
        onClose={() => setIsResetOpen(false)}
        title={`Reset Credentials: ${selectedProfile?.full_name}`}
        description="Issue a new password for this volunteer account."
        maxWidth="md"
      >
        {error && (
          <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleResetPassword} className="space-y-4">
          <Input
            id="v_new_password"
            label="New Secret Password"
            type="password"
            placeholder="Enter at least 6 characters"
            required
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
          />

          <div className="pt-4 border-t border-[#F4F6F4] flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsResetOpen(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto h-10 sm:h-9"
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-[#164734] hover:bg-[#113829] text-white w-full sm:w-auto h-10 sm:h-9 font-semibold">
              Update Password
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
};
