import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  Search,
  CheckCircle2,
  AlertTriangle,
  LogIn,
  LogOut,
  Volume2,
  VolumeX,
  RefreshCw,
  Lock,
  ShieldAlert,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Invitee, EventAttendanceRecord } from '@/types';
import {
  getInviteeByQrToken,
  getInviteeByCode,
  recordEventEntry,
  recordEventExit,
  getInvitees,
} from '@/services/api';
import { useAuth } from '@/context/AuthContext';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'IN' | 'OUT';
  onScanComplete?: (invitee: Invitee, record: EventAttendanceRecord, mode: 'IN' | 'OUT') => void;
}

interface CameraErrorInfo {
  type: 'INSECURE_CONNECTION' | 'PERMISSION_DENIED' | 'NOT_FOUND' | 'IN_USE' | 'GENERAL_ERROR';
  title: string;
  message: string;
  canSwitchHttps?: boolean;
  canRetry?: boolean;
}

export const QRScannerModal: React.FC<QRScannerModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'IN',
  onScanComplete,
}) => {
  const { currentUser } = useAuth();
  const [scanMode, setScanMode] = useState<'IN' | 'OUT'>(initialMode);
  const [activeTab, setActiveTab] = useState<'camera' | 'manual'>('camera');
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<CameraErrorInfo | null>(null);
  const [manualQuery, setManualQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Scan result confirmation
  const [lastScanResult, setLastScanResult] = useState<{
    success: boolean;
    mode: 'IN' | 'OUT';
    invitee?: Invitee;
    record?: EventAttendanceRecord;
    message: string;
    timestamp: string;
  } | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'aimplb-qr-reader-viewport';
  const isHandlingScanRef = useRef(false);
  const lastScannedCodeRef = useRef<string>('');
  const lastScannedTimeRef = useRef<number>(0);

  // Sync mode when modal opens
  useEffect(() => {
    if (isOpen) {
      setScanMode(initialMode);
      setLastScanResult(null);
      setCameraError(null);
      isHandlingScanRef.current = false;
      lastScannedCodeRef.current = '';
    }
  }, [isOpen, initialMode]);

  // Audio Beep generator using Web Audio API
  const playBeep = useCallback((type: 'success' | 'error') => {
    if (!soundEnabled) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtxClass) return;
      const audioCtx = new AudioCtxClass();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'success') {
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1320, audioCtx.currentTime + 0.15); // E6
        gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.18);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.2);
      } else {
        osc.frequency.setValueAtTime(300, audioCtx.currentTime);
        osc.frequency.setValueAtTime(200, audioCtx.currentTime + 0.12);
        gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.26);
      }
    } catch {
      // Audio not supported or blocked
    }
  }, [soundEnabled]);

  // Check if browser origin satisfies secure context requirements
  const checkIsSecureOrigin = (): boolean => {
    if (typeof window === 'undefined') return true;
    if (window.isSecureContext) return true;
    if (window.location.protocol === 'https:') return true;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') return true;
    return false;
  };

  // Initialize and Stop HTML5 Camera Scanner
  const stopCamera = useCallback(async () => {
    // 1. Explicitly terminate any active MediaStream tracks on video elements in container
    try {
      const container = document.getElementById(scannerContainerId);
      if (container) {
        const videoEls = container.querySelectorAll('video');
        videoEls.forEach((v) => {
          if (v.srcObject instanceof MediaStream) {
            v.srcObject.getTracks().forEach((track) => {
              try {
                track.stop();
              } catch (_) {}
            });
            v.srcObject = null;
          }
        });
      }
    } catch (_) {}

    // 2. Stop and clear HTML5 scanner instance
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (err) {
        console.warn('Error stopping scanner:', err);
      } finally {
        scannerRef.current = null;
        setIsScanning(false);
      }
    }
  }, []);

  // Handle Token / Identification & Execution
  const processToken = useCallback(
    async (tokenOrCode: string, inputMethod: 'QR_CAMERA' | 'MANUAL_SEARCH' = 'QR_CAMERA') => {
      if (!currentUser || isProcessing) return;
      setIsProcessing(true);

      try {
        // 1. Identify Invitee by token or category code
        let invitee = await getInviteeByQrToken(tokenOrCode);
        if (!invitee) {
          invitee = await getInviteeByCode(tokenOrCode);
        }

        if (!invitee) {
          // Fallback search by phone number or raw ID
          const all = await getInvitees();
          const cleanInput = tokenOrCode.replace(/\D/g, '');
          if (cleanInput.length >= 6) {
            invitee = all.find((i) => i.phone.replace(/\D/g, '').includes(cleanInput)) || null;
          }
          if (!invitee) {
            invitee = all.find((i) => i.id === tokenOrCode) || null;
          }
        }

        if (!invitee) {
          throw new Error(`Unrecognized QR Code / Token: "${tokenOrCode.slice(0, 25)}". Delegate record not found in system.`);
        }

        // 2. Perform either SCAN IN or SCAN OUT
        let record: EventAttendanceRecord;
        if (scanMode === 'IN') {
          record = await recordEventEntry(invitee.id, currentUser, undefined, undefined, inputMethod);
        } else {
          record = await recordEventExit(invitee.id, currentUser, undefined, inputMethod);
        }

        playBeep('success');
        const result = {
          success: true,
          mode: scanMode,
          invitee,
          record,
          message:
            scanMode === 'IN'
              ? `Check-in Verified: ${invitee.full_name} (${invitee.invitee_code}) is now INSIDE the venue.`
              : `Exit Confirmed: ${invitee.full_name} (${invitee.invitee_code}) is now OUT.`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        };
        setLastScanResult(result);
        onScanComplete?.(invitee, record, scanMode);

        // Immediately stop camera tracks and close scanner modal on success
        await stopCamera();
        onClose();
      } catch (err: any) {
        playBeep('error');
        setLastScanResult({
          success: false,
          mode: scanMode,
          message: err.message || 'Operation failed. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        });
        isHandlingScanRef.current = false;
      } finally {
        setIsProcessing(false);
      }
    },
    [currentUser, isProcessing, scanMode, playBeep, onScanComplete, stopCamera, onClose]
  );

  const parseAndSetCameraError = useCallback((err: any) => {
    const errName = err?.name || '';
    const errMsg = (err?.message || '').toLowerCase();

    if (
      errName === 'NotAllowedError' ||
      errName === 'PermissionDeniedError' ||
      errMsg.includes('permission') ||
      errMsg.includes('denied')
    ) {
      setCameraError({
        type: 'PERMISSION_DENIED',
        title: 'Camera Permission Denied',
        message:
          'Camera permission was denied. Tap the lock or tune icon in your mobile browser address bar to allow camera access, then tap Retry.',
        canRetry: true,
      });
    } else if (
      errName === 'NotFoundError' ||
      errName === 'DevicesNotFoundError' ||
      errMsg.includes('not found') ||
      errMsg.includes('no camera')
    ) {
      setCameraError({
        type: 'NOT_FOUND',
        title: 'No Camera Detected',
        message: 'No physical camera hardware was found on this device. Please use the Manual ID / Phone Lookup below.',
        canRetry: false,
      });
    } else if (
      errName === 'NotReadableError' ||
      errName === 'TrackStartError' ||
      errMsg.includes('in use') ||
      errMsg.includes('could not start')
    ) {
      setCameraError({
        type: 'IN_USE',
        title: 'Camera In Use / Hardware Busy',
        message: 'The camera is currently in use by another application or tab. Please close other camera apps and tap Retry.',
        canRetry: true,
      });
    } else if (!checkIsSecureOrigin()) {
      setCameraError({
        type: 'INSECURE_CONNECTION',
        title: 'HTTPS Required for Camera Access',
        message: `Mobile browsers strictly disable camera access over insecure HTTP (${window.location.origin}). Please switch to HTTPS or use Manual Search below.`,
        canSwitchHttps: true,
        canRetry: false,
      });
    } else {
      setCameraError({
        type: 'GENERAL_ERROR',
        title: 'Camera Initialization Error',
        message: err?.message || 'Unable to start camera stream. Please check permissions or use Manual Lookup.',
        canRetry: true,
      });
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (!isOpen || activeTab !== 'camera') return;
    await stopCamera();
    setCameraError(null);

    // 1. Verify Origin Security
    if (!checkIsSecureOrigin()) {
      setCameraError({
        type: 'INSECURE_CONNECTION',
        title: 'HTTPS Required for Mobile Camera',
        message: `Mobile browsers (Chrome / Safari) strictly block camera access over unencrypted HTTP (${window.location.origin}). Please switch to HTTPS or use the Manual ID / Phone Lookup below.`,
        canSwitchHttps: true,
        canRetry: false,
      });
      return;
    }

    // 2. Verify MediaDevices API availability
    if (!navigator?.mediaDevices || !navigator?.mediaDevices?.getUserMedia) {
      setCameraError({
        type: 'NOT_FOUND',
        title: 'Camera API Not Supported',
        message: 'Your browser does not support the camera MediaDevices API. Please update your browser or use Manual Lookup.',
        canRetry: false,
      });
      return;
    }

    // 3. Wait for DOM container
    await new Promise((r) => setTimeout(r, 150));
    const container = document.getElementById(scannerContainerId);
    if (!container) return;

    try {
      const html5QrCode = new Html5Qrcode(scannerContainerId, {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false,
      });
      scannerRef.current = html5QrCode;

      // Responsive scanning viewport size
      const scanConfig = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          const edgeSize = Math.max(180, Math.floor(minEdge * 0.72));
          return { width: edgeSize, height: edgeSize };
        },
        aspectRatio: 1.0,
      };

      const handleDecoded = async (decodedText: string) => {
        const trimmed = decodedText.trim();
        if (!trimmed) return;
        const now = Date.now();
        // Prevent duplicate immediate scans of the same code within 3 seconds
        if (lastScannedCodeRef.current === trimmed && now - lastScannedTimeRef.current < 3000) {
          return;
        }
        if (isHandlingScanRef.current || isProcessing) return;
        isHandlingScanRef.current = true;
        lastScannedCodeRef.current = trimmed;
        lastScannedTimeRef.current = now;

        // 1. Immediately stop the camera and release media tracks
        await stopCamera();

        // 2. Process attendance against database
        await processToken(trimmed, 'QR_CAMERA');
      };

      // Try rear camera first (facingMode: 'environment')
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          scanConfig,
          handleDecoded,
          () => {
            // Frame decode misses are normal while seeking QR
          }
        );
        setIsScanning(true);
      } catch (firstErr: any) {
        console.warn('Primary environment facingMode start failed, trying camera enumeration fallback...', firstErr);
        // Fallback to camera device enumeration
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const backCam = cameras.find((c) => /back|rear|environment|world/i.test(c.label));
          const targetCamId = backCam ? backCam.id : (cameras.length > 1 ? cameras[cameras.length - 1].id : cameras[0].id);
          await html5QrCode.start(targetCamId, scanConfig, handleDecoded, () => {});
          setIsScanning(true);
        } else {
          // Fallback to user facing
          await html5QrCode.start({ facingMode: 'user' }, scanConfig, handleDecoded, () => {});
          setIsScanning(true);
        }
      }
    } catch (err: any) {
      console.warn('Camera startup failed:', err);
      parseAndSetCameraError(err);
      setIsScanning(false);
    }
  }, [isOpen, activeTab, stopCamera, isProcessing, processToken, parseAndSetCameraError]);

  // Manage scanner lifecycle with modal open state
  useEffect(() => {
    if (isOpen && activeTab === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, startCamera, stopCamera]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualQuery.trim()) return;
    processToken(manualQuery.trim(), 'MANUAL_SEARCH');
    setManualQuery('');
  };

  const getCategoryStatusVariant = (cat: string) => {
    switch (cat) {
      case 'Founder Members':
        return 'founder';
      case 'Special Invitees':
        return 'special';
      default:
        return 'general';
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={() => {
        stopCamera();
        onClose();
      }}
      title=""
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Modal Header & Dual Scan Mode Toggle */}
        <div className="flex flex-col gap-3 pb-3 border-b border-[#F4F6F4]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className={`p-2 rounded-xl text-white shadow-xs ${
                  scanMode === 'IN' ? 'bg-[#164734]' : 'bg-amber-600'
                }`}
              >
                {scanMode === 'IN' ? <LogIn className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-base font-bold text-[#1A221E] flex items-center gap-2">
                  <span>{scanMode === 'IN' ? 'SCAN IN (Venue Entry)' : 'SCAN OUT (Venue Exit)'}</span>
                </h2>
                <p className="text-xs text-[#69756F]">Gate movement scanner • 30th Annual Session</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                title={soundEnabled ? 'Mute Audio Beep' : 'Unmute Audio Beep'}
                className="p-2 text-[#69756F] hover:text-[#164734] hover:bg-[#FAF9F6] rounded-lg transition-colors"
              >
                {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4 text-gray-400" />}
              </button>
            </div>
          </div>

          {/* Prominent Dual Mode Selector */}
          <div className="grid grid-cols-2 p-1 bg-[#FAF9F6] rounded-xl border border-[#E3E7E4] gap-1 select-none">
            <button
              type="button"
              onClick={() => {
                setScanMode('IN');
                setLastScanResult(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                scanMode === 'IN'
                  ? 'bg-[#164734] text-white shadow-xs scale-[1.01]'
                  : 'text-[#69756F] hover:text-[#1A221E] hover:bg-white/50'
              }`}
            >
              <LogIn className="h-4 w-4" />
              <span>1. SCAN IN (Entry)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setScanMode('OUT');
                setLastScanResult(null);
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                scanMode === 'OUT'
                  ? 'bg-amber-600 text-white shadow-xs scale-[1.01]'
                  : 'text-[#69756F] hover:text-[#1A221E] hover:bg-white/50'
              }`}
            >
              <LogOut className="h-4 w-4" />
              <span>2. SCAN OUT (Exit)</span>
            </button>
          </div>
        </div>

        {/* Tab Selector: Camera vs Manual Search */}
        <div className="flex items-center gap-2 border-b border-[#E3E7E4] text-xs font-medium">
          <button
            type="button"
            onClick={() => {
              setActiveTab('camera');
              setCameraError(null);
            }}
            className={`pb-2 px-2 flex items-center gap-1.5 transition-colors border-b-2 font-semibold ${
              activeTab === 'camera'
                ? 'border-[#164734] text-[#164734]'
                : 'border-transparent text-[#69756F] hover:text-[#1A221E]'
            }`}
          >
            <Camera className="h-3.5 w-3.5" />
            <span>Camera Scanner</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('manual');
              stopCamera();
            }}
            className={`pb-2 px-2 flex items-center gap-1.5 transition-colors border-b-2 font-semibold ${
              activeTab === 'manual'
                ? 'border-[#164734] text-[#164734]'
                : 'border-transparent text-[#69756F] hover:text-[#1A221E]'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span>Manual ID / Phone Lookup</span>
          </button>
        </div>

        {/* 1. Camera Viewport */}
        {activeTab === 'camera' && (
          <div className="space-y-3">
            <div className="relative rounded-2xl overflow-hidden bg-black aspect-square max-h-[300px] w-full flex items-center justify-center border-2 border-[#164734]/20 shadow-inner">
              <div id={scannerContainerId} className="w-full h-full" />

              {/* Viewfinder Target Reticle Overlay */}
              {isScanning && !cameraError && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center z-10">
                  <div className="relative w-48 h-48 border-2 border-dashed border-emerald-400/40 rounded-2xl flex items-center justify-center">
                    {/* Corner Reticles */}
                    <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
                    <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
                    <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

                    {/* Animated Scan Beam */}
                    <div className="absolute inset-x-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-pulse shadow-[0_0_8px_#10B981]" />
                  </div>
                  <span className="text-[11px] text-white/90 bg-black/60 px-3 py-1 rounded-full mt-3 backdrop-blur-xs font-medium">
                    Align Delegate QR Code inside frame
                  </span>
                </div>
              )}

              {/* Camera Starting Spinner */}
              {!isScanning && !cameraError && !isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white p-4 text-center z-10">
                  <RefreshCw className="h-8 w-8 animate-spin text-emerald-400 mb-2" />
                  <p className="text-xs font-semibold">Starting camera feed...</p>
                  <p className="text-[11px] text-gray-400 mt-1">Requesting camera permissions...</p>
                </div>
              )}

              {/* Processing Overlay when saving attendance */}
              {isProcessing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-white p-4 text-center z-30 animate-fade-in">
                  <RefreshCw className="h-9 w-9 animate-spin text-emerald-400 mb-2.5" />
                  <p className="text-sm font-bold text-white">Recording Attendance...</p>
                  <p className="text-xs text-emerald-300 mt-1">
                    {scanMode === 'IN' ? 'Verifying Venue Entry Check-in' : 'Recording Venue Exit Checkout'}
                  </p>
                </div>
              )}

              {/* Granular Camera Error Card */}
              {cameraError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 text-white p-6 text-center space-y-3 z-20">
                  <div className="p-3 bg-white/10 rounded-full mb-1">
                    {cameraError.type === 'INSECURE_CONNECTION' ? (
                      <ShieldAlert className="h-8 w-8 text-amber-400" />
                    ) : cameraError.type === 'PERMISSION_DENIED' ? (
                      <Lock className="h-8 w-8 text-amber-400" />
                    ) : cameraError.type === 'NOT_FOUND' ? (
                      <CameraOff className="h-8 w-8 text-red-400" />
                    ) : (
                      <AlertTriangle className="h-8 w-8 text-amber-400" />
                    )}
                  </div>
                  <h3 className="text-sm font-bold text-white">{cameraError.title}</h3>
                  <p className="text-xs text-gray-300 max-w-xs leading-relaxed">{cameraError.message}</p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                    {cameraError.canSwitchHttps && (
                      <Button
                        size="sm"
                        onClick={() => {
                          window.location.href = window.location.href.replace('http:', 'https:');
                        }}
                        className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-xs"
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1" />
                        <span>Switch to HTTPS</span>
                      </Button>
                    )}
                    {cameraError.canRetry && (
                      <Button
                        size="sm"
                        onClick={() => startCamera()}
                        className="text-xs bg-[#164734] hover:bg-[#123829] text-white font-semibold shadow-xs"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        <span>Retry Camera</span>
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setActiveTab('manual');
                        stopCamera();
                      }}
                      className="text-xs bg-white/10 hover:bg-white/20 text-white border-white/20"
                    >
                      <Search className="h-3.5 w-3.5 mr-1" />
                      <span>Use Manual Lookup</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[11px] text-[#69756F] text-center">
              Align invitee ID card QR code within camera frame. Scans automatically using rear camera.
            </p>
          </div>
        )}

        {/* 2. Manual Search Fallback */}
        {activeTab === 'manual' && (
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#1A221E] mb-1.5">
                Delegate Category ID, Phone Number or QR Token
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={manualQuery}
                  onChange={(e) => setManualQuery(e.target.value)}
                  placeholder="e.g. AIM-F-001, AIM-G-002, or 9848012345"
                  className="flex-1 h-10 rounded-lg border border-[#E3E7E4] px-3 text-sm text-[#1A221E] font-medium focus:outline-none focus:ring-2 focus:ring-[#164734]/20 focus:border-[#164734]"
                  autoFocus
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={!manualQuery.trim() || isProcessing}
                  isLoading={isProcessing}
                  className={`h-10 px-4 text-xs font-bold text-white shadow-xs ${
                    scanMode === 'IN' ? 'bg-[#164734] hover:bg-[#123829]' : 'bg-amber-600 hover:bg-amber-700'
                  }`}
                >
                  {scanMode === 'IN' ? 'Process IN' : 'Process OUT'}
                </Button>
              </div>
            </div>
            <p className="text-[11px] text-[#69756F]">
              Accepts Category ID (AIM-F-###), secure QR token, or 10-digit registered phone number.
            </p>
          </form>
        )}

        {/* Scan Confirmation / Status Card */}
        {lastScanResult && (
          <div
            className={`p-3.5 rounded-xl border animate-fade-in ${
              lastScanResult.success
                ? 'bg-[#E8F1EC] border-[#C5DEC8] text-[#164734]'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            <div className="flex items-start gap-3">
              {lastScanResult.success ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs uppercase tracking-wider">
                    {lastScanResult.success
                      ? lastScanResult.mode === 'IN'
                        ? 'Checked IN Successfully'
                        : 'Checked OUT Successfully'
                      : 'Scan Rejected'}
                  </span>
                  <span className="text-[10px] font-mono text-[#69756F]">{lastScanResult.timestamp}</span>
                </div>

                {lastScanResult.invitee && (
                  <div className="mt-2 pt-2 border-t border-[#C5DEC8] space-y-1 text-xs">
                    <div className="flex items-center justify-between flex-wrap gap-1">
                      <span className="font-bold text-sm text-[#1A221E]">
                        {lastScanResult.invitee.full_name}
                      </span>
                      <span className="font-mono font-bold text-xs bg-white px-2 py-0.5 rounded border border-[#C5DEC8]">
                        {lastScanResult.invitee.invitee_code}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#526058] flex-wrap">
                      <StatusBadge
                        variant={getCategoryStatusVariant(lastScanResult.invitee.category)}
                        label={lastScanResult.invitee.category}
                        size="sm"
                      />
                      <span>•</span>
                      <span>
                        {lastScanResult.invitee.city}, {lastScanResult.invitee.state}
                      </span>
                    </div>

                    <div className="text-[10px] text-[#69756F] pt-1">
                      Scanned by volunteer: <strong>{currentUser?.full_name}</strong>
                    </div>
                  </div>
                )}

                <p className="mt-1.5 text-xs font-medium leading-relaxed">{lastScanResult.message}</p>

                {!lastScanResult.success && (
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Button
                      size="sm"
                      type="button"
                      onClick={() => {
                        setLastScanResult(null);
                        isHandlingScanRef.current = false;
                        startCamera();
                      }}
                      className="text-xs bg-red-700 hover:bg-red-800 text-white font-semibold h-8 shadow-xs"
                    >
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />
                      <span>Retry Camera</span>
                    </Button>
                    <Button
                      size="sm"
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setActiveTab('manual');
                        setLastScanResult(null);
                      }}
                      className="text-xs border-red-200 text-red-800 hover:bg-red-100 h-8"
                    >
                      <Search className="h-3.5 w-3.5 mr-1" />
                      <span>Manual Lookup</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="pt-3 border-t border-[#F4F6F4] flex justify-between items-center">
          <span className="text-[11px] text-[#69756F]">
            Volunteer: <strong>{currentUser?.full_name?.split('(')[0].trim()}</strong>
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="text-xs h-9"
          >
            Close Scanner
          </Button>
        </div>
      </div>
    </Dialog>
  );
};
