import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center items-center px-4 text-center">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-[#E3E7E4] shadow-card-subtle flex flex-col items-center">
        <div className="p-3 bg-[#E8F1EC] text-[#164734] rounded-2xl border border-[#C5DEC8] mb-4">
          <HelpCircle className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-bold text-[#1A221E]">404 - Page Not Found</h1>
        <p className="mt-2 text-xs text-[#69756F] leading-relaxed">
          The requested portal view does not exist or has been moved to another section.
        </p>
        <Button
          size="sm"
          onClick={() => navigate('/')}
          className="mt-6 flex items-center gap-1.5 bg-[#164734] hover:bg-[#113829] text-white shadow-sm"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return to Portal</span>
        </Button>
      </div>
    </div>
  );
};
