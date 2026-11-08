import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught application error:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch {
      // Ignore storage errors
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF9F6] flex flex-col items-center justify-center p-4 text-center selection:bg-[#E8F1EC] selection:text-[#164734]">
          <div className="w-full max-w-md bg-white p-6 sm:p-8 rounded-2xl border border-[#E3E7E4] shadow-card-subtle flex flex-col items-center">
            <div className="p-3 bg-red-50 text-red-600 rounded-2xl border border-red-200 mb-4">
              <AlertTriangle className="h-8 w-8" />
            </div>
            
            <h1 className="text-xl font-bold text-[#1A221E] tracking-tight">
              Temporary Portal Display Error
            </h1>
            
            <p className="mt-2 text-xs sm:text-sm text-[#69756F] leading-relaxed">
              The portal encountered an unexpected display issue on this device. Please tap below to reload.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={this.handleReload}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#164734] text-white text-xs font-semibold hover:bg-[#123829] active:scale-[0.98] transition-all shadow-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Reload Portal
              </button>

              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-[#E3E7E4] text-[#69756F] text-xs font-semibold hover:bg-[#F4F6F4] transition-all"
              >
                Clear Cache & Home
              </button>
            </div>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <pre className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-[10px] text-left text-red-600 max-h-36 overflow-auto w-full">
                {this.state.error.toString()}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
