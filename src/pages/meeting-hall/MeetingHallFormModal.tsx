import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MeetingHallRecord, Invitee } from '@/types';
import {
  createMeetingHallRecord,
  updateMeetingHallRecord,
  getInvitees,
  checkSeatConflict,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AlertCircle, AlertTriangle } from 'lucide-react';

const hallSchema = z.object({
  invitee_id: z.string().min(1, 'Please select an invitee'),
  meeting_hall: z.string().min(1, 'Meeting hall is required'),
  seating_section: z.string().min(1, 'Seating section is required'),
  seat_number: z.string().min(1, 'Seat number is required'),
  attendance_status: z.enum(['Expected', 'Present', 'Absent']),
  assignment_status: z.enum(['Assigned', 'Reserved', 'VIP']),
  remarks: z.string().optional().nullable(),
});

type FormData = z.infer<typeof hallSchema>;

interface MeetingHallFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  recordToEdit?: MeetingHallRecord | null;
  defaultInviteeId?: string;
}

export const MeetingHallFormModal: React.FC<MeetingHallFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  recordToEdit,
  defaultInviteeId,
}) => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seatConflict, setSeatConflict] = useState<{
    message: string;
    conflictingWith?: MeetingHallRecord;
  } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(hallSchema),
    defaultValues: {
      invitee_id: defaultInviteeId || '',
      meeting_hall: 'Main Auditorium',
      seating_section: 'General Members - Block A',
      seat_number: '',
      attendance_status: 'Expected',
      assignment_status: 'Assigned',
      remarks: '',
    },
  });

  useEffect(() => {
    async function fetchInv() {
      const data = await getInvitees();
      setInvitees(data);
    }
    if (isOpen) fetchInv();
  }, [isOpen]);

  useEffect(() => {
    if (recordToEdit) {
      reset({
        invitee_id: recordToEdit.invitee_id,
        meeting_hall: recordToEdit.meeting_hall,
        seating_section: recordToEdit.seating_section,
        seat_number: recordToEdit.seat_number,
        attendance_status: recordToEdit.attendance_status,
        assignment_status: recordToEdit.assignment_status,
        remarks: recordToEdit.remarks || '',
      });
    } else {
      reset({
        invitee_id: defaultInviteeId || '',
        meeting_hall: 'Main Auditorium',
        seating_section: 'General Members - Block A',
        seat_number: '',
        attendance_status: 'Expected',
        assignment_status: 'Assigned',
        remarks: '',
      });
    }
    setError(null);
    setSeatConflict(null);
  }, [recordToEdit, defaultInviteeId, isOpen, reset]);

  const onSubmit = async (data: FormData) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate seat conflict
      const conflict = await checkSeatConflict(
        data.meeting_hall,
        data.seating_section,
        data.seat_number,
        recordToEdit?.id
      );

      if (conflict.hasConflict) {
        setSeatConflict({
          message: `Seat conflict: Seat ${data.seat_number} in ${data.seating_section} (${data.meeting_hall}) is already allocated to ${conflict.conflictingWith?.invitee?.full_name}.`,
          conflictingWith: conflict.conflictingWith,
        });
        setIsSubmitting(false);
        return;
      }

      if (recordToEdit) {
        await updateMeetingHallRecord(recordToEdit.id, data, currentUser);
      } else {
        await createMeetingHallRecord(data, currentUser);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save seating assignment.');
      toast.error('Seating error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={recordToEdit ? 'Edit Hall & Seating Assignment' : 'Assign Meeting Hall & Seat'}
      description="Designate hall, block, and exact seat number with duplicate assignment protection."
      maxWidth="xl"
    >
      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {seatConflict && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-2">
          <div className="flex items-start gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Duplicate Seat Assignment Detected!</span>
          </div>
          <p>{seatConflict.message}</p>
          <p className="text-[11px] text-amber-800 italic">
            Each seat can only be occupied by one delegate. Please assign a different seat number.
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Invitee selector */}
        <div>
          <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
            Delegate / Invitee <span className="text-red-500">*</span>
          </label>
          <select
            {...register('invitee_id')}
            disabled={Boolean(defaultInviteeId)}
            className="h-10 w-full rounded-lg border border-[#E3E7E4] bg-white px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
          >
            <option value="">Select an invitee...</option>
            {invitees.map((inv) => (
              <option key={inv.id} value={inv.id}>
                {inv.invitee_code} — {inv.full_name} ({inv.category})
              </option>
            ))}
          </select>
          {errors.invitee_id && (
            <p className="mt-1 text-xs text-red-600">{errors.invitee_id.message}</p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
              Meeting Hall <span className="text-red-500">*</span>
            </label>
            <select
              {...register('meeting_hall')}
              className="h-10 w-full rounded-lg border border-[#E3E7E4] bg-white px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            >
              <option value="Main Auditorium">Main Auditorium (General Sessions)</option>
              <option value="Conference Hall A">Conference Hall A</option>
              <option value="Conference Hall B">Conference Hall B</option>
              <option value="Executive Committee Room">Executive Committee Room</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
              Seating Section <span className="text-red-500">*</span>
            </label>
            <select
              {...register('seating_section')}
              className="h-10 w-full rounded-lg border border-[#E3E7E4] bg-white px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            >
              <option value="Presidium / VIP Row">Presidium / VIP Row (Stage)</option>
              <option value="Founder Members Section">Founder Members Section</option>
              <option value="General Members - Block A">General Members - Block A</option>
              <option value="General Members - Block B">General Members - Block B</option>
              <option value="Special Invitees Wing">Special Invitees Wing</option>
              <option value="Press & Media Gallery">Press & Media Gallery</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            id="seat_number"
            label="Exact Seat Number"
            placeholder="e.g. A-14, P-02, or FM-05"
            required
            error={errors.seat_number?.message}
            {...register('seat_number')}
          />

          <div>
            <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
              Assignment Category
            </label>
            <select
              {...register('assignment_status')}
              className="h-10 w-full rounded-lg border border-[#E3E7E4] bg-white px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            >
              <option value="Assigned">Assigned</option>
              <option value="Reserved">Reserved</option>
              <option value="VIP">VIP Protocol</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
              Hall Attendance Status
            </label>
            <select
              {...register('attendance_status')}
              className="h-10 w-full rounded-lg border border-[#E3E7E4] bg-white px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            >
              <option value="Expected">Expected</option>
              <option value="Present">Present (In Session)</option>
              <option value="Absent">Absent / On Leave</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
            Seating Remarks
          </label>
          <textarea
            rows={2}
            placeholder="Stage mic access, translation device required, proximity to dais..."
            className="w-full rounded-lg border border-[#E3E7E4] bg-white p-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            {...register('remarks')}
          />
        </div>

        <div className="pt-4 border-t border-[#F4F6F4] flex justify-end gap-2.5">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-[#164734] hover:bg-[#113829] text-white">
            {recordToEdit ? 'Save Changes' : 'Confirm Seating Assignment'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
