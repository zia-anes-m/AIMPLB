import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { TransportationRecord, TransportMode, Invitee } from '@/types';
import { createTransportation, updateTransportation, getInvitees } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AlertCircle } from 'lucide-react';

const transportSchema = z.object({
  invitee_id: z.string().min(1, 'Please select an invitee'),
  journey_type: z.enum(['arrival', 'departure']),
  journey_date: z.string().min(1, 'Date is required'),
  journey_time: z.string().optional().nullable(),
  transport_mode: z.enum(['Flight', 'Train', 'Bus', 'Car', 'Other']),
  location_name: z.string().min(1, 'Station, airport or location is required'),
  transport_number: z.string().optional().nullable(),
  booking_reference: z.string().optional().nullable(),
  pickup_required: z.boolean().default(false),
  pickup_point: z.string().optional().nullable(),
  driver_name: z.string().optional().nullable(),
  driver_phone: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

type FormData = z.infer<typeof transportSchema>;

interface TransportationFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  recordToEdit?: TransportationRecord | null;
  defaultInviteeId?: string;
}

export const TransportationFormModal: React.FC<TransportationFormModalProps> = ({
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

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(transportSchema),
    defaultValues: {
      invitee_id: defaultInviteeId || '',
      journey_type: 'arrival',
      journey_date: '2026-12-14',
      journey_time: '10:00',
      transport_mode: 'Flight',
      location_name: 'Chennai International Airport, Meenambakkam',
      transport_number: '',
      booking_reference: '',
      pickup_required: true,
      pickup_point: '',
      driver_name: '',
      driver_phone: '',
      remarks: '',
    },
  });

  const selectedMode = watch('transport_mode');

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
        journey_type: recordToEdit.journey_type,
        journey_date: recordToEdit.journey_date,
        journey_time: recordToEdit.journey_time || '',
        transport_mode: recordToEdit.transport_mode,
        location_name: recordToEdit.location_name,
        transport_number: recordToEdit.transport_number || '',
        booking_reference: recordToEdit.booking_reference || '',
        pickup_required: recordToEdit.pickup_required,
        pickup_point: recordToEdit.pickup_point || '',
        driver_name: recordToEdit.driver_name || '',
        driver_phone: recordToEdit.driver_phone || '',
        remarks: recordToEdit.remarks || '',
      });
    } else {
      reset({
        invitee_id: defaultInviteeId || '',
        journey_type: 'arrival',
        journey_date: '2026-12-14',
        journey_time: '10:00',
        transport_mode: 'Flight',
        location_name: 'Chennai International Airport, Meenambakkam',
        transport_number: '',
        booking_reference: '',
        pickup_required: true,
        pickup_point: '',
        driver_name: '',
        driver_phone: '',
        remarks: '',
      });
    }
    setError(null);
  }, [recordToEdit, defaultInviteeId, isOpen, reset]);

  // Adjust conditional location defaults when mode changes
  const handleModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const mode = e.target.value as TransportMode;
    setValue('transport_mode', mode);
    if (mode === 'Flight') {
      setValue('location_name', 'Chennai International Airport, Meenambakkam');
    } else if (mode === 'Train') {
      setValue(
        'location_name',
        'Chennai Central (Puratchi Thalaivar Dr. M.G. Ramachandran Central)'
      );
    } else if (mode === 'Bus') {
      setValue(
        'location_name',
        'Kilambakkam Bus Terminus (Kalaignar Centenary Bus Terminus)'
      );
    } else {
      setValue('location_name', 'Hajj House Chennai / City Pickup');
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (recordToEdit) {
        await updateTransportation(
          recordToEdit.id,
          {
            ...data,
            location_type: data.transport_mode,
          },
          currentUser
        );
      } else {
        await createTransportation(
          {
            ...data,
            location_type: data.transport_mode,
          },
          currentUser
        );
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save transportation record.');
      toast.error('Submission failed', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={recordToEdit ? 'Edit Transportation Schedule' : 'Add Transportation Arrangement'}
      description="Record arrival or departure details, flight/train numbers, and driver pickup information."
      maxWidth="xl"
    >
      {error && (
        <div className="mb-4 p-3.5 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
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
              Journey Type <span className="text-red-500">*</span>
            </label>
            <select
              {...register('journey_type')}
              className="h-10 w-full rounded-lg border border-[#E3E7E4] bg-white px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            >
              <option value="arrival">Arrival to Chennai</option>
              <option value="departure">Departure from Chennai</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
              Mode of Transport <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedMode}
              onChange={handleModeChange}
              className="h-10 w-full rounded-lg border border-[#E3E7E4] bg-white px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            >
              <option value="Flight">Flight</option>
              <option value="Train">Train</option>
              <option value="Bus">Bus</option>
              <option value="Car">Car</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="journey_date"
            label="Date of Travel"
            type="date"
            required
            error={errors.journey_date?.message}
            {...register('journey_date')}
          />

          <Input
            id="journey_time"
            label="Scheduled Time (HH:MM)"
            type="time"
            error={errors.journey_time?.message}
            {...register('journey_time')}
          />
        </div>

        <div>
          <Input
            id="location_name"
            label="Arrival / Departure Hub"
            placeholder="e.g. Chennai Central Railway Station"
            required
            error={errors.location_name?.message}
            {...register('location_name')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="transport_number"
            label="Flight / Train / Vehicle No."
            placeholder="e.g. 6E-2045 or Shatabdi Exp 12007"
            error={errors.transport_number?.message}
            {...register('transport_number')}
          />

          <Input
            id="booking_reference"
            label="PNR / Ticket Reference (Optional)"
            placeholder="e.g. PNR: 4528190342"
            error={errors.booking_reference?.message}
            {...register('booking_reference')}
          />
        </div>

        {/* Pickup and Escort Details */}
        <div className="p-4 bg-[#FAF9F6] rounded-xl border border-[#E3E7E4] space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="pickup_required"
              className="h-4 w-4 rounded border-[#E3E7E4] text-[#164734] focus:ring-[#164734]"
              {...register('pickup_required')}
            />
            <label htmlFor="pickup_required" className="text-xs font-semibold text-[#1A221E] cursor-pointer">
              Assign Volunteer Driver / Airport Pickup Escort
            </label>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <Input
              id="pickup_point"
              label="Meeting / Pickup Point"
              placeholder="e.g. Arrival Gate 3, Pillar 4"
              error={errors.pickup_point?.message}
              {...register('pickup_point')}
            />

            <Input
              id="driver_name"
              label="Driver / Escort Name"
              placeholder="Volunteer driver"
              error={errors.driver_name?.message}
              {...register('driver_name')}
            />

            <Input
              id="driver_phone"
              label="Driver Contact Phone"
              placeholder="+91 98400 00000"
              error={errors.driver_phone?.message}
              {...register('driver_phone')}
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
            Internal Remarks / Protocol Instructions
          </label>
          <textarea
            rows={2}
            placeholder="Luggage assistance, accompanying delegation, early check-in requested..."
            className="w-full rounded-lg border border-[#E3E7E4] bg-white p-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            {...register('remarks')}
          />
        </div>

        <div className="pt-4 border-t border-[#F4F6F4] flex justify-end gap-2.5">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-[#164734] hover:bg-[#113829] text-white">
            {recordToEdit ? 'Save Changes' : 'Record Transportation'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
