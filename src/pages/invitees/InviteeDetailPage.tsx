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
  EventAttendanceRecord,
  MeetingRoom,
  MeetingAttendanceRecord,
  UnifiedActivityEvent,
} from '@/types';
import {
  getInviteeById,
  getTransportationRecords,
  getAccommodations,
  getFoodRecords,
  getReceptionRecords,
  getMeetingHallRecords,
  getAuditLogs,
  registerAccommodation,
  undoAccommodationRegistration,
  getEventAttendanceRecords,
  recordEventEntry,
  recordEventExit,
  getMeetingAttendanceRecords,
  recordMeetingEntry,
  recordMeetingExit,
  getMeetingRooms,
  getInviteeActivityTimeline,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { formatDate, formatTime, formatDateTime, formatDuration } from '@/lib/utils';

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
  const [_auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [eventAttendance, setEventAttendance] = useState<EventAttendanceRecord[]>([]);
  const [meetingAttendance, setMeetingAttendance] = useState<MeetingAttendanceRecord[]>([]);
  const [meetingRooms, setMeetingRooms] = useState<MeetingRoom[]>([]);
  const [activityTimeline, setActivityTimeline] = useState<UnifiedActivityEvent[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [expandedPickups, setExpandedPickups] = useState<Record<string, boolean>>({});
  const [gateDateFilter, setGateDateFilter] = useState<string>('all');
  const [activityCategoryFilter, setActivityCategoryFilter] = useState<string>('all');

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
  const [isMeetingEntryOpen, setIsMeetingEntryOpen] = useState(false);
  const [selectedRoomName, setSelectedRoomName] = useState('Main Auditorium');
  const [sessionNameInput, setSessionNameInput] = useState('General Session');

  const loadAllDetails = useCallback(async () => {
    if (!id) return;
    try {
      const inv = await getInviteeById(id);
      setInvitee(inv);

      const [allTrans, allAcc, allFood, allRec, allHall, allAudit, allGate, allMtg, allRooms, timeline] =
        await Promise.all([
          getTransportationRecords(),
          getAccommodations(),
          getFoodRecords(),
          getReceptionRecords(),
          getMeetingHallRecords(),
          getAuditLogs(),
          getEventAttendanceRecords(id),
          getMeetingAttendanceRecords(id),
          getMeetingRooms(),
          getInviteeActivityTimeline(id),
        ]);

      setTransportation(allTrans.filter((t) => t.invitee_id === id));
      setAccommodations(allAcc.filter((a) => a.invitee_id === id));
      setFoods(allFood.filter((f) => f.invitee_id === id));
      setReception(allRec.find((r) => r.invitee_id === id) || null);
      setMeetingHall(allHall.find((h) => h.invitee_id === id) || null);
      setAuditLogs(allAudit.filter((log) => log.record_id === id));
      setEventAttendance(allGate);
      setMeetingAttendance(allMtg);
      setMeetingRooms(allRooms);
      setActivityTimeline(timeline);
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

  const handleRegisterAccommodation = async (accId: string) => {
    if (!currentUser) return;
    setIsActionLoading(true);
    try {
      await registerAccommodation(accId, currentUser);
      toast.show('Hotel check-in & registration marked successfully.', 'success');
      await loadAllDetails();
    } catch (err: any) {
      toast.show(err.message || 'Failed to mark registration', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleUndoAccommodation = async (accId: string) => {
    if (!currentUser) return;
    setIsActionLoading(true);
    try {
      await undoAccommodationRegistration(accId, currentUser, 'Cancelled by user');
      toast.show('Hotel registration cancelled & status set back to Pending.', 'info');
      await loadAllDetails();
    } catch (err: any) {
      toast.show(err.message || 'Failed to undo registration', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleGateEntry = async (date = '2026-12-14') => {
    if (!currentUser || !id) return;
    setIsActionLoading(true);
    try {
      await recordEventEntry(id, currentUser, date);
      toast.show(`Gate entry (IN) recorded for ${invitee?.full_name}`, 'success');
      await loadAllDetails();
    } catch (err: any) {
      toast.show(err.message || 'Failed to record gate entry', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleGateExit = async () => {
    if (!currentUser || !id) return;
    setIsActionLoading(true);
    try {
      await recordEventExit(id, currentUser);
      toast.show(`Gate exit (OUT) recorded for ${invitee?.full_name}`, 'success');
      await loadAllDetails();
    } catch (err: any) {
      toast.show(err.message || 'Failed to record gate exit', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMeetingEntrySubmit = async () => {
    if (!currentUser || !id) return;
    setIsActionLoading(true);
    try {
      await recordMeetingEntry(id, selectedRoomName, sessionNameInput, currentUser);
      toast.show(`Delegate checked into ${selectedRoomName}`, 'success');
      setIsMeetingEntryOpen(false);
      await loadAllDetails();
    } catch (err: any) {
      toast.show(err.message || 'Failed to record meeting entry', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleMeetingExitAction = async (recordId: string) => {
    if (!currentUser) return;
    setIsActionLoading(true);
    try {
      await recordMeetingExit(recordId, currentUser);
      toast.show('Delegate recorded as exited from room', 'info');
      await loadAllDetails();
    } catch (err: any) {
      toast.show(err.message || 'Failed to record room exit', 'error');
    } finally {
      setIsActionLoading(false);
    }
  };

  const activeGateSession = eventAttendance.find((ea) => ea.status === 'IN' && !ea.exit_time);
  const isInsideGate = Boolean(activeGateSession);
  const activeMeetingSession = meetingAttendance.find((ma) => ma.status === 'IN' && !ma.out_time);
  const isInMeeting = Boolean(activeMeetingSession);

  // Filtered gate attendance records
  const filteredGateAttendance = eventAttendance.filter((ea) => {
    if (gateDateFilter === 'all') return true;
    return ea.event_date === gateDateFilter;
  });

  // Filtered timeline events
  const filteredTimeline = activityTimeline.filter((ev) => {
    if (activityCategoryFilter === 'all') return true;
    return ev.type === activityCategoryFilter;
  });

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

        <div className="bg-white p-4 sm:p-6 rounded-2xl border border-[#E3E7E4] shadow-card-subtle flex flex-col md:flex-row md:items-center md:justify-between gap-4 sm:gap-5">
          <div className="flex items-start gap-3.5 sm:gap-4">
            <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-[#164734] text-white flex items-center justify-center font-bold text-lg sm:text-xl shrink-0 shadow-md border-2 border-white">
              {invitee.full_name.charAt(0)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap mb-1">
                <button
                  onClick={copyInviteeCode}
                  title="Click to copy code"
                  className="font-mono text-xs font-bold text-[#164734] bg-[#E8F1EC] hover:bg-[#d8e8de] px-2.5 py-1 rounded-md flex items-center gap-1 transition-colors min-h-[32px]"
                >
                  <span>{invitee.invitee_code}</span>
                  {copiedId ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3 text-[#69756F]" />}
                </button>
                <StatusBadge variant={categoryVariant} label={invitee.category} size="sm" />
              </div>
              <h1 className="text-lg sm:text-2xl font-bold text-[#1A221E] tracking-tight leading-tight">
                {invitee.full_name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-[#69756F] mt-1.5">
                <a
                  href={`tel:${invitee.phone}`}
                  className="flex items-center gap-1 font-mono hover:text-[#164734] hover:underline"
                >
                  <Phone className="h-3 w-3 text-[#164734]" />
                  <span>{invitee.phone}</span>
                </a>
                <span className="hidden xs:inline">•</span>
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-[#164734]" />
                  <span>{invitee.city}, {invitee.state}</span>
                </span>
                <span className="hidden sm:inline">•</span>
                <span className="text-[11px] text-[#69756F] hidden sm:inline">
                  Registered {formatDate(invitee.created_at)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            {canEditBasic && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditBasicOpen(true)}
                className="flex items-center justify-center gap-1.5 border-[#E3E7E4] hover:bg-[#FAF9F6] w-full md:w-auto h-9 sm:h-8 font-semibold"
              >
                <Edit className="h-3.5 w-3.5 text-[#164734]" />
                <span>Edit Basic Details</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Profile Section Navigation Tabs (Responsive scrollable horizontal bar) */}
      <div className="flex items-center overflow-x-auto border-b border-[#E3E7E4] gap-1.5 pb-1.5 scrollbar-none text-xs font-medium -mx-3.5 px-3.5 sm:mx-0 sm:px-0">
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3.5 py-2 min-h-[40px] rounded-lg transition-all shrink-0 flex items-center gap-1.5 whitespace-nowrap ${
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
          className={`px-3.5 py-2 min-h-[40px] rounded-lg transition-all shrink-0 flex items-center gap-1.5 whitespace-nowrap ${
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
          className={`px-3.5 py-2 min-h-[40px] rounded-lg transition-all shrink-0 flex items-center gap-1.5 whitespace-nowrap ${
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
          className={`px-3.5 py-2 min-h-[40px] rounded-lg transition-all shrink-0 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'reception'
              ? 'bg-[#164734] text-white font-semibold shadow-xs'
              : 'text-[#69756F] hover:bg-[#E8F1EC] hover:text-[#164734]'
          }`}
        >
          <UserCheck className="h-3.5 w-3.5" />
          <span>Event Reception (Gate)</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            isInsideGate
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-[#FAF9F6] text-[#69756F] border border-[#E3E7E4]'
          }`}>
            {isInsideGate ? 'Inside Venue' : 'Outside'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('seating')}
          className={`px-3.5 py-2 min-h-[40px] rounded-lg transition-all shrink-0 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'seating'
              ? 'bg-[#164734] text-white font-semibold shadow-xs'
              : 'text-[#69756F] hover:bg-[#E8F1EC] hover:text-[#164734]'
          }`}
        >
          <Armchair className="h-3.5 w-3.5" />
          <span>Meeting Hall & Rooms</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            isInMeeting
              ? 'bg-blue-100 text-blue-800'
              : meetingHall
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-[#FAF9F6] text-[#69756F] border border-[#E3E7E4]'
          }`}>
            {isInMeeting ? `In: ${activeMeetingSession?.room_name}` : meetingHall ? meetingHall.seat_number : 'Unassigned'}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-3.5 py-2 min-h-[40px] rounded-lg transition-all shrink-0 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-[#164734] text-white font-semibold shadow-xs'
              : 'text-[#69756F] hover:bg-[#E8F1EC] hover:text-[#164734]'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>Unified Activity Trail</span>
          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
            activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-[#FAF9F6] text-[#69756F] border border-[#E3E7E4]'
          }`}>
            {activityTimeline.length}
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
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setExpandedPickups((prev) => ({ ...prev, [t.id]: !prev[t.id] }))}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#164734] hover:underline"
                      >
                        {expandedPickups[t.id] ? (
                          <>
                            <ChevronUp className="h-3.5 w-3.5" />
                            <span>Hide Details</span>
                          </>
                        ) : (
                          <>
                            <ChevronDown className="h-3.5 w-3.5" />
                            <span>Show Pickup Details</span>
                          </>
                        )}
                      </button>

                      {expandedPickups[t.id] && (
                        <div className="bg-white p-2.5 rounded-lg border border-[#E3E7E4] text-[11px] space-y-1 mt-1.5 animate-fade-in">
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

                  {/* Hotel Registration Status & Actions */}
                  <div className="pt-2.5 border-t border-[#E3E7E4] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#69756F] block">
                        Hotel Registration Status
                      </span>
                      {a.hotel_registered ? (
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded text-[11px]">
                            <Check className="h-3 w-3" />
                            <span>Registered</span>
                          </span>
                          <span className="text-[10px] text-[#69756F]">
                            {formatDateTime(a.registered_at)}
                          </span>
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-medium px-2 py-0.5 rounded text-[11px] mt-0.5">
                          <span>Pending Registration</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {canEditAcc && (
                        <>
                          {a.hotel_registered ? (
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isActionLoading}
                              className="h-7 text-xs px-2.5 text-amber-700 hover:bg-amber-50 border-amber-300"
                              onClick={() => handleUndoAccommodation(a.id)}
                            >
                              <span>Undo Registration</span>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              disabled={isActionLoading}
                              className="h-7 text-xs px-3 bg-[#164734] hover:bg-[#123829] text-white"
                              onClick={() => handleRegisterAccommodation(a.id)}
                            >
                              <Check className="h-3.5 w-3.5 mr-1" />
                              <span>Mark as Registered</span>
                            </Button>
                          )}

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
                        </>
                      )}
                    </div>
                  </div>
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

      {/* 5. EVENT RECEPTION & GATE MOVEMENT TRACKING */}
      {(activeTab === 'all' || activeTab === 'reception') && (
        <div className="bg-white rounded-2xl border border-[#E3E7E4] p-5 sm:p-6 shadow-card-subtle space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[#F4F6F4] gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#E8F1EC] text-[#164734]">
                <UserCheck className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#164734]">
                  Event Reception & Gate Movement Tracking
                </h2>
                <p className="text-[11px] text-[#69756F]">
                  Venue physical entry and exit verification across session dates.
                </p>
              </div>
            </div>

            {/* Quick 1-Click Gate Entry / Exit Actions */}
            {canEditReception && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {isInsideGate ? (
                  <Button
                    size="sm"
                    disabled={isActionLoading}
                    onClick={() => handleGateExit()}
                    className="h-10 sm:h-8 text-sm sm:text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white shadow-xs w-full sm:w-auto"
                  >
                    <span>Record Gate Exit (OUT)</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    disabled={isActionLoading}
                    onClick={() => handleGateEntry()}
                    className="h-10 sm:h-8 text-sm sm:text-xs font-semibold bg-[#164734] hover:bg-[#123829] text-white shadow-xs w-full sm:w-auto"
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    <span>Record Gate Entry (IN)</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Current Venue Gate Status Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
            isInsideGate
              ? 'bg-[#E8F1EC]/60 border-[#C5DEC8]'
              : 'bg-[#FAF9F6] border-[#E3E7E4]'
          }`}>
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full shrink-0 ${
                isInsideGate ? 'bg-emerald-600 animate-pulse' : 'bg-gray-400'
              }`} />
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#69756F] block">
                  Current Venue Status
                </span>
                <span className="text-sm font-bold text-[#1A221E]">
                  {isInsideGate ? 'Inside Event Venue (Gate IN)' : 'Currently Outside Venue (Gate OUT)'}
                </span>
                {activeGateSession && (
                  <p className="text-[11px] text-[#164734] font-medium mt-0.5">
                    Inside since {formatDateTime(activeGateSession.entry_time)}
                    {activeGateSession.entry_recorded_by_name && ` • Logged by ${activeGateSession.entry_recorded_by_name}`}
                  </p>
                )}
              </div>
            </div>

            <div className="text-xs text-[#69756F]">
              Total Sessions Today: <span className="font-bold text-[#1A221E]">{eventAttendance.length}</span>
            </div>
          </div>

          {/* Date Filter Tabs */}
          <div className="flex items-center justify-between flex-wrap gap-2 pt-1">
            <span className="text-xs font-bold text-[#1A221E]">Movement Log History:</span>
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              {[
                { label: 'All Dates', value: 'all' },
                { label: '14 Dec 2026', value: '2026-12-14' },
                { label: '15 Dec 2026', value: '2026-12-15' },
                { label: '16 Dec 2026', value: '2026-12-16' },
              ].map((df) => (
                <button
                  key={df.value}
                  onClick={() => setGateDateFilter(df.value)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    gateDateFilter === df.value
                      ? 'bg-[#164734] text-white font-semibold'
                      : 'bg-[#FAF9F6] text-[#69756F] hover:bg-[#E8F1EC] border border-[#E3E7E4]'
                  }`}
                >
                  {df.label}
                </button>
              ))}
            </div>
          </div>

          {/* Gate Movement History List */}
          {filteredGateAttendance.length === 0 ? (
            <div className="py-6 text-center text-xs text-[#69756F] bg-[#FAF9F6] rounded-xl border border-dashed border-[#E3E7E4]">
              <UserCheck className="h-6 w-6 text-[#69756F]/40 mx-auto mb-1.5" />
              <p className="font-medium text-[#1A221E]">No gate movements recorded</p>
              <p className="mt-0.5">Physical IN/OUT entries logged by the Reception Team appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-[#E3E7E4] rounded-xl">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF9F6] border-b border-[#E3E7E4] text-[#69756F] font-semibold text-[11px] uppercase tracking-wider">
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Entry (IN)</th>
                    <th className="py-2.5 px-3">Exit (OUT)</th>
                    <th className="py-2.5 px-3">Duration</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Recorded By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6F4]">
                  {filteredGateAttendance.map((ea) => (
                    <tr key={ea.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                      <td className="py-2.5 px-3 font-medium text-[#1A221E] whitespace-nowrap">
                        {formatDate(ea.event_date)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#164734] whitespace-nowrap">
                        {formatDateTime(ea.entry_time)}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-[#4A5550] whitespace-nowrap">
                        {ea.exit_time ? formatDateTime(ea.exit_time) : <span className="text-emerald-700 font-bold">Active Inside</span>}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-[#4A5550]">
                        {formatDuration(ea.duration_minutes)}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                          ea.status === 'IN' && !ea.exit_time
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {ea.status === 'IN' && !ea.exit_time ? 'INSIDE' : 'EXITED'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#69756F] truncate max-w-[130px]">
                        {ea.entry_recorded_by_name || 'Volunteer'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 6. MEETING HALL & SEATING / ROOM MOVEMENTS */}
      {(activeTab === 'all' || activeTab === 'seating') && (
        <div className="bg-white rounded-2xl border border-[#E3E7E4] p-4 sm:p-6 shadow-card-subtle space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[#F4F6F4] gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#E8F1EC] text-[#164734]">
                <Armchair className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#164734]">
                  Meeting Hall Seating & Delegate Room Movement
                </h2>
                <p className="text-[11px] text-[#69756F]">
                  Designated seat allocation and live tracking of delegate sessions across rooms.
                </p>
              </div>
            </div>
            {canEditHall && (
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsHallModalOpen(true)}
                  className="h-10 sm:h-8 text-xs text-[#164734] border-[#164734]/30 hover:bg-[#E8F1EC] flex-1 sm:flex-initial"
                >
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  <span>{meetingHall ? 'Change Seat' : 'Assign Seat'}</span>
                </Button>
                {isInMeeting ? (
                  <Button
                    size="sm"
                    disabled={isActionLoading}
                    onClick={() => activeMeetingSession && handleMeetingExitAction(activeMeetingSession.id)}
                    className="h-10 sm:h-8 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white flex-1 sm:flex-initial"
                  >
                    <span>Exit Room</span>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => setIsMeetingEntryOpen(true)}
                    className="h-10 sm:h-8 text-xs font-semibold bg-[#164734] hover:bg-[#123829] text-white flex-1 sm:flex-initial"
                  >
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    <span>Check Into Room</span>
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Designated Seat Card */}
          {!meetingHall ? (
            <div className="py-4 text-center text-xs text-[#69756F] bg-[#FAF9F6] rounded-xl border border-dashed border-[#E3E7E4]">
              <Armchair className="h-6 w-6 text-[#69756F]/40 mx-auto mb-1" />
              <p className="font-medium text-[#1A221E]">No designated seat assigned yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl">
                <span className="text-[#69756F] block font-medium text-[11px]">Primary Hall</span>
                <span className="font-bold text-sm text-[#1A221E] mt-0.5 block truncate">
                  {meetingHall.meeting_hall}
                </span>
              </div>
              <div className="p-3 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl">
                <span className="text-[#69756F] block font-medium text-[11px]">Seating Section</span>
                <span className="font-semibold text-[#164734] mt-0.5 block">
                  {meetingHall.seating_section}
                </span>
              </div>
              <div className="p-3 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl">
                <span className="text-[#69756F] block font-medium text-[11px]">Designated Seat</span>
                <span className="font-mono font-bold text-base text-[#164734] mt-0.5 block">
                  {meetingHall.seat_number}
                </span>
              </div>
              <div className="p-3 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl">
                <span className="text-[#69756F] block font-medium text-[11px]">Hall Status</span>
                <span className="font-semibold text-[#1A221E] mt-0.5 block">
                  {meetingHall.attendance_status}
                </span>
              </div>
            </div>
          )}

          {/* Current Room Movement Status Banner */}
          <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
            isInMeeting
              ? 'bg-blue-50 border-blue-200'
              : 'bg-[#FAF9F6] border-[#E3E7E4]'
          }`}>
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full shrink-0 ${
                isInMeeting ? 'bg-blue-600 animate-pulse' : 'bg-gray-400'
              }`} />
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#69756F] block">
                  Live Room Presence
                </span>
                <span className="text-sm font-bold text-[#1A221E]">
                  {isInMeeting ? `Inside ${activeMeetingSession?.room_name}` : 'Not currently in any committee room'}
                </span>
                {activeMeetingSession && (
                  <p className="text-[11px] text-blue-800 font-medium mt-0.5">
                    Session: {activeMeetingSession.session_name} • In since {formatDateTime(activeMeetingSession.in_time)}
                  </p>
                )}
              </div>
            </div>

            {isInMeeting && canEditHall && (
              <Button
                size="sm"
                variant="outline"
                disabled={isActionLoading}
                onClick={() => activeMeetingSession && handleMeetingExitAction(activeMeetingSession.id)}
                className="h-7 text-xs text-amber-800 border-amber-300 hover:bg-amber-100 self-start sm:self-center"
              >
                <span>Record Room Exit</span>
              </Button>
            )}
          </div>

          {/* Room Movements Log Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-[#1A221E]">Room Attendance History:</span>
              <span className="text-[11px] text-[#69756F]">
                {meetingAttendance.length} movement{meetingAttendance.length === 1 ? '' : 's'} recorded
              </span>
            </div>

            {meetingAttendance.length === 0 ? (
              <div className="py-5 text-center text-xs text-[#69756F] bg-[#FAF9F6] rounded-xl border border-dashed border-[#E3E7E4]">
                <p>No room check-ins recorded for this delegate yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-[#E3E7E4] rounded-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-[#FAF9F6] border-b border-[#E3E7E4] text-[#69756F] font-semibold text-[11px] uppercase tracking-wider">
                      <th className="py-2.5 px-3">Room Name</th>
                      <th className="py-2.5 px-3">Session</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">In Time</th>
                      <th className="py-2.5 px-3">Out Time</th>
                      <th className="py-2.5 px-3">Duration</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F4F6F4]">
                    {meetingAttendance.map((ma) => (
                      <tr key={ma.id} className="hover:bg-[#FAF9F6]/80 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-[#164734] whitespace-nowrap">
                          {ma.room_name}
                        </td>
                        <td className="py-2.5 px-3 text-[#1A221E] whitespace-nowrap font-medium">
                          {ma.session_name}
                        </td>
                        <td className="py-2.5 px-3 text-[#69756F] whitespace-nowrap">
                          {formatDate(ma.meeting_date)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#164734] whitespace-nowrap">
                          {formatDateTime(ma.in_time)}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#4A5550] whitespace-nowrap">
                          {ma.out_time ? formatDateTime(ma.out_time) : <span className="text-blue-700 font-bold">Inside</span>}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap text-[#4A5550]">
                          {formatDuration(ma.duration_minutes)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold ${
                            ma.status === 'IN' && !ma.out_time
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {ma.status === 'IN' && !ma.out_time ? 'IN ROOM' : 'EXITED'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. UNIFIED ACTIVITY HISTORY TIMELINE */}
      {(activeTab === 'all' || activeTab === 'history') && (
        <div className="bg-white rounded-2xl border border-[#E3E7E4] p-5 sm:p-6 shadow-card-subtle space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-[#F4F6F4] gap-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#E8F1EC] text-[#164734]">
                <History className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#164734]">
                  Unified Activity History & Timeline
                </h2>
                <p className="text-[11px] text-[#69756F]">
                  Consolidated chronological stream of transit, hotel registration, gate movements, and room attendance.
                </p>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
              {[
                { label: 'All Activities', value: 'all' },
                { label: 'Transportation', value: 'transportation' },
                { label: 'Hotel Registration', value: 'accommodation' },
                { label: 'Event Gate', value: 'reception' },
                { label: 'Meeting Rooms', value: 'meeting' },
              ].map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setActivityCategoryFilter(cat.value)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    activityCategoryFilter === cat.value
                      ? 'bg-[#164734] text-white font-semibold'
                      : 'bg-[#FAF9F6] text-[#69756F] hover:bg-[#E8F1EC] border border-[#E3E7E4]'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {filteredTimeline.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#69756F]">
              <History className="h-7 w-7 text-[#69756F]/40 mx-auto mb-2" />
              <p className="font-medium text-[#1A221E]">No activity events found in this category</p>
              <p className="mt-0.5">As operations are logged across departments, they appear in this unified feed.</p>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-[#E3E7E4]">
              {filteredTimeline.map((ev) => (
                <div key={ev.id} className="relative group">
                  {/* Timeline Node Dot */}
                  <div className={`absolute -left-6 top-1 h-3.5 w-3.5 rounded-full border-2 border-white shadow-xs ${
                    ev.type === 'transportation'
                      ? 'bg-sky-600'
                      : ev.type === 'accommodation'
                      ? 'bg-emerald-600'
                      : ev.type === 'reception'
                      ? 'bg-amber-600'
                      : 'bg-indigo-600'
                  }`} />

                  <div className="bg-[#FAF9F6] hover:bg-white p-3.5 rounded-xl border border-[#E3E7E4] transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 mb-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          ev.type === 'transportation'
                            ? 'bg-sky-100 text-sky-800'
                            : ev.type === 'accommodation'
                            ? 'bg-emerald-100 text-emerald-800'
                            : ev.type === 'reception'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {ev.type}
                        </span>
                        <h3 className="text-xs font-bold text-[#1A221E]">{ev.title}</h3>
                      </div>
                      <span className="font-mono text-[11px] text-[#69756F]">
                        {formatDateTime(ev.timestamp)}
                      </span>
                    </div>

                    <p className="text-xs text-[#4A5550]">{ev.description}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Check In to Meeting Room Modal */}
      {isMeetingEntryOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full p-4 sm:p-6 border border-[#E3E7E4] shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-[#1A221E]">Check In to Meeting Room</h3>
              <p className="text-xs text-[#69756F] mt-0.5">
                Record {invitee.full_name} entering a session room.
              </p>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-[#1A221E] mb-1.5">Select Room</label>
                <select
                  value={selectedRoomName}
                  onChange={(e) => setSelectedRoomName(e.target.value)}
                  className="w-full h-10 rounded-lg border border-[#E3E7E4] px-3 bg-white text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20"
                >
                  {meetingRooms.length > 0 ? (
                    meetingRooms
                      .filter((r) => r.is_active)
                      .map((r) => (
                        <option key={r.id} value={r.name}>
                          {r.name}
                        </option>
                      ))
                  ) : (
                    <>
                      <option value="Main Auditorium">Main Auditorium</option>
                      <option value="Founder Committee Room">Founder Committee Room</option>
                      <option value="Executive Committee Room">Executive Committee Room</option>
                      <option value="Member Committee Room">Member Committee Room</option>
                    </>
                  )}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#1A221E] mb-1.5">Session Name</label>
                <input
                  type="text"
                  value={sessionNameInput}
                  onChange={(e) => setSessionNameInput(e.target.value)}
                  placeholder="e.g. Inaugural Session or Morning Working Session"
                  className="w-full h-10 rounded-lg border border-[#E3E7E4] px-3 text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row items-center justify-end gap-2 pt-3 border-t border-[#F4F6F4]">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsMeetingEntryOpen(false)}
                className="w-full sm:w-auto h-10 sm:h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isActionLoading}
                onClick={handleMeetingEntrySubmit}
                className="w-full sm:w-auto h-10 sm:h-9 text-xs bg-[#164734] hover:bg-[#123829] text-white"
              >
                <span>Confirm Check In</span>
              </Button>
            </div>
          </div>
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
