import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ReceptionRecord, Invitee } from '@/types';
import { createReceptionRecord, updateReceptionRecord, getInvitees } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle } from 'lucide-react';

const receptionSchema = z.object({
  invitee_id: z.string().min(1, 'Please select an invitee'),
  expected_arrival: z.string().optional().nullable(),
  actual_arrival: z.string().optional().nullable(),
  reception_status: z.enum(['Expected', 'Arrived', 'Received', 'Checked In', 'Completed']),
  assigned_volunteer: z.string().optional().nullable(),
  reception_point: z.string().optional().nullable(),
  pickup_status: z.string().default('Pending'),
  welcome_kit_status: z.string().default('Pending'),
  registration_status: z.string().default('Pending'),
  remarks: z.string().optional().nullable(),
});

type FormData = z.infer<typeof receptionSchema>;

interface ReceptionFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  recordToEdit?: ReceptionRecord | null;
  defaultInviteeId?: string;
}

export const ReceptionFormModal: React.FC<ReceptionFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  recordToEdit,
  defaultInviteeId,
}) => {
  const { currentUser } = useAuth();
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(receptionSchema),
    defaultValues: {
      invitee_id: defaultInviteeId || '',
      expected_arrival: '',
      actual_arrival: '',
      reception_status: 'Expected',
      assigned_volunteer: '',
      reception_point: 'Main Registration Desk, Hajj House',
      pickup_status: 'Pending',
      welcome_kit_status: 'Pending',
      registration_status: 'Pending',
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
        expected_arrival: recordToEdit.expected_arrival
          ? recordToEdit.expected_arrival.slice(0, 16)
          : '',
        actual_arrival: recordToEdit.actual_arrival ? recordToEdit.actual_arrival.slice(0, 16) : '',
        reception_status: recordToEdit.reception_status,
        assigned_volunteer: recordToEdit.assigned_volunteer || '',
        reception_point: recordToEdit.reception_point || '',
        pickup_status: recordToEdit.pickup_status || 'Pending',
        welcome_kit_status: recordToEdit.welcome_kit_status || 'Pending',
        registration_status: recordToEdit.registration_status || 'Pending',
        remarks: recordToEdit.remarks || '',
      });
    } else {
      reset({
        invitee_id: defaultInviteeId || '',
        expected_arrival: '',
        actual_arrival: '',
        reception_status: 'Expected',
        assigned_volunteer: currentUser?.full_name || '',
        reception_point: 'Main Registration Desk, Hajj House',
        pickup_status: 'Pending',
        welcome_kit_status: 'Pending',
        registration_status: 'Pending',
        remarks: '',
      });
    }
    setError(null);
  }, [recordToEdit, defaultInviteeId, isOpen, reset, currentUser]);

  const handleQuickCheckIn = () => {
    const now = new Date().toISOString().slice(0, 16);
    setValue('reception_status', 'Checked In');
    setValue('actual_arrival', now);
    setValue('welcome_kit_status', 'Distributed');
    setValue('registration_status', 'Completed');
  };

  const onSubmit = async (data: FormData) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (recordToEdit) {
        await updateReceptionRecord(recordToEdit.id, data, currentUser);
      } else {
        await createReceptionRecord(data, currentUser);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update reception status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={recordToEdit ? 'Update Reception & Check-in' : 'Record Invitee Reception'}
      description="Track arrival, registration desk check-in, and welcome kit distribution."
      maxWidth="xl"
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* One-touch quick check-in helper for volunteers */}
      <div className="mb-4 p-3 bg-[#E8F0EA] border border-[#c3d9c8] rounded flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-[#164734]">Delegate Arrived at Reception Desk?</p>
          <p className="text-[11px] text-[#202722]">Auto-mark Checked In, actual arrival timestamp & kit handover.</p>
        </div>
        <Button type="button" size="sm" variant="primary" onClick={handleQuickCheckIn}>
          One-Click Check-in
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Invitee selector */}
        <div>
          <label className="block text-xs font-semibold text-[#202722] mb-1">
            Delegate / Invitee <span className="text-red-500">*</span>
          </label>
          <select
            {...register('invitee_id')}
            disabled={Boolean(defaultInviteeId)}
            className="h-9 w-full rounded border border-[#E5E7E4] bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#164734]"
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#202722] mb-1">
              Reception Status <span className="text-red-500">*</span>
            </label>
            <select
              {...register('reception_status')}
              className="h-9 w-full rounded border border-[#E5E7E4] bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#164734]"
            >
              <option value="Expected">Expected</option>
              <option value="Arrived">Arrived at Venue</option>
              <option value="Received">Received by Escort</option>
              <option value="Checked In">Checked In</option>
              <option value="Completed">Completed</option>
            </select>
          </div>

          <Input
            id="assigned_volunteer"
            label="Assigned Reception Volunteer"
            placeholder="e.g. Br. Fazalur Rahman"
            {...register('assigned_volunteer')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="expected_arrival"
            label="Expected Arrival Date & Time"
            type="datetime-local"
            {...register('expected_arrival')}
          />

          <Input
            id="actual_arrival"
            label="Actual Arrival Date & Time"
            type="datetime-local"
            {...register('actual_arrival')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            id="reception_point"
            label="Reception Desk / Counter"
            placeholder="e.g. Main Lobby Counter 2"
            {...register('reception_point')}
          />

          <div>
            <label className="block text-xs font-semibold text-[#202722] mb-1">
              Welcome Kit Status
            </label>
            <select
              {...register('welcome_kit_status')}
              className="h-9 w-full rounded border border-[#E5E7E4] bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#164734]"
            >
              <option value="Pending">Pending Handover</option>
              <option value="Distributed">Distributed (Badge + Bag)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#202722] mb-1">
              Registration Desk Status
            </label>
            <select
              {...register('registration_status')}
              className="h-9 w-full rounded border border-[#E5E7E4] bg-white px-3 text-sm focus:outline-none focus:ring-1 focus:ring-[#164734]"
            >
              <option value="Pending">Pending Verification</option>
              <option value="Completed">Registration Verified</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#202722] mb-1">
            Reception Desk Notes
          </label>
          <textarea
            rows={2}
            placeholder="Identity verification notes, special requests at arrival, kit notes..."
            className="w-full rounded border border-[#E5E7E4] bg-white p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-[#164734]"
            {...register('remarks')}
          />
        </div>

        <div className="pt-3 border-t border-[#F0F2EF] flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-2.5">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto h-10 sm:h-9">
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-[#164734] hover:bg-[#113829] text-white w-full sm:w-auto h-10 sm:h-9 font-semibold">
            {recordToEdit ? 'Save Changes' : 'Record Reception'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
