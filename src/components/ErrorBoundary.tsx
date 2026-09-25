import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, ChevronDown, ChevronUp, ShieldAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  showDetails: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    showDetails: false,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[EBS ErrorBoundary] Uncaught React exception caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleRefresh = () => {
    window.location.reload();
  };

  private handleClearCacheAndReset = () => {
    try {
      // Clear session/auth keys that may be corrupted, while preserving offline transaction queues
      const keysToClear = [
        'ebs_tanzania_data_v1_1_current_user',
        'ebs_tanzania_data_v1_1_is_authenticated',
        'ebs_tanzania_data_v1_1_is_locked',
        'ebs_tanzania_data_v1_1_sessions',
        'ebs_local_device_info_v13',
        'ebs_superadmin_user',
        'ebs_superadmin_token'
      ];
      for (const k of keysToClear) {
        localStorage.removeItem(k);
      }
      sessionStorage.clear();
    } catch (e) {
      console.warn('Error clearing storage:', e);
    }
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      const errorMsg = this.state.error?.message || 'Hitilafu isiyojulikana (Unknown Error)';
      const errorStack = this.state.error?.stack || this.state.errorInfo?.componentStack || '';

      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 sm:p-6 font-sans antialiased selection:bg-emerald-500 selection:text-white">
          <div className="w-full max-w-xl bg-slate-900 border border-rose-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
            {/* Background Glow */}
            <div className="absolute -top-24 -left-24 w-60 h-60 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -right-24 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-6 h-6 animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-black uppercase tracking-wider text-rose-400">
                    Hitilafu ya Mfumo • EBS Tanzania
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black text-white mt-1">
                  Kuna tatizo, bofya kusasisha
                </h1>
                <p className="text-xs sm:text-sm text-slate-300 mt-1.5 leading-relaxed">
                  Mfumo umekumbana na hitilafu wakati wa kupakia data au muonekano. 
                  Data zako za mauzo na biashara ziko salama. Tafadhali bofya kitufe cha kusasisha hapa chini.
                </p>
              </div>
            </div>

            {/* Error Message Snippet */}
            <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-2xl mb-6 font-mono text-xs text-rose-300 break-words flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="overflow-hidden">
                <span className="text-slate-400 font-bold block mb-0.5">Ujumbe wa Hitilafu:</span>
                <code>{errorMsg}</code>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <button
                onClick={this.handleRefresh}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Bofya Kusasisha (Refresh App)</span>
              </button>

              <button
                onClick={this.handleClearCacheAndReset}
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition active:scale-95"
              >
                <Trash2 className="w-4 h-4 text-amber-400" />
                <span>Anza Upya (Reset Session)</span>
              </button>
            </div>

            {/* Technical Details Toggle */}
            <div className="mt-6 pt-4 border-t border-slate-800/80">
              <button
                onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                className="text-[11px] font-bold text-slate-400 hover:text-slate-200 flex items-center gap-1.5 transition"
              >
                <span>{this.state.showDetails ? 'Ficha maelezo ya kiufundi' : 'Angalia maelezo ya kiufundi (Technical Details)'}</span>
                {this.state.showDetails ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {this.state.showDetails && (
                <div className="mt-3 p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-[10px] text-slate-400 max-h-48 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {errorStack || errorMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
