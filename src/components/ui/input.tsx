import React from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
  icon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, label, helperText, icon, id, required, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="block text-xs font-semibold text-[#1A221E] mb-1.5">
            {label} {required && <span className="text-red-500 font-bold">*</span>}
          </label>
        )}
        <div className="relative flex items-center">
          {icon && (
            <div className="absolute left-3 text-[#69756F] pointer-events-none flex items-center">
              {icon}
            </div>
          )}
          <input
            type={type}
            id={id}
            ref={ref}
            required={required}
            className={cn(
              'flex h-10 w-full rounded-lg border border-[#E3E7E4] bg-white px-3 py-2 text-sm text-[#1A221E] shadow-card-subtle transition-all duration-150 placeholder:text-[#AAB3AE] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#164734]/20 focus-visible:border-[#164734] disabled:cursor-not-allowed disabled:bg-[#FAF9F6] disabled:opacity-60',
              icon && 'pl-9',
              error && 'border-red-500 focus-visible:ring-red-500/20 focus-visible:border-red-500',
              className
            )}
            {...props}
          />
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1 animate-fade-in">
            <AlertCircle className="h-3 w-3 shrink-0" />
            <span>{error}</span>
          </p>
        )}
        {!error && helperText && (
          <p className="mt-1 text-[11px] text-[#69756F] leading-tight">{helperText}</p>
        )}
      </div>
    );
  }
);
Input.displayName = 'Input';
