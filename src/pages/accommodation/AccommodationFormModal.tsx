import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AccommodationRecord, Invitee } from '@/types';
import {
  createAccommodation,
  updateAccommodation,
  getInvitees,
  checkRoomConflict,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AlertCircle, AlertTriangle, Moon } from 'lucide-react';

const accommodationSchema = z.object({
  invitee_id: z.string().min(1, 'Please select an invitee'),
  accommodation_type: z.enum(['Hotel', 'Hajj House', 'Other', 'No accommodation required']),
  hotel_name: z.string().optional().nullable(),
  room_type: z.string().optional().nullable(),
  room_number: z.string().optional().nullable(),
  check_in_date: z.string().optional().nullable(),
  check_in_time: z.string().optional().nullable(),
  check_out_date: z.string().optional().nullable(),
  check_out_time: z.string().optional().nullable(),
  occupancy: z.string().default('Single'),
  remarks: z.string().optional().nullable(),
});

type FormData = z.infer<typeof accommodationSchema>;

interface AccommodationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  recordToEdit?: AccommodationRecord | null;
  defaultInviteeId?: string;
}

export const AccommodationFormModal: React.FC<AccommodationFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  recordToEdit,
  defaultInviteeId,
}) => {
  const { currentUser, isAdmin } = useAuth();
  const toast = useToast();
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<{
    message: string;
    conflictingWith?: AccommodationRecord;
  } | null>(null);
  const [allowShared, setAllowShared] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(accommodationSchema),
    defaultValues: {
      invitee_id: defaultInviteeId || '',
      accommodation_type: 'Hotel',
      hotel_name: 'Ramada',
      room_type: 'Standard Double',
      room_number: '',
      check_in_date: '2026-12-13',
      check_in_time: '14:00',
      check_out_date: '2026-12-16',
      check_out_time: '12:00',
      occupancy: 'Single',
      remarks: '',
    },
  });

  const selectedType = watch('accommodation_type');
  const checkInDate = watch('check_in_date');
  const checkOutDate = watch('check_out_date');

  // Calculate nights
  const numberOfNights = React.useMemo(() => {
    if (!checkInDate || !checkOutDate) return 0;
    const diff = new Date(checkOutDate).getTime() - new Date(checkInDate).getTime();
    const days = Math.round(diff / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }, [checkInDate, checkOutDate]);

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
        accommodation_type: recordToEdit.accommodation_type,
        hotel_name: recordToEdit.hotel_name || '',
        room_type: recordToEdit.room_type || '',
        room_number: recordToEdit.room_number || '',
        check_in_date: recordToEdit.check_in_date || '',
        check_in_time: recordToEdit.check_in_time || '',
        check_out_date: recordToEdit.check_out_date || '',
        check_out_time: recordToEdit.check_out_time || '',
        occupancy: recordToEdit.occupancy || 'Single',
        remarks: recordToEdit.remarks || '',
      });
    } else {
      reset({
        invitee_id: defaultInviteeId || '',
        accommodation_type: 'Hotel',
        hotel_name: 'Ramada',
        room_type: 'Standard Double',
        room_number: '',
        check_in_date: '2026-12-13',
        check_in_time: '14:00',
        check_out_date: '2026-12-16',
        check_out_time: '12:00',
        occupancy: 'Single',
        remarks: '',
      });
    }
    setError(null);
    setConflictWarning(null);
    setAllowShared(false);
  }, [recordToEdit, defaultInviteeId, isOpen, reset]);

  const onSubmit = async (data: FormData) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate room collision if room number is specified
      if (
        !allowShared &&
        data.hotel_name &&
        data.room_number &&
        data.check_in_date &&
        data.check_out_date
      ) {
        const conflict = await checkRoomConflict(
          data.hotel_name,
          data.room_number,
          data.check_in_date,
          data.check_out_date,
          recordToEdit?.id
        );

        if (conflict.hasConflict) {
          setConflictWarning({
            message: `Room conflict: Room ${data.room_number} at ${data.hotel_name} is already booked for ${conflict.conflictingWith?.invitee?.full_name} during overlapping dates (${conflict.conflictingWith?.check_in_date} to ${conflict.conflictingWith?.check_out_date}).`,
            conflictingWith: conflict.conflictingWith,
          });
          setIsSubmitting(false);
          return;
        }
      }

      if (recordToEdit) {
        await updateAccommodation(recordToEdit.id, data, currentUser, allowShared);
      } else {
        await createAccommodation(data, currentUser, allowShared);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save accommodation record.');
      toast.error('Allotment error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={recordToEdit ? 'Edit Accommodation Details' : 'Allocate Accommodation'}
      description="Assign hotel or Hajj House rooms with automatic date collision detection."
      maxWidth="xl"
    >
      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {conflictWarning && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-2.5">
          <div className="flex items-start gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Room Allocation Conflict Detected!</span>
          </div>
          <p>{conflictWarning.message}</p>
          {isAdmin ? (
            <div className="pt-2 flex items-center gap-2 border-t border-amber-200">
              <input
                type="checkbox"
                id="allowShared"
                checked={allowShared}
                onChange={(e) => setAllowShared(e.target.checked)}
                className="h-4 w-4 rounded border-amber-400 text-[#164734]"
              />
              <label htmlFor="allowShared" className="font-semibold text-amber-950 cursor-pointer">
                Admin Override: Permit shared / dual room occupancy
              </label>
            </div>
          ) : (
            <p className="text-[11px] text-amber-800 italic">
              Please choose a different room number or have an Admin authorize shared room allotment.
            </p>
          )}
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
              Accommodation Facility <span className="text-red-500">*</span>
            </label>
            <select
              {...register('accommodation_type')}
              className="h-10 w-full rounded-lg border border-[#E3E7E4] bg-white px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            >
              <option value="Hotel">Designated Partner Hotel</option>
              <option value="Hajj House">Hajj House Chennai Campus</option>
              <option value="Other">Other Private Arrangement</option>
              <option value="No accommodation required">No Room Required (Local Resident)</option>
            </select>
          </div>

          {selectedType === 'Hotel' ? (
            <div>
              <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
                Hotel Name <span className="text-red-500">*</span>
              </label>
              <select
                {...register('hotel_name')}
                className="h-10 w-full rounded-lg border border-[#E3E7E4] bg-white px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
              >
                <option value="Ramada">Ramada Chennai</option>
                <option value="Orion">Hotel Orion</option>
                <option value="Rivera">Hotel Rivera</option>
                <option value="Mathi">Mathi Residency</option>
                <option value="Other Hotel">Other Designated Hotel</option>
              </select>
            </div>
          ) : selectedType === 'Hajj House' ? (
            <div>
              <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
                Hajj House Room Category <span className="text-red-500">*</span>
              </label>
              <select
                {...register('room_type')}
                className="h-10 w-full rounded-lg border border-[#E3E7E4] bg-white px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
              >
                <option value="AC Room">AC Room</option>
                <option value="Non-AC Room">Non-AC Room</option>
              </select>
            </div>
          ) : (
            <Input
              id="hotel_name"
              label="Place of Stay"
              placeholder="e.g. Resident / Private Stay"
              {...register('hotel_name')}
            />
          )}
        </div>

        {selectedType !== 'No accommodation required' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="room_number"
                label="Room Number / Block"
                placeholder="e.g. Suite 401 or Block A-102"
                error={errors.room_number?.message}
                {...register('room_number')}
              />

              {selectedType === 'Hotel' && (
                <div>
                  <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
                    Room Type
                  </label>
                  <select
                    {...register('room_type')}
                    className="h-10 w-full rounded-lg border border-[#E3E7E4] bg-white px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
                  >
                    <option value="Standard Single">Standard Single</option>
                    <option value="Standard Double">Standard Double</option>
                    <option value="Deluxe Suite">Deluxe Suite</option>
                    <option value="Executive Suite">Executive Suite</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="check_in_date"
                label="Check-in Date"
                type="date"
                {...register('check_in_date')}
              />
              <Input
                id="check_in_time"
                label="Check-in Time"
                type="time"
                {...register('check_in_time')}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="check_out_date"
                label="Check-out Date"
                type="date"
                {...register('check_out_date')}
              />
              <Input
                id="check_out_time"
                label="Check-out Time"
                type="time"
                {...register('check_out_time')}
              />
            </div>

            <div className="p-3.5 bg-[#FAF9F6] border border-[#E3E7E4] rounded-xl flex items-center justify-between text-xs">
              <span className="font-semibold text-[#69756F] flex items-center gap-1.5">
                <Moon className="h-4 w-4 text-[#164734]" />
                Calculated Stay Duration:
              </span>
              <span className="font-bold text-[#164734] text-sm">
                {numberOfNights} {numberOfNights === 1 ? 'Night' : 'Nights'}
              </span>
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
            Special Accommodation Remarks
          </label>
          <textarea
            rows={2}
            placeholder="Ground floor preference, proximity to lift, special medical bed, etc."
            className="w-full rounded-lg border border-[#E3E7E4] bg-white p-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            {...register('remarks')}
          />
        </div>

        <div className="pt-4 border-t border-[#F4F6F4] flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-2.5">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto h-10 sm:h-9">
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-[#164734] hover:bg-[#113829] text-white w-full sm:w-auto h-10 sm:h-9 font-semibold">
            {recordToEdit ? 'Save Changes' : 'Confirm Accommodation'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
