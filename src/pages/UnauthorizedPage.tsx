import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

export const UnauthorizedPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, getDashboardRoute } = useAuth();

  return (
    <div className="min-h-screen bg-[#FAF9F6] flex flex-col justify-center items-center px-4 text-center">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-[#E3E7E4] shadow-card-subtle flex flex-col items-center">
        <div className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-200 mb-4">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <h1 className="text-xl font-bold text-[#1A221E]">Restricted Department Access</h1>
        <p className="mt-2 text-xs text-[#69756F] leading-relaxed">
          You are authenticated as <span className="font-semibold text-[#164734]">{currentUser?.full_name}</span> with
          role <span className="font-semibold text-[#164734]">{currentUser?.role}</span>. You do not have permission
          to access this department module.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row items-center gap-2.5 w-full">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto flex-1 flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Go Back</span>
          </Button>
          <Button
            size="sm"
            onClick={() => navigate(getDashboardRoute())}
            className="w-full sm:w-auto flex-1 bg-[#164734] hover:bg-[#113829] text-white shadow-sm flex items-center justify-center gap-1.5"
          >
            <Home className="h-4 w-4" />
            <span>My Department</span>
          </Button>
        </div>
      </div>
    </div>
  );
};
