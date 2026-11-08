import React from 'react';
import { Dialog } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'primary';
  isLoading?: boolean;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm Action',
  cancelLabel = 'Cancel',
  variant = 'danger',
  isLoading = false,
}) => {
  return (
    <Dialog isOpen={isOpen} onClose={onClose} maxWidth="sm">
      <div className="flex items-start gap-3.5">
        <div
          className={`p-2.5 rounded-xl shrink-0 ${
            variant === 'danger'
              ? 'bg-red-50 text-red-600 border border-red-200'
              : 'bg-[#E8F1EC] text-[#164734] border border-[#C5DEC8]'
          }`}
        >
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-bold text-[#1A221E]">{title}</h3>
          <p className="mt-1 text-xs sm:text-sm text-[#69756F] leading-relaxed">{message}</p>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-[#F4F6F4] flex flex-col-reverse sm:flex-row justify-end gap-2">
        <Button variant="outline" size="md" onClick={onClose} disabled={isLoading} className="w-full sm:w-auto">
          {cancelLabel}
        </Button>
        <Button
          variant={variant === 'danger' ? 'danger' : 'primary'}
          size="md"
          onClick={onConfirm}
          isLoading={isLoading}
          className="w-full sm:w-auto"
        >
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
};
