import React from 'react';
import { cn } from '@/lib/utils';

export type StatusVariant =
  | 'founder'
  | 'general'
  | 'special'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'vip'
  | 'pending';

export interface StatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: StatusVariant;
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  pulse?: boolean;
  label?: React.ReactNode;
  children?: React.ReactNode;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  variant = 'neutral',
  size = 'md',
  dot = true,
  pulse = false,
  label,
  className,
  children,
  ...props
}) => {
  const sizeStyles = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-[11px] px-2.5 py-0.5 gap-1.5',
    lg: 'text-xs px-3 py-1 gap-2',
  };
  const styles: Record<StatusVariant, { badge: string; dot: string }> = {
    founder: {
      badge: 'bg-[#164734] text-white border-[#103728]',
      dot: 'bg-emerald-300',
    },
    general: {
      badge: 'bg-[#E8F1EC] text-[#164734] border-[#C5DEC8]',
      dot: 'bg-[#164734]',
    },
    special: {
      badge: 'bg-[#FAF4E6] text-[#8C6B1C] border-[#E8D9B5]',
      dot: 'bg-[#C59A3F]',
    },
    vip: {
      badge: 'bg-[#FBF0D8] text-[#7A5B0B] border-[#DEC78B]',
      dot: 'bg-[#C59A3F]',
    },
    success: {
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-600',
    },
    warning: {
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-500',
    },
    danger: {
      badge: 'bg-red-50 text-red-800 border-red-200',
      dot: 'bg-red-500',
    },
    info: {
      badge: 'bg-blue-50 text-blue-800 border-blue-200',
      dot: 'bg-blue-500',
    },
    neutral: {
      badge: 'bg-[#FAF9F6] text-[#4A5550] border-[#E3E7E4]',
      dot: 'bg-[#98A39C]',
    },
    pending: {
      badge: 'bg-slate-50 text-slate-700 border-slate-200',
      dot: 'bg-slate-400',
    },
  };

  const current = styles[variant] || styles.neutral;
  const content = children ?? label;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold border transition-colors',
        sizeStyles[size],
        current.badge,
        className
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn(
            'h-1.5 w-1.5 rounded-full shrink-0',
            current.dot,
            pulse && 'animate-pulse'
          )}
        />
      )}
      <span>{content}</span>
    </span>
  );
};
