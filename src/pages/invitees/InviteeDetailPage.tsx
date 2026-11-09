import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  PlaneTakeoff,
  Building2,
  UtensilsCrossed,
  UserCheck,
  Armchair,
  History,
  Edit,
  Plus,
  Calendar,
  Clock,
  AlertCircle,
  Copy,
  Check,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { InviteeFormModal } from './InviteeFormModal';
import { TransportationFormModal } from '../transportation/TransportationFormModal';
import { AccommodationFormModal } from '../accommodation/AccommodationFormModal';
import { FoodFormModal } from '../food/FoodFormModal';
import { ReceptionFormModal } from '../reception/ReceptionFormModal';
import { MeetingHallFormModal } from '../meeting-hall/MeetingHallFormModal';
import {
  Invitee,
  TransportationRecord,
  AccommodationRecord,
  FoodRecord,
  ReceptionRecord,
  MeetingHallRecord,
  AuditLog,
} from '@/types';
import {
  getInviteeById,
  getTransportationRecords,
  getAccommodations,
  getFoodRecords,
  getReceptionRecords,
  getMeetingHallRecords,
  getAuditLogs,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatDate, formatTime, formatDateTime } from '@/lib/utils';

export const InviteeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser, isAdmin } = useAuth();
  const toast = useToast();

  const [invitee, setInvitee] = useState<Invitee | null>(null);
  const [transportation, setTransportation] = useState<TransportationRecord[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationRecord[]>([]);
  const [foods, setFoods] = useState<FoodRecord[]>([]);
  const [reception, setReception] = useState<ReceptionRecord | null>(null);
  const [meetingHall, setMeetingHall] = useState<MeetingHallRecord | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);

  // Active tab in profile
  const [activeTab, setActiveTab] = useState<
    'all' | 'transport' | 'accommodation' | 'food' | 'reception' | 'seating' | 'history'
  >('all');

  // Modals
  const [isEditBasicOpen, setIsEditBasicOpen] = useState(false);
  const [isTransportModalOpen, setIsTransportModalOpen] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState<TransportationRecord | null>(null);
  const [isAccModalOpen, setIsAccModalOpen] = useState(false);
  const [selectedAcc, setSelectedAcc] = useState<AccommodationRecord | null>(null);
  const [isFoodModalOpen, setIsFoodModalOpen] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodRecord | null>(null);
  const [isReceptionModalOpen, setIsReceptionModalOpen] = useState(false);
  const [isHallModalOpen, setIsHallModalOpen] = useState(false);

  const loadAllDetails = useCallback(async () => {
    if (!id) return;
    try {
      const inv = await getInviteeById(id);
      setInvitee(inv);

      const [allTrans, allAcc, allFood, allRec, allHall, allAudit] = await Promise.all([
        getTransportationRecords(),
        getAccommodations(),
        getFoodRecords(),
        getReceptionRecords(),
        getMeetingHallRecords(),
        getAuditLogs(),
      ]);

      setTransportation(allTrans.filter((t) => t.invitee_id === id));
      setAccommodations(allAcc.filter((a) => a.invitee_id === id));
      setFoods(allFood.filter((f) => f.invitee_id === id));
      setReception(allRec.find((r) => r.invitee_id === id) || null);
      setMeetingHall(allHall.find((h) => h.invitee_id === id) || null);
      setAuditLogs(allAudit.filter((log) => log.record_id === id));
    } catch (err) {
      console.error('Error fetching invitee profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAllDetails();
    const handleUpdate = () => loadAllDetails();
    window.addEventListener('aimplb_db_update', handleUpdate);
    return () => window.removeEventListener('aimplb_db_update', handleUpdate);
  }, [loadAllDetails]);

  const copyInviteeCode = () => {
    if (!invitee) return;
    navigator.clipboard.writeText(invitee.invitee_code);
    setCopiedId(true);
    toast.show(`Copied ${invitee.invitee_code} to clipboard`, 'info');
    setTimeout(() => setCopiedId(false), 2000);
  };

  if (isLoading) {
    return <LoadingSkeleton rows={8} />;
  }

  if (!invitee) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-[#E3E7E4] shadow-card-subtle p-8">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-[#1A221E]">Invitee Record Not Found</h2>
        <p className="text-xs text-[#69756F] mt-1">The requested delegate may have been removed or does not exist.</p>
        <Button size="sm" onClick={() => navigate('/invitees')} className="mt-4">
          Return to Invitee Directory
        </Button>
      </div>
    );
  }

  // Permission checks
  const canEditTransport = isAdmin || currentUser?.role === 'Transportation Team';
  const canEditAcc = isAdmin || currentUser?.role === 'Accommodation Team';
  const canEditFood = isAdmin || currentUser?.role === 'Food Team';
  const canEditReception = isAdmin || currentUser?.role === 'Reception Team';
  const canEditHall = isAdmin || currentUser?.role === 'Meeting Hall Team';
  const canEditBasic = isAdmin || currentUser !== null;

  const categoryVariant =
    invitee.category === 'Founder Members'
      ? ('founder' as const)
      : invitee.category === 'General Members'
      ? ('general' as const)
      : ('special' as const);

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Profile Header */}
      <div>
        <button
          onClick={() => navigate('/invitees')}
          className="inline-flex items-center gap-1.5 text-xs text-[#69756F] hover:text-[#164734] font-medium transition-colors mb-3 group"
        >
          <ArrowLeft className="h-3.5 w-3.5 group-hover:-translate-x-0.5 transition-transform" />
          <span>Back to Centralized Invitees</span>
        </button>

        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-[#E3E7E4] shadow-card-subtle flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="h-14 w-14 rounded-2xl bg-[#164734] text-white flex items-center justify-center font-bold text-xl shrink-0 shadow-md border-2 border-white">
              {invitee.full_name.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <button
                  onClick={copyInviteeCode}
                  title="Click to copy code"
                  className="font-mono text-xs font-bold text-[#164734] bg-[#E8F1EC] hover:bg-[#d8e8de] px-2.5 py-0.5 rounded-md flex items-center gap-1 transition-colors"
                >
                  <span>{invitee.invitee_code}</span>
                  {copiedId ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-[#69756F]" />}
                </button>
                <StatusBadge variant={categoryVariant} label={invitee.category} size="sm" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#1A221E] tracking-tight">
                {invitee.full_name}
              </h1>
              <div className="flex flex-wrap items-center gap-3 text-xs text-[#69756F] mt-1.5">
                <a
                  href={`tel:${invitee.phone}`}
                  className="flex items-center gap-1 font-mono hover:text-[#164734] hover:underline"
                >
                  <Phone className="h-3 w-3 text-[#164734]" />
                  <span>{invitee.phone}</span>
                </a>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-[#164734]" />
                  <span>{invitee.city}, {invitee.state}</span>
                </span>
                <span>•</span>
                <span className="text-[11px] text-[#69756F]">
                  Registered {formatDate(invitee.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            {canEditBasic && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditBasicOpen(true)}
                className="flex items-center gap-1.5 border-[#E3E7E4] hover:bg-[#FAF9F6]"
              >
                <Edit className="h-3.5 w-3.5 text-[#164734]" />
                <span>Edit Basic Details</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Section Navigation Tabs (Responsive scrollable horizontal bar) */}
      <div className="flex items-center overflow-x-auto border-b border-[#E3E7E4] gap-1 pb-1 scrollbar-none text-xs font-medium">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-2 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'all'
              ? 'bg-[#164734] text-white font-semibold shadow-xs'
              : 'text-[#69756F] hover:bg-[#E8F1EC] hover:text-[#164734]'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Unified Profile</span>
        </button>

        <button
          onClick={() => setActiveTab('transport')}
          className={`px-3.5 py-2 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'transport'
              ? 'bg-[#164734] text-white font-semibold shadow-xs'
              : 'text-[#69756F] hover:bg-[#E8F1EC] hover:text-[#164734]'
          }`}
        >
          <PlaneTakeoff className="h-3.5 w-3.5" />
          <span>Transportation</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'transport' ? 'bg-white/20 text-white' : 'bg-[#FAF9F6] text-[#69756F] border border-[#E3E7E4]'
          }`}>
            {transportation.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('accommodation')}
          className={`px-3.5 py-2 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'accommodation'
              ? 'bg-[#164734] text-white font-semibold shadow-xs'
              : 'text-[#69756F] hover:bg-[#E8F1EC] hover:text-[#164734]'
          }`}
        >
          <Building2 className="h-3.5 w-3.5" />
          <span>Accommodation</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'accommodation' ? 'bg-white/20 text-white' : 'bg-[#FAF9F6] text-[#69756F] border border-[#E3E7E4]'
          }`}>
            {accommodations.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('food')}
          className={`px-3.5 py-2 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'food'
              ? 'bg-[#164734] text-white font-semibold shadow-xs'
              : 'text-[#69756F] hover:bg-[#E8F1EC] hover:text-[#164734]'
          }`}
        >
          <UtensilsCrossed className="h-3.5 w-3.5" />
          <span>Food & Catering</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'food' ? 'bg-white/20 text-white' : 'bg-[#FAF9F6] text-[#69756F] border border-[#E3E7E4]'
          }`}>
            {foods.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('reception')}
          className={`px-3.5 py-2 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'reception'
              ? 'bg-[#164734] text-white font-semibold shadow-xs'
              : 'text-[#69756F] hover:bg-[#E8F1EC] hover:text-[#164734]'
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          <span>Reception</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            reception?.reception_status === 'Checked In'
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-[#FAF9F6] text-[#69756F] border border-[#E3E7E4]'
          }`}>
            {reception ? reception.reception_status : 'Pending'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('seating')}
          className={`px-3.5 py-2 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'seating'
              ? 'bg-[#164734] text-white font-semibold shadow-xs'
              : 'text-[#69756F] hover:bg-[#E8F1EC] hover:text-[#164734]'
          }`}
        >
          <Armchair className="h-3.5 w-3.5" />
          <span>Meeting Hall</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            meetingHall
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-[#FAF9F6] text-[#69756F] border border-[#E3E7E4]'
          }`}>
            {meetingHall ? meetingHall.seat_number : 'Unassigned'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-3.5 py-2 rounded-lg transition-all shrink-0 flex items-center gap-1.5 ${
            activeTab === 'history'
              ? 'bg-[#164734] text-white font-semibold shadow-xs'
              : 'text-[#69756F] hover:bg-[#E8F1EC] hover:text-[#164734]'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Activity Trail</span>
          <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
            activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-[#FAF9F6] text-[#69756F] border border-[#E3E7E4]'
          }`}>
            {auditLogs.length}
          </span>
        </button>
      </div>

      {/* 1. BASIC INFORMATION CARD */}
      {(activeTab === 'all') && (
        <div className="bg-white rounded-2xl border border-[#E3E7E4] p-5 sm:p-6 shadow-card-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-[#F4F6F4] mb-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#164734] flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Delegate Contact & Affiliation</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5 text-xs">
            <div>
              <span className="text-[#69756F] block font-medium">Full Name</span>
              <span className="font-semibold text-sm text-[#1A221E] mt-0.5 block">{invitee.full_name}</span>
            </div>
            <div>
              <span className="text-[#69756F] block font-medium">Invitee Category</span>
              <span className="font-semibold text-[#164734] mt-0.5 block">{invitee.category}</span>
            </div>
            <div>
              <span className="text-[#69756F] block font-medium">Phone Numbers</span>
              <a
                href={`tel:${invitee.phone}`}
                className="font-mono font-medium text-[#1A221E] hover:text-[#164734] hover:underline mt-0.5 block"
              >
                Primary: {invitee.phone}
              </a>
              {invitee.alternate_phone && (
                <span className="font-mono text-[11px] text-[#69756F] block mt-0.5">
                  Alternate: {invitee.alternate_phone}
                </span>
              )}
            </div>
            {/* Role-based Expandable Details Section */}
            <div className="sm:col-span-2 md:col-span-3 pt-3 border-t border-[#F4F6F4]">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[#69756F]">
                  {isAdmin ? 'Confidential Delegate Details' : 'Protocol & Notes'}
                </span>
                <button
                  type="button"
                  onClick={() => setShowMoreDetails((prev) => !prev)}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold text-[#164734] bg-[#E8F1EC] hover:bg-[#d8e8de] transition-colors"
                >
                  {showMoreDetails ? (
                    <>
                      <ChevronUp className="h-3.5 w-3.5" />
                      <span>Show Less</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="h-3.5 w-3.5" />
                      <span>{isAdmin ? 'Show More (City, Address & Remarks)' : 'Show Remarks'}</span>
                    </>
                  )}
                </button>
              </div>

              {showMoreDetails && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 pt-3 mt-3 border-t border-[#F4F6F4] animate-fade-in">
                  {isAdmin && (
                    <>
                      <div>
                        <span className="text-[#69756F] block font-medium">City & State</span>
                        <span className="text-[#1A221E] mt-0.5 block font-medium">
                          {invitee.city}, {invitee.state}, {invitee.country}
                        </span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-[#69756F] block font-medium">Address / Affiliated Institution</span>
                        <span className="text-[#1A221E] mt-0.5 block">{invitee.address || '—'}</span>
                      </div>
                    </>
                  )}
                  <div className="sm:col-span-2 md:col-span-3">
                    <span className="text-[#69756F] block font-medium">Special Remarks / Protocol</span>
                    <p className="text-[#1A221E] mt-1 bg-[#FAF9F6] p-3 rounded-xl border border-[#E3E7E4]">
                      {invitee.remarks || 'No special remarks recorded.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. TRANSPORTATION SECTION */}
      {(activeTab === 'all' || activeTab === 'transport') && (
        <div className="bg-white rounded-2xl border border-[#E3E7E4] p-5 sm:p-6 shadow-card-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-[#F4F6F4] mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#E8F1EC] text-[#164734]">
                <PlaneTakeoff className="h-4 w-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#164734]">
                Transportation Arrangements
              </h2>
            </div>
            {canEditTransport && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedTransport(null);
                  setIsTransportModalOpen(true);
                }}
                className="flex items-center gap-1.5 h-8 text-xs text-[#164734] border-[#164734]/30 hover:bg-[#E8F1EC]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Travel Schedule</span>
              </Button>
            )}
          </div>

          {transportation.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#69756F]">
              <PlaneTakeoff className="h-7 w-7 text-[#69756F]/40 mx-auto mb-2" />
              <p className="font-medium text-[#1A221E]">No travel schedules booked yet</p>
              <p className="mt-0.5">Add flight or train arrival & departure details for pickup coordination.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {transportation.map((t) => (
                <div
                  key={t.id}
                  className="p-4 rounded-xl border border-[#E3E7E4] bg-[#FAF9F6] text-xs space-y-2.5 relative hover:border-[#164734]/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-md text-[10px] ${
                        t.journey_type === 'arrival'
                          ? 'bg-[#164734] text-white'
                          : 'bg-[#C59A3F] text-white'
                      }`}
                    >
                      {t.journey_type}
                    </span>
                    <span className="font-semibold text-xs text-[#164734] bg-white px-2 py-0.5 rounded border border-[#E3E7E4]">
                      {t.transport_mode}
                    </span>
                  </div>

                  <div className="font-medium text-[#1A221E] pt-1">
                    <p className="text-sm font-bold text-[#1A221E]">{t.location_name}</p>
                    {t.transport_number && (
                      <p className="text-[#69756F] font-mono mt-0.5 text-[11px]">
                        Service / Number: {t.transport_number}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-[#69756F] pt-2 border-t border-[#E3E7E4]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 text-[#164734]" />
                      <span>{formatDate(t.journey_date)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-[#164734]" />
                      <span className="font-mono">{formatTime(t.journey_time)}</span>
                    </div>
                  </div>

                  {t.pickup_required && (
                    <div className="bg-white p-2.5 rounded-lg border border-[#E3E7E4] text-[11px] space-y-1">
                      <span className="font-semibold text-[#164734] block">Pickup Arranged:</span>
                      <p className="text-[#1A221E]">Point: {t.pickup_point || 'Lobby Exit'}</p>
                      {t.driver_name && (
                        <p className="text-[#69756F]">
                          Driver: {t.driver_name}{' '}
                          {t.driver_phone && (
                            <a
                              href={`tel:${t.driver_phone}`}
                              className="text-[#164734] font-mono font-medium hover:underline ml-1"
                            >
                              ({t.driver_phone})
                            </a>
                          )}
                        </p>
                      )}
                    </div>
                  )}

                  {canEditTransport && (
                    <div className="pt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2.5"
                        onClick={() => {
                          setSelectedTransport(t);
                          setIsTransportModalOpen(true);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1 text-[#69756F]" />
                        <span>Edit Schedule</span>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 3. ACCOMMODATION SECTION */}
      {(activeTab === 'all' || activeTab === 'accommodation') && (
        <div className="bg-white rounded-2xl border border-[#E3E7E4] p-5 sm:p-6 shadow-card-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-[#F4F6F4] mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#E8F1EC] text-[#164734]">
                <Building2 className="h-4 w-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#164734]">
                Accommodation Arrangements
              </h2>
            </div>
            {canEditAcc && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedAcc(null);
                  setIsAccModalOpen(true);
                }}
                className="flex items-center gap-1.5 h-8 text-xs text-[#164734] border-[#164734]/30 hover:bg-[#E8F1EC]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Allocate Room</span>
              </Button>
            )}
          </div>

          {accommodations.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#69756F]">
              <Building2 className="h-7 w-7 text-[#69756F]/40 mx-auto mb-2" />
              <p className="font-medium text-[#1A221E]">No room allocated yet</p>
              <p className="mt-0.5">Assign hotel or Hajj House room for overnight stay during the session.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accommodations.map((a) => (
                <div
                  key={a.id}
                  className="p-4 rounded-xl border border-[#E3E7E4] bg-[#FAF9F6] text-xs space-y-2.5 hover:border-[#164734]/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#164734] bg-white px-2 py-0.5 rounded border border-[#E3E7E4]">
                      {a.accommodation_type}
                    </span>
                    <span className="font-mono font-bold text-sm text-[#164734] bg-[#E8F1EC] px-2.5 py-0.5 rounded-md">
                      Room {a.room_number || 'TBD'}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-[#1A221E]">{a.hotel_name || 'Hajj House Chennai'}</p>
                  {a.room_type && (
                    <p className="text-[11px] text-[#69756F]">
                      Category: <span className="font-medium text-[#1A221E]">{a.room_type}</span>
                    </p>
                  )}

                  <div className="grid grid-cols-2 gap-2 text-[11px] text-[#69756F] pt-2 border-t border-[#E3E7E4]">
                    <div>
                      <span className="block font-semibold text-[#1A221E]">Check-in:</span>
                      {formatDate(a.check_in_date)} ({formatTime(a.check_in_time)})
                    </div>
                    <div>
                      <span className="block font-semibold text-[#1A221E]">Check-out:</span>
                      {formatDate(a.check_out_date)} ({formatTime(a.check_out_time)})
                    </div>
                  </div>

                  {canEditAcc && (
                    <div className="pt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2.5"
                        onClick={() => {
                          setSelectedAcc(a);
                          setIsAccModalOpen(true);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1 text-[#69756F]" />
                        <span>Edit Room</span>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. FOOD & CATERING SECTION */}
      {(activeTab === 'all' || activeTab === 'food') && (
        <div className="bg-white rounded-2xl border border-[#E3E7E4] p-5 sm:p-6 shadow-card-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-[#F4F6F4] mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#E8F1EC] text-[#164734]">
                <UtensilsCrossed className="h-4 w-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#164734]">
                Food & Catering Details
              </h2>
            </div>
            {canEditFood && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSelectedFood(null);
                  setIsFoodModalOpen(true);
                }}
                className="flex items-center gap-1.5 h-8 text-xs text-[#164734] border-[#164734]/30 hover:bg-[#E8F1EC]"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Meal Schedule</span>
              </Button>
            )}
          </div>

          {foods.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#69756F]">
              <UtensilsCrossed className="h-7 w-7 text-[#69756F]/40 mx-auto mb-2" />
              <p className="font-medium text-[#1A221E]">No meal arrangements recorded</p>
              <p className="mt-0.5">Specify dietary preferences and meal requirements for session days.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {foods.map((f) => (
                <div
                  key={f.id}
                  className="p-4 rounded-xl border border-[#E3E7E4] bg-[#FAF9F6] text-xs space-y-2.5 hover:border-[#164734]/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-[#164734]">{formatDate(f.meal_date)}</span>
                    <span className="px-2.5 py-0.5 rounded-md bg-white border border-[#E3E7E4] font-semibold text-[11px] text-[#1A221E]">
                      {f.dietary_preference}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1 text-[11px]">
                    <span
                      className={`px-2 py-0.5 rounded-md font-medium ${
                        f.breakfast ? 'bg-[#E8F1EC] text-[#164734] font-semibold' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      Breakfast
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-medium ${
                        f.lunch ? 'bg-[#E8F1EC] text-[#164734] font-semibold' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      Lunch
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-medium ${
                        f.dinner ? 'bg-[#E8F1EC] text-[#164734] font-semibold' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      Dinner
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md font-medium ${
                        f.refreshments ? 'bg-[#E8F1EC] text-[#164734] font-semibold' : 'bg-gray-100 text-gray-400'
                      }`}
                    >
                      Tea & Snacks
                    </span>
                  </div>

                  <div className="text-[11px] text-[#69756F] pt-2 border-t border-[#E3E7E4] space-y-1">
                    <p>
                      <strong>Caterer:</strong> {f.food_provider || 'Official Board Caterer'}
                    </p>
                    <p>
                      <strong>Dining Point:</strong> {f.delivery_location || 'Hajj House Dining Hall'}
                    </p>
                    {f.special_requirements && (
                      <p className="text-amber-900 mt-1 bg-amber-50 p-2 rounded-lg border border-amber-200">
                        <strong>Diet Note:</strong> {f.special_requirements}
                      </p>
                    )}
                  </div>

                  {canEditFood && (
                    <div className="pt-2 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2.5"
                        onClick={() => {
                          setSelectedFood(f);
                          setIsFoodModalOpen(true);
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1 text-[#69756F]" />
                        <span>Edit Meal</span>
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 5. RECEPTION & REGISTRATION SECTION */}
      {(activeTab === 'all' || activeTab === 'reception') && (
        <div className="bg-white rounded-2xl border border-[#E3E7E4] p-5 sm:p-6 shadow-card-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-[#F4F6F4] mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#E8F1EC] text-[#164734]">
                <UserCheck className="h-4 w-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#164734]">
                Reception & Registration Desk
              </h2>
            </div>
            {canEditReception && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsReceptionModalOpen(true)}
                className="flex items-center gap-1.5 h-8 text-xs text-[#164734] border-[#164734]/30 hover:bg-[#E8F1EC]"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>Update Status</span>
              </Button>
            )}
          </div>

          {!reception ? (
            <div className="py-6 text-center text-xs text-[#69756F]">
              <UserCheck className="h-7 w-7 text-[#69756F]/40 mx-auto mb-2" />
              <p className="font-medium text-[#1A221E]">No reception record active</p>
              <p className="mt-0.5">Reception team will track gate arrival and welcome kit distribution.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl">
                <span className="text-[#69756F] block font-medium text-[11px]">Reception Status</span>
                <span className="font-bold text-sm text-[#164734] mt-1 block">
                  {reception.reception_status}
                </span>
              </div>
              <div className="p-3.5 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl">
                <span className="text-[#69756F] block font-medium text-[11px]">Actual Arrival</span>
                <span className="font-medium text-[#1A221E] mt-1 block">
                  {formatDateTime(reception.actual_arrival)}
                </span>
              </div>
              <div className="p-3.5 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl">
                <span className="text-[#69756F] block font-medium text-[11px]">Welcome Kit</span>
                <span className="font-semibold text-[#1A221E] mt-1 block">
                  {reception.welcome_kit_status}
                </span>
              </div>
              <div className="p-3.5 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl">
                <span className="text-[#69756F] block font-medium text-[11px]">Assigned Volunteer</span>
                <span className="font-semibold text-[#1A221E] mt-1 block truncate">
                  {reception.assigned_volunteer || 'Help Desk Lead'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 6. MEETING HALL & SEATING SECTION */}
      {(activeTab === 'all' || activeTab === 'seating') && (
        <div className="bg-white rounded-2xl border border-[#E3E7E4] p-5 sm:p-6 shadow-card-subtle">
          <div className="flex items-center justify-between pb-3 border-b border-[#F4F6F4] mb-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#E8F1EC] text-[#164734]">
                <Armchair className="h-4 w-4" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#164734]">
                Meeting Hall & Seating Assignment
              </h2>
            </div>
            {canEditHall && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsHallModalOpen(true)}
                className="flex items-center gap-1.5 h-8 text-xs text-[#164734] border-[#164734]/30 hover:bg-[#E8F1EC]"
              >
                <Edit className="h-3.5 w-3.5" />
                <span>{meetingHall ? 'Change Seat' : 'Assign Seat'}</span>
              </Button>
            )}
          </div>

          {!meetingHall ? (
            <div className="py-6 text-center text-xs text-[#69756F]">
              <Armchair className="h-7 w-7 text-[#69756F]/40 mx-auto mb-2" />
              <p className="font-medium text-[#1A221E]">No seat designated yet</p>
              <p className="mt-0.5">Assign hall section and designated chair number for session proceedings.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3.5 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl">
                <span className="text-[#69756F] block font-medium text-[11px]">Meeting Hall</span>
                <span className="font-bold text-sm text-[#1A221E] mt-1 block truncate">
                  {meetingHall.meeting_hall}
                </span>
              </div>
              <div className="p-3.5 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl">
                <span className="text-[#69756F] block font-medium text-[11px]">Seating Section</span>
                <span className="font-semibold text-[#164734] mt-1 block">
                  {meetingHall.seating_section}
                </span>
              </div>
              <div className="p-3.5 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl">
                <span className="text-[#69756F] block font-medium text-[11px]">Designated Seat</span>
                <span className="font-mono font-bold text-base text-[#164734] mt-1 block">
                  {meetingHall.seat_number}
                </span>
              </div>
              <div className="p-3.5 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl">
                <span className="text-[#69756F] block font-medium text-[11px]">Attendance Status</span>
                <span className="font-semibold text-[#1A221E] mt-1 block">
                  {meetingHall.attendance_status}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 7. ACTIVITY / AUDIT LOGS */}
      {(activeTab === 'all' || activeTab === 'history') && (
        <div className="bg-white rounded-2xl border border-[#E3E7E4] p-5 sm:p-6 shadow-card-subtle">
          <div className="flex items-center gap-2 pb-3 border-b border-[#F4F6F4] mb-4">
            <div className="p-1.5 rounded-lg bg-[#E8F1EC] text-[#164734]">
              <History className="h-4 w-4" />
            </div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#164734]">
              Invitee Activity & Modification Audit
            </h2>
          </div>

          {auditLogs.length === 0 ? (
            <p className="text-xs text-[#69756F] italic py-2">
              No recent changes logged for this delegate profile.
            </p>
          ) : (
            <div className="divide-y divide-[#F4F6F4]">
              {auditLogs.map((log) => (
                <div key={log.id} className="py-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#164734] uppercase text-[10px] bg-[#E8F1EC] px-2 py-0.5 rounded-md">
                      {log.action}
                    </span>
                    <span className="font-semibold text-[#1A221E]">{log.user_name}</span>
                    <span className="text-[#69756F] hidden sm:inline">modified table {log.table_name}</span>
                  </div>
                  <span className="text-[11px] text-[#69756F] font-mono">
                    {formatDateTime(log.created_at)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals for Editing */}
      <InviteeFormModal
        isOpen={isEditBasicOpen}
        onClose={() => setIsEditBasicOpen(false)}
        onSuccess={() => {
          loadAllDetails();
          toast.show('Basic delegate details updated.', 'success');
        }}
        inviteeToEdit={invitee}
      />

      <TransportationFormModal
        isOpen={isTransportModalOpen}
        onClose={() => {
          setIsTransportModalOpen(false);
          setSelectedTransport(null);
        }}
        onSuccess={() => {
          loadAllDetails();
          toast.show('Travel schedule saved.', 'success');
        }}
        recordToEdit={selectedTransport}
        defaultInviteeId={invitee.id}
      />

      <AccommodationFormModal
        isOpen={isAccModalOpen}
        onClose={() => {
          setIsAccModalOpen(false);
          setSelectedAcc(null);
        }}
        onSuccess={() => {
          loadAllDetails();
          toast.show('Accommodation record saved.', 'success');
        }}
        recordToEdit={selectedAcc}
        defaultInviteeId={invitee.id}
      />

      <FoodFormModal
        isOpen={isFoodModalOpen}
        onClose={() => {
          setIsFoodModalOpen(false);
          setSelectedFood(null);
        }}
        onSuccess={() => {
          loadAllDetails();
          toast.show('Meal record saved.', 'success');
        }}
        recordToEdit={selectedFood}
        defaultInviteeId={invitee.id}
      />

      <ReceptionFormModal
        isOpen={isReceptionModalOpen}
        onClose={() => setIsReceptionModalOpen(false)}
        onSuccess={() => {
          loadAllDetails();
          toast.show('Reception status updated.', 'success');
        }}
        recordToEdit={reception}
        defaultInviteeId={invitee.id}
      />

      <MeetingHallFormModal
        isOpen={isHallModalOpen}
        onClose={() => setIsHallModalOpen(false)}
        onSuccess={() => {
          loadAllDetails();
          toast.show('Seating assignment saved.', 'success');
        }}
        recordToEdit={meetingHall}
        defaultInviteeId={invitee.id}
      />
    </div>
  );
};
