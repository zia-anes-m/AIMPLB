import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon?: LucideIcon;
  variant?: 'default' | 'highlight' | 'warning' | 'success' | 'info' | 'special';
  className?: string;
  badge?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  badge,
  className,
}) => {
  const variantStyles = {
    default: {
      card: 'border-[#E3E7E4] bg-white hover:border-[#164734]/30',
      iconBox: 'bg-[#F4F6F4] text-[#164734]',
      value: 'text-[#1A221E]',
    },
    highlight: {
      card: 'border-[#C5DEC8] bg-gradient-to-b from-white to-[#F2F7F4] hover:border-[#164734]',
      iconBox: 'bg-[#164734] text-white shadow-xs',
      value: 'text-[#164734]',
    },
    warning: {
      card: 'border-amber-200/90 bg-gradient-to-b from-white to-amber-50/30 hover:border-amber-300',
      iconBox: 'bg-amber-100 text-amber-800',
      value: 'text-amber-950',
    },
    success: {
      card: 'border-emerald-200/90 bg-gradient-to-b from-white to-emerald-50/30 hover:border-emerald-300',
      iconBox: 'bg-emerald-100 text-emerald-800',
      value: 'text-emerald-950',
    },
    info: {
      card: 'border-blue-200/90 bg-gradient-to-b from-white to-blue-50/30 hover:border-blue-300',
      iconBox: 'bg-blue-100 text-blue-800',
      value: 'text-blue-950',
    },
    special: {
      card: 'border-[#E8D9B5] bg-gradient-to-b from-white to-[#FAF4E6]/40 hover:border-[#C59A3F]',
      iconBox: 'bg-[#FAF4E6] text-[#8C6B1C]',
      value: 'text-[#7A5B0B]',
    },
  };

  const style = variantStyles[variant] || variantStyles.default;

  return (
    <div
      className={cn(
        'group relative rounded-xl border p-3 sm:p-4 shadow-card-subtle transition-all duration-200 hover:shadow-card-hover hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden',
        style.card,
        className
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-1.5 mb-1.5 sm:mb-2">
          <span className="text-[10px] sm:text-[11px] font-semibold tracking-wider text-[#69756F] uppercase truncate">
            {title}
          </span>
          {Icon && (
            <div
              className={cn(
                'p-1 sm:p-1.5 rounded-lg shrink-0 transition-transform duration-200 group-hover:scale-105',
                style.iconBox
              )}
            >
              <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            </div>
          )}
        </div>

        <div className="flex items-baseline gap-1.5 sm:gap-2 flex-wrap">
          <span
            className={cn(
              'text-lg sm:text-2xl font-bold tracking-tight font-mono',
              style.value
            )}
          >
            {value}
          </span>
          {badge && (
            <span className="text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-100/70 text-emerald-800 shrink-0">
              {badge}
            </span>
          )}
        </div>
      </div>

      {subtitle && (
        <p className="mt-1.5 text-[10px] sm:text-[11px] text-[#69756F] truncate leading-tight">
          {subtitle}
        </p>
      )}
    </div>
  );
};
