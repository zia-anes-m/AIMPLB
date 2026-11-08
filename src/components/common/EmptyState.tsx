import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-8 sm:p-12 text-center rounded-2xl border border-dashed border-[#E3E7E4] bg-white shadow-card-subtle my-3">
      <div className="p-3.5 rounded-2xl bg-[#F2F7F4] text-[#164734] mb-3.5 border border-[#C5DEC8]/50 shadow-xs">
        <Icon className="h-6 w-6 sm:h-7 sm:w-7" />
      </div>
      <h3 className="text-sm sm:text-base font-bold text-[#1A221E]">{title}</h3>
      <p className="mt-1.5 text-xs text-[#69756F] max-w-sm leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <div className="mt-5">
          <Button size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
