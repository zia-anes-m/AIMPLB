import React, { useState } from 'react';
import { LucideIcon, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface MobileDataField {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
}

interface MobileDataCardProps {
  title: string;
  subtitle?: string;
  identifier?: string;
  badge?: React.ReactNode;
  fields: MobileDataField[];
  expandableFields?: MobileDataField[];
  actions?: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const MobileDataCard: React.FC<MobileDataCardProps> = ({
  title,
  subtitle,
  identifier,
  badge,
  fields,
  expandableFields,
  actions,
  onClick,
  className,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={cn(
        'rounded-xl border border-[#E3E7E4] bg-white p-3.5 shadow-card-subtle transition-all duration-200 hover:border-[#164734]/30 hover:shadow-card-hover flex flex-col gap-3',
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      {/* Top Header: Identifier, Badge, and Title */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            {identifier && (
              <span className="font-mono text-[11px] font-bold text-[#164734] bg-[#E8F1EC] px-2 py-0.5 rounded tracking-wide">
                {identifier}
              </span>
            )}
            {badge}
          </div>
          <h3 className="text-sm font-bold text-[#1A221E] leading-snug truncate">
            {title}
          </h3>
          {subtitle && (
            <p className="text-[11px] text-[#69756F] mt-0.5 truncate">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Primary Key-Value Fields Grid */}
      <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-[#F4F6F4]">
        {fields.map((field, idx) => {
          const Icon = field.icon;
          return (
            <div key={idx} className="min-w-0">
              <span className="text-[10px] font-semibold text-[#69756F] uppercase tracking-wider block truncate">
                {field.label}
              </span>
              <div className="text-[12px] font-medium text-[#1A221E] mt-0.5 flex items-center gap-1 truncate">
                {Icon && <Icon className="h-3 w-3 text-[#164734] shrink-0" />}
                <span className="truncate">{field.value ?? '—'}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expandable Section if there are additional details */}
      {expandableFields && expandableFields.length > 0 && (
        <div className="text-xs pt-1 border-t border-[#F4F6F4]">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded(!isExpanded);
            }}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#164734] hover:underline py-1 w-full justify-between"
          >
            <span>{isExpanded ? 'Hide Details' : 'View More Details'}</span>
            {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>

          {isExpanded && (
            <div className="space-y-1.5 pt-1.5 text-[11px] text-[#37433D] animate-fade-in bg-[#FAF9F6] p-2.5 rounded-lg border border-[#E3E7E4]/60 mt-1">
              {expandableFields.map((field, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
                  <span className="text-[#69756F] font-medium">{field.label}:</span>
                  <span className="font-semibold text-[#1A221E]">{field.value ?? '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Actions Toolbar */}
      {actions && (
        <div
          className="pt-2 border-t border-[#F4F6F4] flex items-center justify-end gap-1.5"
          onClick={(e) => e.stopPropagation()}
        >
          {actions}
        </div>
      )}
    </div>
  );
};

