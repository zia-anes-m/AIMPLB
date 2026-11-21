import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
  itemLabel?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [25, 50, 100],
  className = '',
  itemLabel = 'records',
}) => {
  if (totalItems === 0) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with window around current
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      
      if (currentPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 pb-1 border-t border-[#E3E7E4] text-xs select-none',
        className
      )}
      role="navigation"
      aria-label="Pagination Navigation"
    >
      {/* Status Summary & Page Size Selector */}
      <div className="flex items-center gap-3 text-[#69756F] order-2 sm:order-1 flex-wrap justify-center sm:justify-start">
        <span>
          Showing <strong className="text-[#1A221E] font-semibold">{startItem}</strong> to{' '}
          <strong className="text-[#1A221E] font-semibold">{endItem}</strong> of{' '}
          <strong className="text-[#1A221E] font-semibold">{totalItems}</strong> {itemLabel}
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-1">
            <span className="text-[11px]">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Items per page"
              className="h-8 px-2 rounded-lg border border-[#E3E7E4] bg-white text-[#1A221E] font-medium text-xs focus:outline-none focus:ring-1 focus:ring-[#164734]"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Buttons (Touch-friendly for Android & Mobile) */}
      <div className="flex items-center gap-1 order-1 sm:order-2">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(1)}
          aria-label="First page"
          className="h-9 w-9 p-0 hidden sm:flex items-center justify-center text-[#69756F] border-[#E3E7E4] disabled:opacity-30"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
          className="h-9 px-2.5 sm:px-2 flex items-center gap-1 text-[#69756F] border-[#E3E7E4] disabled:opacity-30 min-w-[36px]"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sm:hidden font-medium">Prev</span>
        </Button>

        {/* Desktop Page Numbers */}
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((p, idx) =>
            typeof p === 'number' ? (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === currentPage ? 'page' : undefined}
                className={cn(
                  'h-8 w-8 rounded-lg font-semibold text-xs transition-colors',
                  p === currentPage
                    ? 'bg-[#164734] text-white shadow-2xs'
                    : 'text-[#69756F] hover:bg-[#E8F1EC] hover:text-[#164734]'
                )}
              >
                {p}
              </button>
            ) : (
              <span key={`ellipsis-${idx}`} className="px-1 text-[#AAB3AE]">
                ...
              </span>
            )
          )}
        </div>

        {/* Mobile Page indicator */}
        <div className="sm:hidden px-3 text-xs font-semibold text-[#1A221E]">
          Page {currentPage} of {totalPages || 1}
        </div>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
          className="h-9 px-2.5 sm:px-2 flex items-center gap-1 text-[#69756F] border-[#E3E7E4] disabled:opacity-30 min-w-[36px]"
        >
          <span className="sm:hidden font-medium">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          aria-label="Last page"
          className="h-9 w-9 p-0 hidden sm:flex items-center justify-center text-[#69756F] border-[#E3E7E4] disabled:opacity-30"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
