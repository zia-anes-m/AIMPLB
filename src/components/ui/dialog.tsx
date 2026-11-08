import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'lg',
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidths = {
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center overflow-y-auto sm:p-4 p-0"
    >
      {/* Backdrop with subtle blur */}
      <div
        className="fixed inset-0 bg-[#1A221E]/60 backdrop-blur-xs transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Surface: Sheet on mobile, Centered Card on sm+ */}
      <div
        className={cn(
          'relative w-full rounded-t-2xl sm:rounded-2xl bg-white shadow-modal border border-[#E3E7E4] z-10 overflow-hidden transition-all duration-200 flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-fade-in',
          maxWidths[maxWidth]
        )}
      >
        {/* Mobile Pull Handle Indicator */}
        <div className="w-12 h-1.5 bg-[#E3E7E4] rounded-full mx-auto mt-2.5 sm:hidden shrink-0" />

        {/* Header */}
        {(title || description) && (
          <div className="flex items-start justify-between border-b border-[#F4F6F4] p-4 sm:p-5 shrink-0">
            <div className="pr-4">
              {title && (
                <h2 className="text-base sm:text-lg font-bold text-[#1A221E] leading-tight">
                  {title}
                </h2>
              )}
              {description && (
                <p className="text-xs text-[#69756F] mt-1 leading-relaxed">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-2 text-[#69756F] hover:bg-[#F4F6F4] hover:text-[#1A221E] transition-colors shrink-0 -mr-1 -mt-1"
              aria-label="Close dialog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 overscroll-contain">
          {children}
        </div>
      </div>
    </div>
  );
};
