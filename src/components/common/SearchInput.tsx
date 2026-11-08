import React from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search by name, code, phone...',
  className = '',
}) => {
  return (
    <div className={cn('relative flex items-center w-full', className)}>
      <Search className="absolute left-3.5 h-4 w-4 text-[#69756F] pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-10 w-full rounded-lg border border-[#E3E7E4] bg-white pl-10 pr-9 text-xs sm:text-sm text-[#1A221E] placeholder:text-[#AAB3AE] shadow-card-subtle transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          className="absolute right-2.5 p-1 text-[#69756F] hover:text-[#1A221E] hover:bg-[#F4F6F4] rounded-md transition-colors"
          aria-label="Clear search query"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
};
