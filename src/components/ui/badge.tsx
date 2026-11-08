import React from 'react';
import { cn } from '@/lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'info' | 'danger' | 'founder' | 'general' | 'special';
}

export const Badge: React.FC<BadgeProps> = ({ className, variant = 'default', children, ...props }) => {
  const variants = {
    default: 'bg-[#E5E7E4] text-[#202722]',
    success: 'bg-[#E8F0EA] text-[#164734] border border-[#c3d9c8]',
    warning: 'bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]',
    info: 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]',
    danger: 'bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA]',
    founder: 'bg-[#164734] text-white font-semibold',
    general: 'bg-[#E8F0EA] text-[#164734] font-medium border border-[#b2ceba]',
    special: 'bg-[#FBF6EC] text-[#8C6B1C] font-semibold border border-[#E7D6A8]',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium tracking-wide',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};

