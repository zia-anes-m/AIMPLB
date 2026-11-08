import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#164734] disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98] select-none';

    const variants = {
      primary:
        'bg-[#164734] text-white hover:bg-[#103728] shadow-xs active:bg-[#0A251B] border border-[#164734]',
      secondary:
        'bg-[#E8F1EC] text-[#164734] hover:bg-[#D5E6DC] border border-[#C5DEC8] font-semibold active:bg-[#C2D8CB]',
      outline:
        'border border-[#E3E7E4] bg-white text-[#1A221E] hover:bg-[#FAF9F6] hover:border-[#164734]/40 shadow-xs active:bg-[#F2F4F2]',
      danger:
        'bg-red-600 text-white hover:bg-red-700 shadow-xs active:bg-red-800 border border-red-700',
      ghost:
        'text-[#37433D] hover:bg-[#E8F1EC] hover:text-[#164734] active:bg-[#D5E6DC]',
      gold:
        'bg-[#C59A3F] text-white hover:bg-[#A8802E] shadow-xs active:bg-[#8F6C22] border border-[#B3872F]',
    };

    const sizes = {
      sm: 'h-8 px-2.5 sm:px-3 text-xs gap-1.5 min-h-[32px]',
      md: 'h-9 sm:h-10 px-3.5 sm:px-4 text-xs sm:text-sm gap-2 min-h-[38px]',
      lg: 'h-11 sm:h-12 px-5 sm:px-6 text-sm sm:text-base gap-2.5 min-h-[44px]',
      icon: 'h-9 w-9 sm:h-10 sm:w-10 p-0 text-sm justify-center',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
