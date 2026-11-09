import React from 'react';
import { cn } from '@/lib/utils';

export const AIMPLB_LOGO_SRC = '/AIMPLB_logo.png';

export interface LogoProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  xs: 'h-6 w-auto',
  sm: 'h-8 sm:h-9 w-auto',
  md: 'h-10 sm:h-11 w-auto',
  lg: 'h-12 sm:h-14 w-auto',
  xl: 'h-16 sm:h-20 w-auto',
};

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  className,
  alt = 'All India Muslim Personal Law Board Emblem',
  ...props
}) => {
  return (
    <img
      src={AIMPLB_LOGO_SRC}
      alt={alt}
      className={cn('object-contain shrink-0 select-none', sizeClasses[size], className)}
      onError={(e) => {
        // Fallback safely to logo.png
        (e.target as HTMLImageElement).src = '/logo.png';
      }}
      {...props}
    />
  );
};

