import React, { useState, useEffect } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const PWAInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if app is already installed / in standalone mode
    const isRunningStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(isRunningStandalone);

    if (isRunningStandalone) return;

    // Detect iOS Safari
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIosDevice);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Check if user previously dismissed prompt today
      const dismissed = localStorage.getItem('aimplb_pwa_dismissed');
      if (!dismissed) {
        setShowPrompt(true);
      }
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
    }
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    try {
      localStorage.setItem('aimplb_pwa_dismissed', 'true');
    } catch {
      // Ignore storage errors
    }
  };

  if (isStandalone || (!showPrompt && !deferredPrompt)) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 bg-white border border-[#164734]/20 rounded-2xl p-4 shadow-xl z-50 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="p-2.5 bg-[#E8F1EC] text-[#164734] rounded-xl shrink-0">
        <Smartphone className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-xs font-bold text-[#1A221E] tracking-tight">Install AIMPLB App</h4>
        <p className="text-[11px] text-[#69756F] mt-0.5 leading-relaxed">
          {isIOS
            ? 'Install on your iPhone: tap the Share button below and select "Add to Home Screen".'
            : 'Install this portal on your phone or desktop for instant offline access and quick launch.'}
        </p>
        <div className="mt-2.5 flex items-center gap-2">
          {!isIOS && deferredPrompt && (
            <Button
              size="sm"
              onClick={handleInstallClick}
              className="h-7 text-xs bg-[#164734] hover:bg-[#113829] text-white px-3"
            >
              <Download className="h-3 w-3 mr-1.5" />
              Install Now
            </Button>
          )}
          <button
            onClick={handleDismiss}
            className="text-[11px] text-[#69756F] hover:text-[#1A221E] px-2 py-1 font-medium"
          >
            Not Now
          </button>
        </div>
      </div>
      <button
        onClick={handleDismiss}
        className="text-[#69756F] hover:text-[#1A221E] p-1 -mt-1 -mr-1"
        aria-label="Close install prompt"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
