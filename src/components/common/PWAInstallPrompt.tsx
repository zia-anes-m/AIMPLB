import React, { useState, useEffect, useCallback } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { safeStorage } from '@/lib/safeStorage';

const PWA_DISMISSED_KEY = 'aimplb_pwa_install_dismissed';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already running in standalone PWA mode
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isRunningStandalone);

    if (isRunningStandalone) return;

    // Check if user previously dismissed prompt
    const previouslyDismissed = safeStorage.getItem(PWA_DISMISSED_KEY);
    if (previouslyDismissed) return;

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
      safeStorage.setItem(PWA_DISMISSED_KEY, 'true');
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = useCallback(() => {
    setShowPrompt(false);
    setDeferredPrompt(null);
    try {
      safeStorage.setItem(PWA_DISMISSED_KEY, 'true');
    } catch {
      // Ignore storage errors
    }
  }, []);

  // If in standalone mode or dismissed, never render
  if (isStandalone || !showPrompt) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Install AIMPLB App"
      className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 bg-white border border-[#164734]/20 rounded-2xl p-4 shadow-xl z-50 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4 duration-200 select-none"
    >
      <div className="p-2.5 bg-[#E8F1EC] text-[#164734] rounded-xl shrink-0 mt-0.5">
        <Smartphone className="h-5 w-5" />
      </div>

      <div className="flex-1 min-w-0 pr-1">
        <h4 className="text-xs font-bold text-[#1A221E] tracking-tight">Install AIMPLB App</h4>
        <p className="text-[11px] text-[#69756F] mt-1 leading-relaxed">
          {isIOS
            ? 'Install on your iPhone: tap the Share button and select "Add to Home Screen".'
            : 'Install this portal on your phone or desktop for fast, one-tap access during event operations.'}
        </p>

        <div className="mt-3 flex items-center gap-2">
          {!isIOS && deferredPrompt && (
            <Button
              type="button"
              size="sm"
              onClick={handleInstallClick}
              className="h-8 text-xs bg-[#164734] hover:bg-[#113829] text-white px-3 font-semibold shadow-xs cursor-pointer"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Install Now
            </Button>
          )}
          <button
            type="button"
            onClick={handleDismiss}
            className="text-xs text-[#69756F] hover:text-[#1A221E] px-2.5 py-1.5 font-medium rounded-lg hover:bg-[#F4F6F4] transition-colors cursor-pointer"
          >
            Not Now
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="text-[#69756F] hover:text-[#1A221E] p-1.5 -mt-1 -mr-1 rounded-lg hover:bg-[#F4F6F4] transition-colors cursor-pointer"
        aria-label="Close install notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
