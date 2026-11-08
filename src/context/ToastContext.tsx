import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

export interface ToastMethods {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  show: (title: string, type?: ToastType, message?: string) => void;
  toast: ToastMethods;
}

interface ToastContextType {
  toast: ToastMethods;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5);
    setToasts((prev) => [...prev, { id, type, title, message }]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4200);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toastMethods = useMemo(() => {
    const methods: any = {
      success: (title: string, message?: string) => addToast('success', title, message),
      error: (title: string, message?: string) => addToast('error', title, message),
      warning: (title: string, message?: string) => addToast('warning', title, message),
      info: (title: string, message?: string) => addToast('info', title, message),
      show: (title: string, type: ToastType = 'info', message?: string) =>
        addToast(type, title, message),
    };
    methods.toast = methods;
    return methods as ToastMethods;
  }, [addToast]);

  const contextValue = useMemo(() => ({ toast: toastMethods }), [toastMethods]);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      {/* Toast Render Portal */}
      <div
        aria-live="polite"
        className="fixed top-4 right-4 left-4 sm:left-auto sm:w-96 z-50 flex flex-col gap-2 pointer-events-none"
      >
        {toasts.map((t) => {
          const icons = {
            success: <CheckCircle2 className="h-4 w-4 text-[#164734] shrink-0 mt-0.5" />,
            error: <AlertCircle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />,
            warning: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />,
            info: <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />,
          };

          const borders = {
            success: 'border-[#C5DEC8] bg-white text-[#1A221E]',
            error: 'border-red-200 bg-white text-[#1A221E]',
            warning: 'border-amber-200 bg-white text-[#1A221E]',
            info: 'border-blue-200 bg-white text-[#1A221E]',
          };

          return (
            <div
              key={t.id}
              role="alert"
              className={cn(
                'pointer-events-auto p-3.5 rounded-lg border shadow-dropdown flex items-start gap-3 animate-fade-in transition-all',
                borders[t.type]
              )}
            >
              {icons[t.type]}
              <div className="flex-1 text-xs">
                <div className="font-semibold text-[#1A221E]">{t.title}</div>
                {t.message && <div className="text-[#69756F] mt-0.5 leading-relaxed">{t.message}</div>}
              </div>
              <button
                onClick={() => removeToast(t.id)}
                className="text-[#69756F] hover:text-[#1A221E] p-1 rounded transition-colors -mr-1 -mt-1"
                aria-label="Close notification"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
};
