import React from 'react';

export const LoadingSkeleton: React.FC<{ rows?: number }> = ({ rows = 5 }) => {
  return (
    <div className="w-full space-y-3 animate-pulse p-4 rounded-xl border border-[#E3E7E4] bg-white shadow-card-subtle">
      <div className="flex items-center justify-between pb-2 border-b border-[#F4F6F4]">
        <div className="h-4 bg-[#E8F1EC] rounded-md w-1/4"></div>
        <div className="h-4 bg-[#F4F6F4] rounded-md w-24"></div>
      </div>
      <div className="space-y-2.5 pt-1">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="h-12 bg-[#FAF9F6] border border-[#E3E7E4]/60 rounded-lg w-full flex items-center justify-between px-3"
          >
            <div className="h-3.5 bg-[#E8F1EC] rounded w-1/3"></div>
            <div className="h-3 bg-[#E3E7E4] rounded w-1/5"></div>
          </div>
        ))}
      </div>
    </div>
  );
};
