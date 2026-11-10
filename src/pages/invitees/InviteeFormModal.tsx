import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Invitee, InviteeCategory } from '@/types';
import { createInvitee, updateInvitee, checkDuplicateInvitee } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AlertCircle, AlertTriangle } from 'lucide-react';

const inviteeSchema = z.object({
  full_name: z.string().min(2, 'Full name must be at least 2 characters'),
  category: z.enum(['Founder Members', 'General Members', 'Special Invitees']),
  phone: z.string().min(8, 'Valid phone number is required'),
  alternate_phone: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  country: z.string().default('India'),
  remarks: z.string().optional().nullable(),
});

type FormData = z.infer<typeof inviteeSchema>;

interface InviteeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (invitee: Invitee) => void;
  inviteeToEdit?: Invitee | null;
}

export const InviteeFormModal: React.FC<InviteeFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  inviteeToEdit,
}) => {
  const { currentUser } = useAuth();
  const toast = useToast();
  const [duplicateWarning, setDuplicateWarning] = useState<{
    matchedBy: 'phone' | 'name' | null;
    existing?: Invitee;
  } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(inviteeSchema),
    defaultValues: {
      full_name: '',
      category: 'General Members',
      phone: '',
      alternate_phone: '',
      address: '',
      city: '',
      state: '',
      country: 'India',
      remarks: '',
    },
  });

  useEffect(() => {
    if (inviteeToEdit) {
      reset({
        full_name: inviteeToEdit.full_name,
        category: inviteeToEdit.category,
        phone: inviteeToEdit.phone,
        alternate_phone: inviteeToEdit.alternate_phone || '',
        address: inviteeToEdit.address || '',
        city: inviteeToEdit.city,
        state: inviteeToEdit.state,
        country: inviteeToEdit.country,
        remarks: inviteeToEdit.remarks || '',
      });
    } else {
      reset({
        full_name: '',
        category: 'General Members',
        phone: '',
        alternate_phone: '',
        address: '',
        city: '',
        state: '',
        country: 'India',
        remarks: '',
      });
    }
    setDuplicateWarning(null);
    setGeneralError(null);
  }, [inviteeToEdit, isOpen, reset]);

  const processSave = async (data: FormData, force = false) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    setGeneralError(null);

    try {
      // Duplicate check if creating or changing phone/name
      if (!force) {
        const check = await checkDuplicateInvitee(
          data.phone,
          data.full_name,
          inviteeToEdit?.id
        );
        if (check.isDuplicate) {
          setDuplicateWarning({
            matchedBy: check.matchedBy,
            existing: check.existing,
          });
          setIsSubmitting(false);
          return;
        }
      }

      let saved: Invitee;
      if (inviteeToEdit) {
        saved = await updateInvitee(inviteeToEdit.id, data, currentUser);
      } else {
        saved = await createInvitee(
          {
            full_name: data.full_name,
            category: data.category as InviteeCategory,
            phone: data.phone,
            alternate_phone: data.alternate_phone || null,
            address: data.address || null,
            city: data.city,
            state: data.state,
            country: data.country || 'India',
            remarks: data.remarks || null,
            created_by: currentUser.id,
          },
          currentUser
        );
      }

      onSuccess(saved);
      onClose();
    } catch (err: any) {
      setGeneralError(err.message || 'Failed to save invitee record.');
      toast.show(err.message || 'Failed to save invitee record.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSubmit = (data: FormData) => {
    processSave(data, false);
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={inviteeToEdit ? `Edit Invitee: ${inviteeToEdit.invitee_code}` : 'Register New Invitee'}
      description="Add delegate profile. Once registered, all event departments can coordinate arrangements."
      maxWidth="xl"
    >
      {generalError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-xs text-red-700 rounded-xl flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{generalError}</span>
        </div>
      )}

      {duplicateWarning && (
        <div className="mb-4 p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-2.5">
          <div className="flex items-start gap-2 font-semibold">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Possible Duplicate Invitee Detected!</span>
          </div>
          <p>
            An existing record already matches by{' '}
            <strong className="underline">{duplicateWarning.matchedBy}</strong>:
          </p>
          <div className="p-2.5 bg-white rounded-lg border border-amber-200 text-[11px]">
            <p className="font-semibold text-[#1A221E]">
              {duplicateWarning.existing?.full_name} ({duplicateWarning.existing?.invitee_code})
            </p>
            <p className="text-[#69756F] mt-0.5">
              Phone: {duplicateWarning.existing?.phone} • Category: {duplicateWarning.existing?.category}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDuplicateWarning(null)}
              className="h-8 text-xs bg-white"
            >
              Review Information
            </Button>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleSubmit((data) => processSave(data, true))}
              className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
            >
              Confirm and Save Anyway
            </Button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="full_name"
            label="Full Name"
            placeholder="e.g. Maulana Khalid Saifullah Rahmani"
            required
            error={errors.full_name?.message}
            {...register('full_name')}
          />

          <div>
            <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
              Invitee Category <span className="text-red-500">*</span>
            </label>
            <select
              {...register('category')}
              className="h-10 w-full rounded-lg border border-[#E3E7E4] bg-white px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            >
              <option value="Founder Members">Founder Members</option>
              <option value="General Members">General Members</option>
              <option value="Special Invitees">Special Invitees</option>
            </select>
            {errors.category && (
              <p className="mt-1 text-xs text-red-600">{errors.category.message}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="phone"
            label="Primary Phone Number"
            placeholder="+91 98400 00000"
            required
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            id="alternate_phone"
            label="Alternate Phone (Optional)"
            placeholder="+91 94400 00000"
            error={errors.alternate_phone?.message}
            {...register('alternate_phone')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            id="city"
            label="City"
            placeholder="e.g. Chennai"
            required
            error={errors.city?.message}
            {...register('city')}
          />

          <Input
            id="state"
            label="State"
            placeholder="e.g. Tamil Nadu"
            required
            error={errors.state?.message}
            {...register('state')}
          />

          <Input
            id="country"
            label="Country"
            placeholder="India"
            error={errors.country?.message}
            {...register('country')}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
            Address / Organization Affiliation
          </label>
          <input
            type="text"
            placeholder="Street address, institution, or organization name"
            className="h-10 w-full rounded-lg border border-[#E3E7E4] bg-white px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            {...register('address')}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
            Special Remarks / Protocol Instructions
          </label>
          <textarea
            rows={3}
            placeholder="Special instructions, dietary notes, health assistance, or priority seating requests..."
            className="w-full rounded-lg border border-[#E3E7E4] bg-white p-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            {...register('remarks')}
          />
        </div>

        <div className="pt-4 border-t border-[#F4F6F4] flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-2.5">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting} className="w-full sm:w-auto h-10 sm:h-9">
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-[#164734] hover:bg-[#113829] text-white w-full sm:w-auto h-10 sm:h-9 font-semibold">
            {inviteeToEdit ? 'Save Changes' : 'Register Invitee'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
