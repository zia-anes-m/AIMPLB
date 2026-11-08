import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FoodRecord, Invitee } from '@/types';
import { createFoodRecord, updateFoodRecord, getInvitees } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { AlertCircle } from 'lucide-react';

const foodSchema = z.object({
  invitee_id: z.string().min(1, 'Please select an invitee'),
  meal_date: z.string().min(1, 'Meal date is required'),
  breakfast: z.boolean().default(true),
  lunch: z.boolean().default(true),
  dinner: z.boolean().default(true),
  refreshments: z.boolean().default(true),
  food_provider: z.string().default('Chennai Biryani & Catering Co.'),
  provider_contact: z.string().optional().nullable(),
  provider_phone: z.string().optional().nullable(),
  dietary_preference: z.string().default('Non-vegetarian'),
  special_requirements: z.string().optional().nullable(),
  delivery_location: z.string().optional().nullable(),
  remarks: z.string().optional().nullable(),
});

type FormData = z.infer<typeof foodSchema>;

interface FoodFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  recordToEdit?: FoodRecord | null;
  defaultInviteeId?: string;
}

export const FoodFormModal: React.FC<FoodFormModalProps> = ({
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
    reset,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(foodSchema),
    defaultValues: {
      invitee_id: defaultInviteeId || '',
      meal_date: '2026-12-14',
      breakfast: true,
      lunch: true,
      dinner: true,
      refreshments: true,
      food_provider: 'Chennai Biryani & Catering Co.',
      provider_contact: 'Haji Farooq Ahmed',
      provider_phone: '+91 98400 12345',
      dietary_preference: 'Non-vegetarian',
      special_requirements: '',
      delivery_location: 'VIP Dining Hall, Hajj House',
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
        meal_date: recordToEdit.meal_date,
        breakfast: recordToEdit.breakfast,
        lunch: recordToEdit.lunch,
        dinner: recordToEdit.dinner,
        refreshments: recordToEdit.refreshments,
        food_provider: recordToEdit.food_provider || 'Chennai Biryani & Catering Co.',
        provider_contact: recordToEdit.provider_contact || '',
        provider_phone: recordToEdit.provider_phone || '',
        dietary_preference: recordToEdit.dietary_preference,
        special_requirements: recordToEdit.special_requirements || '',
        delivery_location: recordToEdit.delivery_location || '',
        remarks: recordToEdit.remarks || '',
      });
    } else {
      reset({
        invitee_id: defaultInviteeId || '',
        meal_date: '2026-12-14',
        breakfast: true,
        lunch: true,
        dinner: true,
        refreshments: true,
        food_provider: 'Chennai Biryani & Catering Co.',
        provider_contact: 'Haji Farooq Ahmed',
        provider_phone: '+91 98400 12345',
        dietary_preference: 'Non-vegetarian',
        special_requirements: '',
        delivery_location: 'VIP Dining Hall, Hajj House',
        remarks: '',
      });
    }
    setError(null);
  }, [recordToEdit, defaultInviteeId, isOpen, reset]);

  const onSubmit = async (data: FormData) => {
    if (!currentUser) return;
    setIsSubmitting(true);
    setError(null);

    try {
      if (recordToEdit) {
        await updateFoodRecord(recordToEdit.id, data, currentUser);
      } else {
        await createFoodRecord(data, currentUser);
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save food arrangement.');
      toast.error('Catering error', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title={recordToEdit ? 'Edit Meal Arrangement' : 'Assign Food & Catering Schedule'}
      description="Configure daily meal requirements, dietary constraints, and caterer delivery location."
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
          <Input
            id="meal_date"
            label="Meal Date"
            type="date"
            required
            error={errors.meal_date?.message}
            {...register('meal_date')}
          />

          <div>
            <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
              Dietary Preference <span className="text-red-500">*</span>
            </label>
            <select
              {...register('dietary_preference')}
              className="h-10 w-full rounded-lg border border-[#E3E7E4] bg-white px-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            >
              <option value="Non-vegetarian">Non-vegetarian (Halal standard)</option>
              <option value="Vegetarian">Pure Vegetarian</option>
              <option value="Diabetic">Diabetic / Low Sugar</option>
              <option value="Low Sodium">Low Sodium (BP Friendly)</option>
              <option value="Other">Other Medical Diet</option>
            </select>
          </div>
        </div>

        {/* Meal Inclusions Checkbox Grid */}
        <div className="p-4 bg-[#FAF9F6] rounded-xl border border-[#E3E7E4] space-y-2.5">
          <label className="block text-xs font-semibold text-[#1A221E]">
            Included Daily Meals & Refreshments
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-[#1A221E]">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#E3E7E4] text-[#164734] focus:ring-[#164734]"
                {...register('breakfast')}
              />
              <span>Breakfast</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-[#1A221E]">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#E3E7E4] text-[#164734] focus:ring-[#164734]"
                {...register('lunch')}
              />
              <span>Banquet Lunch</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-[#1A221E]">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#E3E7E4] text-[#164734] focus:ring-[#164734]"
                {...register('dinner')}
              />
              <span>Dinner Banquet</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer font-medium text-[#1A221E]">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#E3E7E4] text-[#164734] focus:ring-[#164734]"
                {...register('refreshments')}
              />
              <span>Tea & Snacks</span>
            </label>
          </div>
        </div>

        <div>
          <Input
            id="special_requirements"
            label="Special Dietary Instructions / Medical Restrictions"
            placeholder="e.g. Strictly sugar-free, low spice, soft diet, gluten sensitive..."
            error={errors.special_requirements?.message}
            {...register('special_requirements')}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            id="food_provider"
            label="Caterer / Provider"
            placeholder="e.g. Chennai Biryani & Catering Co."
            error={errors.food_provider?.message}
            {...register('food_provider')}
          />

          <Input
            id="delivery_location"
            label="Dining Location / Hall"
            placeholder="e.g. VIP Dining Hall, Hajj House"
            error={errors.delivery_location?.message}
            {...register('delivery_location')}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
            Internal Catering Remarks
          </label>
          <textarea
            rows={2}
            placeholder="Packed lunch for departure, delivered to hotel room, etc."
            className="w-full rounded-lg border border-[#E3E7E4] bg-white p-3 text-xs sm:text-sm text-[#1A221E] focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
            {...register('remarks')}
          />
        </div>

        <div className="pt-4 border-t border-[#F4F6F4] flex justify-end gap-2.5">
          <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isSubmitting} className="bg-[#164734] hover:bg-[#113829] text-white">
            {recordToEdit ? 'Save Changes' : 'Confirm Meal Schedule'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
};
