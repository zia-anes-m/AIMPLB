import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Download,
  Printer,
  Users,
  PlaneTakeoff,
  PlaneLanding,
  Building2,
  UtensilsCrossed,
  UserCheck,
  Armchair,
  Phone,
  Home,
  CheckCircle2,
  QrCode,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Calendar,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/common/PageHeader';
import { LoadingSkeleton } from '@/components/common/LoadingSkeleton';
import { Logo } from '@/components/common/Logo';
import {
  getInvitees,
  getTransportationRecords,
  getAccommodations,
  getFoodRecords,
  getReceptionRecords,
  getMeetingHallRecords,
  getEventAttendanceRecords,
} from '@/services/api';
import {
  Invitee,
  TransportationRecord,
  AccommodationRecord,
  FoodRecord,
  ReceptionRecord,
  MeetingHallRecord,
  EventAttendanceRecord,
} from '@/types';
import { useToast } from '@/context/ToastContext';
import { exportToCSV } from '@/lib/exportUtils';
import { formatDate, formatTime, formatDateTime } from '@/lib/utils';

type ReportType =
  | 'invitees_all'
  | 'invitees_contacts'
  | 'movement_daily_consolidated'
  | 'movement_individual'
  | 'transport_arrivals'
  | 'transport_departures'
  | 'accommodation_hotels'
  | 'accommodation_hajj_house'
  | 'food_daily'
  | 'reception_summary'
  | 'seating_chart';

export const ReportsPage: React.FC = () => {
  const toast = useToast();
  const [selectedReport, setSelectedReport] = useState<ReportType>('invitees_all');

  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [transport, setTransport] = useState<TransportationRecord[]>([]);
  const [accommodations, setAccommodations] = useState<AccommodationRecord[]>([]);
  const [foods, setFoods] = useState<FoodRecord[]>([]);
  const [reception, setReception] = useState<ReceptionRecord[]>([]);
  const [halls, setHalls] = useState<MeetingHallRecord[]>([]);
  const [attendance, setAttendance] = useState<EventAttendanceRecord[]>([]);
  const [movementDate, setMovementDate] = useState<'2026-12-14' | '2026-12-15' | '2026-12-16' | 'all'>('2026-12-14');
  const [movementSearch, setMovementSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadAll = useCallback(async () => {
    try {
      const [inv, tr, acc, fd, rec, hl, att] = await Promise.all([
        getInvitees(),
        getTransportationRecords(),
        getAccommodations(),
        getFoodRecords(),
        getReceptionRecords(),
        getMeetingHallRecords(),
        getEventAttendanceRecords(),
      ]);
      setInvitees(inv);
      setTransport(tr);
      setAccommodations(acc);
      setFoods(fd);
      setReception(rec);
      setHalls(hl);
      setAttendance(att);
    } catch (err) {
      console.error('Error loading report datasets:', err);
      toast.error('Failed to load report datasets.');
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadAll();

    // Listen to background database updates
    const handleUpdate = () => {
      loadAll();
    };
    window.addEventListener('aimplb_db_update', handleUpdate);
    return () => {
      window.removeEventListener('aimplb_db_update', handleUpdate);
    };
  }, [loadAll]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportCSV = () => {
    switch (selectedReport) {
      case 'invitees_all': {
        const headers = ['Invitee Code', 'Full Name', 'Category', 'Phone', 'City', 'State', 'Registration Date'];
        const rows = invitees.map((i) => [
          i.invitee_code,
          i.full_name,
          i.category,
          i.phone,
          i.city,
          i.state,
          formatDate(i.created_at),
        ]);
        exportToCSV('AIMPLB_Invitee_Directory', headers, rows);
        toast.success('Exported invitee directory to CSV', `${rows.length} rows.`);
        break;
      }
      case 'invitees_contacts': {
        const headers = ['Invitee Code', 'Full Name', 'Category', 'Primary Phone', 'Alternate Phone', 'City', 'State', 'Address'];
        const rows = invitees.map((i) => [
          i.invitee_code,
          i.full_name,
          i.category,
          i.phone,
          i.alternate_phone || '—',
          i.city,
          i.state,
          i.address || '—',
        ]);
        exportToCSV('AIMPLB_Contact_Roster', headers, rows);
        toast.success('Exported contact roster to CSV', `${rows.length} rows.`);
        break;
      }
      case 'movement_daily_consolidated': {
        const targetRecords = movementDate === 'all'
          ? attendance
          : attendance.filter((a) => a.event_date === movementDate);

        const headers = [
          'Invitee Code',
          'Full Name',
          'Category',
          'City',
          'State',
          'Phone',
          'Event Date',
          'Current Status',
          'Entry Time (IST)',
          'Exit Time (IST)',
          'Duration (Mins)',
          'Scanned By Volunteer',
          'Audit Corrected',
          'Correction Reason',
        ];
        const rows = targetRecords.map((r) => [
          r.invitee?.invitee_code || '',
          r.invitee?.full_name || '',
          r.invitee?.category || '',
          r.invitee?.city || '',
          r.invitee?.state || '',
          r.invitee?.phone || '',
          r.event_date,
          r.status,
          formatDateTime(r.entry_time),
          formatDateTime(r.exit_time),
          r.duration_minutes || '',
          r.entry_recorded_by_name || '',
          r.is_corrected ? 'YES' : 'NO',
          r.correction_reason || '',
        ]);
        exportToCSV(`AIMPLB_Daily_Movement_Report_${movementDate}`, headers, rows);
        toast.success('Exported daily movement report to CSV', `${rows.length} rows.`);
        break;
      }
      case 'movement_individual': {
        const headers = [
          'Invitee Code',
          'Full Name',
          'Category',
          'City',
          'State',
          'Phone',
          'Event Date',
          'Status',
          'Entry Time (IST)',
          'Exit Time (IST)',
          'Duration (Mins)',
          'Recorded By Volunteer',
          'Audit Corrected',
          'Correction Reason',
        ];
        const rows = attendance.map((r) => [
          r.invitee?.invitee_code || '',
          r.invitee?.full_name || '',
          r.invitee?.category || '',
          r.invitee?.city || '',
          r.invitee?.state || '',
          r.invitee?.phone || '',
          r.event_date,
          r.status,
          formatDateTime(r.entry_time),
          formatDateTime(r.exit_time),
          r.duration_minutes || '',
          r.entry_recorded_by_name || '',
          r.is_corrected ? 'YES' : 'NO',
          r.correction_reason || '',
        ]);
        exportToCSV('AIMPLB_Individual_Movement_Audit_Trail', headers, rows);
        toast.success('Exported individual movement audit trail to CSV', `${rows.length} rows.`);
        break;
      }
      case 'transport_arrivals': {
        const arrivals = transport.filter((t) => t.journey_type === 'arrival');
        const headers = ['Invitee Code', 'Full Name', 'Date', 'Time', 'Mode', 'Location', 'Number', 'Pickup Point', 'Driver', 'Driver Phone'];
        const rows = arrivals.map((a) => [
          a.invitee?.invitee_code || '',
          a.invitee?.full_name || '',
          formatDate(a.journey_date),
          formatTime(a.journey_time),
          a.transport_mode,
          a.location_name,
          a.transport_number || '',
          a.pickup_point || '',
          a.driver_name || '',
          a.driver_phone || '',
        ]);
        exportToCSV('AIMPLB_Arrivals_Report', headers, rows);
        toast.success('Exported arrivals report to CSV', `${rows.length} rows.`);
        break;
      }
      case 'transport_departures': {
        const departures = transport.filter((t) => t.journey_type === 'departure');
        const headers = ['Invitee Code', 'Full Name', 'Date', 'Time', 'Mode', 'Location', 'Number', 'Driver', 'Remarks'];
        const rows = departures.map((d) => [
          d.invitee?.invitee_code || '',
          d.invitee?.full_name || '',
          formatDate(d.journey_date),
          formatTime(d.journey_time),
          d.transport_mode,
          d.location_name,
          d.transport_number || '',
          d.driver_name || '',
          d.remarks || '',
        ]);
        exportToCSV('AIMPLB_Departures_Report', headers, rows);
        toast.success('Exported departures report to CSV', `${rows.length} rows.`);
        break;
      }
      case 'accommodation_hotels': {
        const hotels = accommodations.filter((a) => a.accommodation_type === 'Hotel');
        const headers = ['Invitee Code', 'Full Name', 'Hotel', 'Room No', 'Room Type', 'Occupancy', 'Check-in', 'Check-out'];
        const rows = hotels.map((h) => [
          h.invitee?.invitee_code || '',
          h.invitee?.full_name || '',
          h.hotel_name || '',
          h.room_number || '',
          h.room_type || '',
          h.occupancy || '',
          formatDate(h.check_in_date),
          formatDate(h.check_out_date),
        ]);
        exportToCSV('AIMPLB_Hotel_Allocations_Report', headers, rows);
        toast.success('Exported hotel allocations to CSV', `${rows.length} rows.`);
        break;
      }
      case 'accommodation_hajj_house': {
        const hajj = accommodations.filter((a) => a.accommodation_type === 'Hajj House');
        const headers = ['Invitee Code', 'Full Name', 'Category', 'Room Type', 'Room No', 'Check-in', 'Check-out'];
        const rows = hajj.map((h) => [
          h.invitee?.invitee_code || '',
          h.invitee?.full_name || '',
          h.invitee?.category || '',
          h.room_type || '',
          h.room_number || '',
          formatDate(h.check_in_date),
          formatDate(h.check_out_date),
        ]);
        exportToCSV('AIMPLB_Hajj_House_Allocations', headers, rows);
        toast.success('Exported Hajj House allocations to CSV', `${rows.length} rows.`);
        break;
      }
      case 'food_daily': {
        const headers = ['Invitee Code', 'Full Name', 'Date', 'Dietary Preference', 'Breakfast', 'Lunch', 'Dinner', 'Special Requirements'];
        const rows = foods.map((f) => [
          f.invitee?.invitee_code || '',
          f.invitee?.full_name || '',
          formatDate(f.meal_date),
          f.dietary_preference,
          f.breakfast ? 'YES' : 'NO',
          f.lunch ? 'YES' : 'NO',
          f.dinner ? 'YES' : 'NO',
          f.special_requirements || '',
        ]);
        exportToCSV('AIMPLB_Meal_Requirements_Report', headers, rows);
        toast.success('Exported meal requirements to CSV', `${rows.length} rows.`);
        break;
      }
      case 'reception_summary': {
        const headers = ['Invitee Code', 'Full Name', 'Status', 'Expected Arrival', 'Actual Arrival', 'Desk', 'Kit'];
        const rows = reception.map((r) => [
          r.invitee?.invitee_code || '',
          r.invitee?.full_name || '',
          r.reception_status,
          formatDateTime(r.expected_arrival),
          formatDateTime(r.actual_arrival),
          r.reception_point || '',
          r.welcome_kit_status || '',
        ]);
        exportToCSV('AIMPLB_Reception_Status_Report', headers, rows);
        toast.success('Exported reception status to CSV', `${rows.length} rows.`);
        break;
      }
      case 'seating_chart': {
        const headers = ['Invitee Code', 'Full Name', 'Category', 'Hall', 'Section', 'Seat No', 'Status'];
        const rows = halls.map((h) => [
          h.invitee?.invitee_code || '',
          h.invitee?.full_name || '',
          h.invitee?.category || '',
          h.meeting_hall,
          h.seating_section,
          h.seat_number,
          h.attendance_status,
        ]);
        exportToCSV('AIMPLB_Seating_Allocation_Report', headers, rows);
        toast.success('Exported seating allocation to CSV', `${rows.length} rows.`);
        break;
      }
    }
  };

  const reportTabs = useMemo(
    () => [
      { id: 'invitees_all', label: 'All Invitees Directory', icon: Users, count: invitees.length },
      { id: 'invitees_contacts', label: 'Contact Roster', icon: Phone, count: invitees.length },
      {
        id: 'movement_daily_consolidated',
        label: 'Daily Gate Movement Report',
        icon: QrCode,
        count: attendance.length,
      },
      {
        id: 'movement_individual',
        label: 'Individual Movement Audit',
        icon: ShieldCheck,
        count: attendance.length,
      },
      {
        id: 'transport_arrivals',
        label: 'Arrivals Schedule',
        icon: PlaneLanding,
        count: transport.filter((t) => t.journey_type === 'arrival').length,
      },
      {
        id: 'transport_departures',
        label: 'Departures Schedule',
        icon: PlaneTakeoff,
        count: transport.filter((t) => t.journey_type === 'departure').length,
      },
      {
        id: 'accommodation_hotels',
        label: 'Hotel Allocations',
        icon: Building2,
        count: accommodations.filter((a) => a.accommodation_type === 'Hotel').length,
      },
      {
        id: 'accommodation_hajj_house',
        label: 'Hajj House Rooms',
        icon: Home,
        count: accommodations.filter((a) => a.accommodation_type === 'Hajj House').length,
      },
      { id: 'food_daily', label: 'Catering Requirements', icon: UtensilsCrossed, count: foods.length },
      { id: 'reception_summary', label: 'Reception Checklist', icon: UserCheck, count: reception.length },
      { id: 'seating_chart', label: 'Seating Allocation', icon: Armchair, count: halls.length },
    ],
    [invitees.length, transport, accommodations, foods.length, reception.length, halls.length, attendance.length]
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print">
        <PageHeader
          title="Secretariat Official Reports"
          subtitle="Export structured database lists for Secretariat briefings, reception desks, and hotel receptionists"
          badge="Print & Export"
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handlePrint}
                className="flex items-center gap-1.5 font-medium"
              >
                <Printer className="h-3.5 w-3.5" />
                <span>Print Document</span>
              </Button>

              <Button
                size="sm"
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 bg-[#164734] hover:bg-[#113829] text-white shadow-xs font-semibold"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Export CSV</span>
              </Button>
            </div>
          }
        />
      </div>

      {/* Report Selector Pills */}
      <div className="bg-white p-2 sm:p-2.5 rounded-2xl border border-[#E3E7E4] shadow-card-subtle flex items-center overflow-x-auto gap-1.5 text-xs no-print scrollbar-none">
        {reportTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedReport === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedReport(tab.id as ReportType)}
              className={`px-3 sm:px-3.5 py-2 rounded-xl transition-all shrink-0 flex items-center gap-1.5 font-medium text-xs cursor-pointer ${
                isActive
                  ? 'bg-[#164734] text-white font-semibold shadow-xs'
                  : 'text-[#69756F] hover:bg-[#FAF9F6] hover:text-[#1A221E]'
              }`}
            >
              <Icon className="h-3.5 w-3.5 shrink-0" />
              <span className="whitespace-nowrap">{tab.label}</span>
              <span
                className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : 'bg-[#FAF9F6] text-[#69756F] border border-[#E3E7E4]'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Printable Report Sheet */}
      {isLoading ? (
        <LoadingSkeleton rows={8} />
      ) : (
        <div className="bg-white p-6 sm:p-8 rounded-2xl border border-[#E3E7E4] shadow-card-subtle transition-all duration-200">
          {/* Institutional Document Header */}
          <div className="border-b-2 border-[#164734] pb-4 mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-3 mb-1.5">
                <Logo
                  size="md"
                  className="h-10 w-10 object-contain shrink-0"
                  alt="AIMPLB Logo"
                />
                <div>
                  <h2 className="text-xs font-bold tracking-widest uppercase text-[#164734]">
                    All India Muslim Personal Law Board
                  </h2>
                  <h3 className="text-base sm:text-lg font-extrabold text-[#1A221E]">
                    30th Annual Session • Hajj House, Chennai
                  </h3>
                </div>
              </div>
              <p className="text-xs text-[#69756F]">
                Dates: 14, 15, 16 December 2026 • Official Secretariat Document
              </p>
            </div>
            <div className="sm:text-right">
              <span className="font-mono text-xs text-[#69756F] block">
                Generated: {formatDate(new Date().toISOString())}
              </span>
              <span className="font-bold text-xs uppercase text-[#164734] bg-[#E8F1EC] px-2.5 py-1 rounded-md inline-block mt-1">
                {selectedReport.replace(/_/g, ' ')}
              </span>
            </div>
          </div>

          {/* 1. All Invitees Directory */}
          {selectedReport === 'invitees_all' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E3E7E4] bg-[#FAF9F6] text-[#69756F] font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Delegate Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">City & State</th>
                    <th className="py-2.5 px-3">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6F4]">
                  {invitees.map((i) => (
                    <tr key={i.id} className="hover:bg-[#FAF9F6]/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#164734]">{i.invitee_code}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#1A221E]">{i.full_name}</td>
                      <td className="py-2.5 px-3">{i.category}</td>
                      <td className="py-2.5 px-3 font-mono">{i.phone}</td>
                      <td className="py-2.5 px-3">{i.city}, {i.state}</td>
                      <td className="py-2.5 px-3 font-mono text-[#69756F]">
                        {formatDate(i.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* 2. Contact Roster */}
          {selectedReport === 'invitees_contacts' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E3E7E4] bg-[#FAF9F6] text-[#69756F] font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Delegate Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Primary Phone</th>
                    <th className="py-2.5 px-3">Alt Phone</th>
                    <th className="py-2.5 px-3">City & State</th>
                    <th className="py-2.5 px-3">Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6F4]">
                  {invitees.map((i) => (
                    <tr key={i.id} className="hover:bg-[#FAF9F6]/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#164734]">{i.invitee_code}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#1A221E]">{i.full_name}</td>
                      <td className="py-2.5 px-3">{i.category}</td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-[#164734]">{i.phone}</td>
                      <td className="py-2.5 px-3 font-mono text-[#69756F]">{i.alternate_phone || '—'}</td>
                      <td className="py-2.5 px-3">{i.city}, {i.state}</td>
                      <td className="py-2.5 px-3 max-w-[200px] truncate text-[#69756F]">{i.address || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PHASE 5: Daily Consolidated Gate Movement Report */}
          {selectedReport === 'movement_daily_consolidated' && (() => {
            const targetRecords = movementDate === 'all'
              ? attendance
              : attendance.filter((a) => a.event_date === movementDate);

            const totalRegistered = invitees.length;

            // Currently inside venue (active session across any date)
            const activeInsideMap = new Map<string, EventAttendanceRecord>();
            for (const a of attendance) {
              if (a.status === 'IN' && !a.exit_time && !activeInsideMap.has(a.invitee_id)) {
                activeInsideMap.set(a.invitee_id, a);
              }
            }
            const currentlyInside = activeInsideMap.size;
            const currentlyOutside = Math.max(0, totalRegistered - currentlyInside);

            // Unique attendees on selected date
            const dateUniqueAttendees = new Set(
              targetRecords.filter((a) => Boolean(a.entry_time)).map((a) => a.invitee_id)
            );
            const uniqueAttendeesCount = dateUniqueAttendees.size;

            const totalInMoves = targetRecords.filter((a) => Boolean(a.entry_time)).length;
            const totalOutMoves = targetRecords.filter((a) => Boolean(a.exit_time)).length;

            // Invitees who never checked in on this date
            const neverCheckedIn = invitees.filter((i) => !dateUniqueAttendees.has(i.id));

            // Incomplete or inconsistent movements
            const inconsistentRecords = targetRecords.filter(
              (r) => r.is_corrected || (r.event_date < '2026-12-16' && r.status === 'IN' && !r.exit_time)
            );

            return (
              <div className="space-y-6">
                {/* Date Selector Toolbar */}
                <div className="no-print bg-[#FAF9F6] p-3 rounded-xl border border-[#E3E7E4] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-[#164734]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#164734]">
                      Select Operating Date:
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                    {[
                      { label: 'Day 1 (14 Dec 2026)', value: '2026-12-14' },
                      { label: 'Day 2 (15 Dec 2026)', value: '2026-12-15' },
                      { label: 'Day 3 (16 Dec 2026)', value: '2026-12-16' },
                      { label: 'All 3 Days Consolidated', value: 'all' },
                    ].map((df) => (
                      <button
                        key={df.value}
                        onClick={() => setMovementDate(df.value as any)}
                        className={`px-3 py-1.5 rounded-lg font-medium transition-colors whitespace-nowrap ${
                          movementDate === df.value
                            ? 'bg-[#164734] text-white font-semibold shadow-xs'
                            : 'bg-white text-[#69756F] hover:bg-[#E8F1EC] border border-[#E3E7E4]'
                        }`}
                      >
                        {df.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Consolidated Telemetry Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
                  <div className="p-3 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl text-center">
                    <div className="text-[10px] uppercase font-bold text-[#69756F]">Total Registered</div>
                    <div className="text-xl font-black text-[#1A221E] mt-0.5">{totalRegistered}</div>
                    <div className="text-[10px] text-[#69756F]">Confirmed delegates</div>
                  </div>
                  <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl text-center">
                    <div className="text-[10px] uppercase font-bold text-emerald-800">Unique Attendees</div>
                    <div className="text-xl font-black text-emerald-900 mt-0.5">{uniqueAttendeesCount}</div>
                    <div className="text-[10px] text-emerald-700">Verified delegates</div>
                  </div>
                  <div className="p-3 bg-emerald-100/60 border border-emerald-300 rounded-xl text-center">
                    <div className="text-[10px] uppercase font-bold text-[#164734]">Currently Inside</div>
                    <div className="text-xl font-black text-[#164734] mt-0.5">{currentlyInside}</div>
                    <div className="text-[10px] text-[#164734]">Active venue presence</div>
                  </div>
                  <div className="p-3 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl text-center">
                    <div className="text-[10px] uppercase font-bold text-[#69756F]">Currently Outside</div>
                    <div className="text-xl font-black text-[#1A221E] mt-0.5">{currentlyOutside}</div>
                    <div className="text-[10px] text-[#69756F]">Off-premises / pending</div>
                  </div>
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-center">
                    <div className="text-[10px] uppercase font-bold text-blue-800">Total IN Moves</div>
                    <div className="text-xl font-black text-blue-900 mt-0.5">{totalInMoves}</div>
                    <div className="text-[10px] text-blue-700">Gate check-ins</div>
                  </div>
                  <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-center">
                    <div className="text-[10px] uppercase font-bold text-amber-800">Total OUT Moves</div>
                    <div className="text-xl font-black text-amber-900 mt-0.5">{totalOutMoves}</div>
                    <div className="text-[10px] text-amber-700">Gate check-outs</div>
                  </div>
                </div>

                {/* Audit & Exception Banners: Inconsistent Records & No-Shows */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="p-3.5 bg-amber-50/90 border border-amber-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-amber-900">
                      <span className="flex items-center gap-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span>Inconsistent / Audit Corrected Records</span>
                      </span>
                      <span className="bg-amber-200 px-2 py-0.5 rounded-full text-[10px] font-mono">
                        {inconsistentRecords.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-amber-800 leading-snug">
                      {inconsistentRecords.length === 0
                        ? 'All movement records are consistent and verified.'
                        : `${inconsistentRecords.length} movement records require inspection or were manually corrected with audit logging.`}
                    </p>
                  </div>

                  <div className="p-3.5 bg-gray-50 border border-gray-200 rounded-xl text-xs space-y-1">
                    <div className="flex items-center justify-between font-bold text-gray-800">
                      <span className="flex items-center gap-1.5">
                        <Clock className="h-4 w-4 text-gray-500" />
                        <span>Registered Invitees Never Checked In</span>
                      </span>
                      <span className="bg-gray-200 px-2 py-0.5 rounded-full text-[10px] font-mono">
                        {neverCheckedIn.length}
                      </span>
                    </div>
                    <p className="text-[11px] text-gray-600 leading-snug">
                      {neverCheckedIn.length === 0
                        ? 'All registered invitees have attended the session.'
                        : `${neverCheckedIn.length} registered invitees have not scanned in on this operating date.`}
                    </p>
                  </div>
                </div>

                {/* Detailed Movements Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-[#E3E7E4] bg-[#FAF9F6] text-[#69756F] font-semibold uppercase text-[10px]">
                        <th className="py-2.5 px-3">Code</th>
                        <th className="py-2.5 px-3">Delegate Name</th>
                        <th className="py-2.5 px-3">Category</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">Entry Time (IST)</th>
                        <th className="py-2.5 px-3">Exit Time (IST)</th>
                        <th className="py-2.5 px-3">Duration</th>
                        <th className="py-2.5 px-3">Recorded By</th>
                        <th className="py-2.5 px-3">Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F4F6F4]">
                      {targetRecords.map((r) => {
                        const isInside = r.status === 'IN' && !r.exit_time;
                        return (
                          <tr key={r.id} className="hover:bg-[#FAF9F6]/50">
                            <td className="py-2.5 px-3 font-mono font-bold text-[#164734]">
                              {r.invitee?.invitee_code || '—'}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-[#1A221E]">
                              {r.invitee?.full_name || 'Invitee'}
                              <div className="text-[10px] text-[#69756F] font-normal">
                                {r.invitee?.city}, {r.invitee?.state}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">{r.invitee?.category || '—'}</td>
                            <td className="py-2.5 px-3 font-mono text-[#69756F] whitespace-nowrap">
                              {r.event_date}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                  isInside
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                              >
                                {isInside ? 'INSIDE VENUE' : 'EXIT LOGGED'}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[#164734] font-semibold whitespace-nowrap">
                              {formatDateTime(r.entry_time)}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[#69756F] whitespace-nowrap">
                              {r.exit_time ? formatDateTime(r.exit_time) : 'Active Inside'}
                            </td>
                            <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                              {r.duration_minutes ? `${r.duration_minutes}m` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-[#69756F] whitespace-nowrap">
                              {r.entry_recorded_by_name || 'Reception Gate'}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              {r.is_corrected ? (
                                <span className="bg-amber-100 text-amber-900 border border-amber-300 px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 w-fit">
                                  <ShieldCheck className="h-3 w-3" />
                                  <span>Corrected</span>
                                </span>
                              ) : (
                                <span className="text-gray-400 font-mono text-[10px]">Verified</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                      {targetRecords.length === 0 && (
                        <tr>
                          <td colSpan={10} className="py-6 text-center text-[#69756F]">
                            No movement records recorded for this operating date.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })()}

          {/* PHASE 5: Individual Invitee Movement Audit Report */}
          {selectedReport === 'movement_individual' && (() => {
            const filtered = invitees.filter((inv) => {
              const q = movementSearch.toLowerCase().trim();
              if (!q) return true;
              return (
                inv.full_name.toLowerCase().includes(q) ||
                inv.invitee_code.toLowerCase().includes(q) ||
                inv.phone.includes(q) ||
                inv.city.toLowerCase().includes(q)
              );
            });

            return (
              <div className="space-y-6">
                {/* Search Bar for Individual Delegate Filter */}
                <div className="no-print bg-[#FAF9F6] p-3 rounded-xl border border-[#E3E7E4] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 max-w-md">
                    <input
                      type="text"
                      value={movementSearch}
                      onChange={(e) => setMovementSearch(e.target.value)}
                      placeholder="Search delegate by name, category code, phone, or city..."
                      className="w-full px-3 py-1.5 text-xs rounded-lg border border-[#E3E7E4] focus:outline-none focus:ring-1 focus:ring-[#164734] bg-white"
                    />
                  </div>
                  <div className="text-xs text-[#69756F]">
                    Showing <span className="font-bold text-[#164734]">{filtered.length}</span> of {invitees.length} delegates
                  </div>
                </div>

                {/* Individual Invitee Movement Cards */}
                <div className="space-y-4">
                  {filtered.map((inv) => {
                    const invMovements = attendance.filter((a) => a.invitee_id === inv.id);
                    return (
                      <div
                        key={inv.id}
                        className="bg-white p-4 rounded-xl border border-[#E3E7E4] shadow-2xs space-y-3"
                      >
                        {/* Delegate Header */}
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-[#F4F6F4] gap-2">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-xs font-black bg-[#E8F1EC] text-[#164734] px-2.5 py-1 rounded-md border border-[#C5DEC8]">
                              {inv.invitee_code}
                            </span>
                            <div>
                              <h3 className="text-sm font-bold text-[#1A221E]">{inv.full_name}</h3>
                              <p className="text-[11px] text-[#69756F]">
                                {inv.city}, {inv.state} • Phone: {inv.phone}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs px-2.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-800">
                              {inv.category}
                            </span>
                            <span className="text-[11px] font-mono text-[#69756F]">
                              {invMovements.length} Movements Recorded
                            </span>
                          </div>
                        </div>

                        {/* Movements Sub-table */}
                        {invMovements.length === 0 ? (
                          <div className="py-2 text-xs text-[#69756F] italic">
                            No physical venue gate movements recorded for this delegate (Absence/Pending Arrival).
                          </div>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-[11px]">
                              <thead>
                                <tr className="border-b border-[#E3E7E4] bg-[#FAF9F6] text-[#69756F] font-semibold uppercase text-[9px]">
                                  <th className="py-1.5 px-2.5">Operating Date</th>
                                  <th className="py-1.5 px-2.5">Entry Time (IST)</th>
                                  <th className="py-1.5 px-2.5">Exit Time (IST)</th>
                                  <th className="py-1.5 px-2.5">Duration</th>
                                  <th className="py-1.5 px-2.5">Status</th>
                                  <th className="py-1.5 px-2.5">Scanned By Volunteer</th>
                                  <th className="py-1.5 px-2.5">Audit Trail</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#F4F6F4]">
                                {invMovements.map((m) => (
                                  <tr key={m.id} className="hover:bg-[#FAF9F6]/50">
                                    <td className="py-2 px-2.5 font-mono text-[#69756F]">{m.event_date}</td>
                                    <td className="py-2 px-2.5 font-mono text-[#164734] font-semibold">
                                      {formatDateTime(m.entry_time)}
                                    </td>
                                    <td className="py-2 px-2.5 font-mono text-[#69756F]">
                                      {m.exit_time ? formatDateTime(m.exit_time) : 'Active Inside'}
                                    </td>
                                    <td className="py-2 px-2.5 font-mono">
                                      {m.duration_minutes ? `${m.duration_minutes}m` : '—'}
                                    </td>
                                    <td className="py-2 px-2.5">
                                      <span
                                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                          m.status === 'IN' && !m.exit_time
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : 'bg-gray-100 text-gray-700'
                                        }`}
                                      >
                                        {m.status === 'IN' && !m.exit_time ? 'INSIDE' : 'EXIT LOGGED'}
                                      </span>
                                    </td>
                                    <td className="py-2 px-2.5 text-[#69756F]">
                                      {m.entry_recorded_by_name || 'Reception Gate'}
                                    </td>
                                    <td className="py-2 px-2.5">
                                      {m.is_corrected ? (
                                        <div className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded">
                                          <span className="font-bold">Corrected: </span>
                                          <span>{m.correction_reason}</span>
                                        </div>
                                      ) : (
                                        <span className="text-gray-400 font-mono text-[10px]">Verified</span>
                                      )}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {filtered.length === 0 && (
                    <div className="py-8 text-center text-xs text-[#69756F]">
                      No delegates match your search keyword.
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {/* 3. Arrivals Schedule */}
          {selectedReport === 'transport_arrivals' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E3E7E4] bg-[#FAF9F6] text-[#69756F] font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Delegate</th>
                    <th className="py-2.5 px-3">Arrival Date & Time</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Station / Airport</th>
                    <th className="py-2.5 px-3">Flight / Train No.</th>
                    <th className="py-2.5 px-3">Pickup Point</th>
                    <th className="py-2.5 px-3">Assigned Driver</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6F4]">
                  {transport
                    .filter((t) => t.journey_type === 'arrival')
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-[#FAF9F6]/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#164734]">
                          {t.invitee?.invitee_code || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#1A221E]">
                          {t.invitee?.full_name || 'Invitee not linked'}
                        </td>
                        <td className="py-2.5 px-3 font-medium">
                          {formatDate(t.journey_date)} ({formatTime(t.journey_time)})
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E8F1EC] text-[#164734]">
                            {t.transport_mode}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{t.location_name}</td>
                        <td className="py-2.5 px-3 font-mono">{t.transport_number || '—'}</td>
                        <td className="py-2.5 px-3 text-[#69756F]">{t.pickup_point || '—'}</td>
                        <td className="py-2.5 px-3">
                          {t.driver_name ? (
                            <span>
                              {t.driver_name}{' '}
                              {t.driver_phone && <span className="font-mono text-[#69756F]">({t.driver_phone})</span>}
                            </span>
                          ) : (
                            <span className="text-[#69756F]">Self / Direct</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  {transport.filter((t) => t.journey_type === 'arrival').length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-[#69756F]">
                        No arrival records recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. Departures Schedule */}
          {selectedReport === 'transport_departures' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E3E7E4] bg-[#FAF9F6] text-[#69756F] font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Delegate</th>
                    <th className="py-2.5 px-3">Departure Date & Time</th>
                    <th className="py-2.5 px-3">Mode</th>
                    <th className="py-2.5 px-3">Station / Airport</th>
                    <th className="py-2.5 px-3">Flight / Train No.</th>
                    <th className="py-2.5 px-3">Assigned Driver</th>
                    <th className="py-2.5 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6F4]">
                  {transport
                    .filter((t) => t.journey_type === 'departure')
                    .map((t) => (
                      <tr key={t.id} className="hover:bg-[#FAF9F6]/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#164734]">
                          {t.invitee?.invitee_code || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#1A221E]">
                          {t.invitee?.full_name || 'Invitee not linked'}
                        </td>
                        <td className="py-2.5 px-3 font-medium">
                          {formatDate(t.journey_date)} ({formatTime(t.journey_time)})
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E8F1EC] text-[#164734]">
                            {t.transport_mode}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">{t.location_name}</td>
                        <td className="py-2.5 px-3 font-mono">{t.transport_number || '—'}</td>
                        <td className="py-2.5 px-3">
                          {t.driver_name ? (
                            <span>
                              {t.driver_name}{' '}
                              {t.driver_phone && <span className="font-mono text-[#69756F]">({t.driver_phone})</span>}
                            </span>
                          ) : (
                            <span className="text-[#69756F]">Self / Direct</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-[#69756F]">{t.remarks || '—'}</td>
                      </tr>
                    ))}
                  {transport.filter((t) => t.journey_type === 'departure').length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-[#69756F]">
                        No departure records recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. Hotel Allocations */}
          {selectedReport === 'accommodation_hotels' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E3E7E4] bg-[#FAF9F6] text-[#69756F] font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Delegate</th>
                    <th className="py-2.5 px-3">Hotel Name</th>
                    <th className="py-2.5 px-3">Room No.</th>
                    <th className="py-2.5 px-3">Room Type</th>
                    <th className="py-2.5 px-3">Occupancy</th>
                    <th className="py-2.5 px-3">Stay Dates</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6F4]">
                  {accommodations
                    .filter((a) => a.accommodation_type === 'Hotel')
                    .map((a) => (
                      <tr key={a.id} className="hover:bg-[#FAF9F6]/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#164734]">
                          {a.invitee?.invitee_code || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#1A221E]">
                          {a.invitee?.full_name || 'Invitee not linked'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#164734]">{a.hotel_name}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#164734]">
                          {a.room_number || 'TBD'}
                        </td>
                        <td className="py-2.5 px-3">{a.room_type}</td>
                        <td className="py-2.5 px-3">{a.occupancy || 'Single'}</td>
                        <td className="py-2.5 px-3 font-medium">
                          {formatDate(a.check_in_date)} to {formatDate(a.check_out_date)}
                        </td>
                      </tr>
                    ))}
                  {accommodations.filter((a) => a.accommodation_type === 'Hotel').length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-[#69756F]">
                        No hotel accommodation records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 6. Hajj House Rooms */}
          {selectedReport === 'accommodation_hajj_house' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E3E7E4] bg-[#FAF9F6] text-[#69756F] font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Delegate</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Wing / Room No.</th>
                    <th className="py-2.5 px-3">Room Type</th>
                    <th className="py-2.5 px-3">Stay Dates</th>
                    <th className="py-2.5 px-3">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6F4]">
                  {accommodations
                    .filter((a) => a.accommodation_type === 'Hajj House')
                    .map((a) => (
                      <tr key={a.id} className="hover:bg-[#FAF9F6]/50">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#164734]">
                          {a.invitee?.invitee_code || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-[#1A221E]">
                          {a.invitee?.full_name || 'Invitee not linked'}
                        </td>
                        <td className="py-2.5 px-3">{a.invitee?.category || '—'}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#164734]">
                          {a.room_number || 'Room TBD'}
                        </td>
                        <td className="py-2.5 px-3">{a.room_type}</td>
                        <td className="py-2.5 px-3 font-medium">
                          {formatDate(a.check_in_date)} to {formatDate(a.check_out_date)}
                        </td>
                        <td className="py-2.5 px-3 text-[#69756F]">{a.remarks || '—'}</td>
                      </tr>
                    ))}
                  {accommodations.filter((a) => a.accommodation_type === 'Hajj House').length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-[#69756F]">
                        No Hajj House accommodation records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 7. Catering & Food Requirements */}
          {selectedReport === 'food_daily' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E3E7E4] bg-[#FAF9F6] text-[#69756F] font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Delegate</th>
                    <th className="py-2.5 px-3">Meal Date</th>
                    <th className="py-2.5 px-3">Dietary Preference</th>
                    <th className="py-2.5 px-3 text-center">Breakfast</th>
                    <th className="py-2.5 px-3 text-center">Lunch</th>
                    <th className="py-2.5 px-3 text-center">Dinner</th>
                    <th className="py-2.5 px-3">Special Dietary Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6F4]">
                  {foods.map((f) => (
                    <tr key={f.id} className="hover:bg-[#FAF9F6]/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#164734]">
                        {f.invitee?.invitee_code || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#1A221E]">
                        {f.invitee?.full_name || 'Invitee not linked'}
                      </td>
                      <td className="py-2.5 px-3 font-medium">{formatDate(f.meal_date)}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E8F1EC] text-[#164734]">
                          {f.dietary_preference}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        {f.breakfast ? <span className="text-[#164734]">✓</span> : <span className="text-[#69756F]">✕</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        {f.lunch ? <span className="text-[#164734]">✓</span> : <span className="text-[#69756F]">✕</span>}
                      </td>
                      <td className="py-2.5 px-3 text-center font-bold">
                        {f.dinner ? <span className="text-[#164734]">✓</span> : <span className="text-[#69756F]">✕</span>}
                      </td>
                      <td className="py-2.5 px-3 text-[#69756F]">{f.special_requirements || 'Standard catering'}</td>
                    </tr>
                  ))}
                  {foods.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-6 text-center text-[#69756F]">
                        No catering records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 8. Reception Checklist */}
          {selectedReport === 'reception_summary' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E3E7E4] bg-[#FAF9F6] text-[#69756F] font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Code</th>
                    <th className="py-2.5 px-3">Delegate</th>
                    <th className="py-2.5 px-3">Reception Status</th>
                    <th className="py-2.5 px-3">Expected Arrival</th>
                    <th className="py-2.5 px-3">Actual Check-in</th>
                    <th className="py-2.5 px-3">Reception Desk</th>
                    <th className="py-2.5 px-3">Welcome Kit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6F4]">
                  {reception.map((r) => (
                    <tr key={r.id} className="hover:bg-[#FAF9F6]/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#164734]">
                        {r.invitee?.invitee_code || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#1A221E]">
                        {r.invitee?.full_name || 'Invitee not linked'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            r.reception_status === 'Checked In'
                              ? 'bg-emerald-100 text-emerald-800'
                              : r.reception_status === 'Expected'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {r.reception_status}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-[#69756F]">{formatDateTime(r.expected_arrival)}</td>
                      <td className="py-2.5 px-3 font-medium">{formatDateTime(r.actual_arrival)}</td>
                      <td className="py-2.5 px-3">{r.reception_point || 'Main Secretariat Desk'}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            r.welcome_kit_status === 'Issued'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {r.welcome_kit_status || 'Pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {reception.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-[#69756F]">
                        No reception checklist records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 9. Seating Allocation */}
          {selectedReport === 'seating_chart' && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[#E3E7E4] bg-[#FAF9F6] text-[#69756F] font-semibold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Seat No.</th>
                    <th className="py-2.5 px-3">Meeting Hall</th>
                    <th className="py-2.5 px-3">Section</th>
                    <th className="py-2.5 px-3">Delegate Code</th>
                    <th className="py-2.5 px-3">Delegate Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Attendance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F4F6F4]">
                  {halls.map((h) => (
                    <tr key={h.id} className="hover:bg-[#FAF9F6]/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#164734]">{h.seat_number}</td>
                      <td className="py-2.5 px-3 font-medium">{h.meeting_hall}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[#E8F1EC] text-[#164734]">
                          {h.seating_section}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#69756F]">
                        {h.invitee?.invitee_code || '—'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-[#1A221E]">
                        {h.invitee?.full_name || 'Invitee not linked'}
                      </td>
                      <td className="py-2.5 px-3">{h.invitee?.category || '—'}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            h.attendance_status === 'Present'
                              ? 'bg-emerald-100 text-emerald-800'
                              : h.attendance_status === 'Absent'
                              ? 'bg-red-100 text-red-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {h.attendance_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {halls.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-[#69756F]">
                        No seating assignments recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer Note */}
          <div className="mt-8 pt-4 border-t border-[#E3E7E4] text-[11px] text-[#69756F] flex items-center justify-between">
            <span className="font-medium">All India Muslim Personal Law Board • 30th Annual Session</span>
            <span className="font-semibold text-[#164734] flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Official Secretariat Record
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
