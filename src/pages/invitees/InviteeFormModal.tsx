import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Invitee, InviteeCategory } from '@/types';
import { createInvitee, updateInvitee, checkDuplicateInvitee, isValid10DigitPhone } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AlertCircle, ShieldAlert } from 'lucide-react';

const inviteeSchema = z.object({
  full_name: z
    .string()
    .min(2, 'Full name must be at least 2 characters')
    .refine((val) => val.trim().length >= 2, 'Full name cannot be blank spaces'),
  category: z.enum(['Founder Members', 'General Members', 'Special Invitees']),
  phone: z
    .string()
    .min(1, 'Primary phone number is required')
    .refine(
      (val) => isValid10DigitPhone(val),
      'Phone number must contain exactly 10 digits (e.g. 9840123456 or +91 9840123456)'
    ),
  alternate_phone: z
    .string()
    .optional()
    .nullable()
    .refine(
      (val) => !val || !val.trim() || isValid10DigitPhone(val),
      'Alternate phone must contain exactly 10 digits if provided'
    ),
  address: z.string().optional().nullable(),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  country: z.string().default('India'),
  remarks: z.string().optional().nullable(),
  id_card_remarks: z.string().optional().nullable(),
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
      id_card_remarks: '',
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
        id_card_remarks: inviteeToEdit.id_card_remarks || '',
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
        id_card_remarks: '',
      });
    }
    setDuplicateWarning(null);
    setGeneralError(null);
  }, [inviteeToEdit, isOpen, reset]);

  const processSave = async (data: FormData) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    setGeneralError(null);

    try {
      // Strict duplicate prevention: No two invitees can have the same phone number or name
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
            id_card_remarks: data.id_card_remarks || null,
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
    processSave(data);
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
        <div className="mb-4 p-4 bg-red-50 border border-red-300 rounded-xl text-xs text-red-900 space-y-2.5">
          <div className="flex items-start gap-2 font-bold text-red-700">
            <ShieldAlert className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
            <span>
              Duplicate Entry Blocked: Same {duplicateWarning.matchedBy === 'phone' ? 'Phone Number' : 'Name'} Already Registered
            </span>
          </div>
          <p className="text-red-800">
            To prevent duplicate entries and maintain database integrity, no two invitees can have the same{' '}
            <strong className="underline">{duplicateWarning.matchedBy === 'phone' ? 'phone number' : 'name'}</strong>. An existing invitee already matches:
          </p>
          <div className="p-2.5 bg-white rounded-lg border border-red-200 text-[11px]">
            <p className="font-bold text-[#1A221E]">
              {duplicateWarning.existing?.full_name} ({duplicateWarning.existing?.invitee_code})
            </p>
            <p className="text-[#69756F] mt-0.5">
              Phone: {duplicateWarning.existing?.phone} • Category: {duplicateWarning.existing?.category} • City: {duplicateWarning.existing?.city}
            </p>
          </div>
          <div className="pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDuplicateWarning(null)}
              className="h-8 text-xs bg-white text-red-800 border-red-300 hover:bg-red-100"
            >
              Review Details & Modify
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
            label="Primary Phone Number (10 digits)"
            placeholder="e.g. 9840123456"
            helperText="Must contain exactly 10 digits"
            required
            error={errors.phone?.message}
            {...register('phone')}
          />

          <Input
            id="alternate_phone"
            label="Alternate Phone (Optional)"
            placeholder="e.g. 9440123456"
            helperText="Must contain exactly 10 digits if provided"
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
            Internal Secretariat Notes & Protocol Instructions
          </label>
          <textarea
            rows={2}
            placeholder="Internal notes, dietary notes, health assistance, or priority seating requests..."
            className="w-full rounded-lg border border-[#E3E7E4] bg-white p-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            {...register('remarks')}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-semibold text-[#164734]">
              ID Card Remarks (Printed on Badge)
            </label>
            <span className="text-[10px] text-[#69756F] italic">Strictly separate from internal notes</span>
          </div>
          <input
            type="text"
            placeholder="e.g. Dais & Presidium Access, Special Guest, Board Member"
            className="h-10 w-full rounded-lg border border-[#C5DEC8] bg-[#FAF9F6] px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            {...register('id_card_remarks')}
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
