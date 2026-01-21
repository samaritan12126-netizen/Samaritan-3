import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-full bg-black text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="bg-rose-500/10 border border-rose-500/30 p-8 rounded-sm max-w-md w-full flex flex-col items-center gap-4">
            <AlertTriangle size={48} className="text-rose-500" />
            <h1 className="text-xl font-bold uppercase tracking-widest text-rose-500">System Critical Failure</h1>
            <p className="text-xs text-zinc-400 font-mono">
              The Cortex encountered an unrecoverable error. Module crash detected.
            </p>
            <div className="bg-black/50 p-4 rounded-sm border border-white/5 w-full text-left overflow-auto max-h-32">
              <code className="text-[10px] font-mono text-rose-400">
                {this.state.error?.message || "Unknown Error"}
              </code>
            </div>
            
            <div className="flex gap-4 w-full">
                <button 
                    onClick={this.handleReload}
                    className="flex-1 py-3 bg-rose-500 hover:bg-rose-600 text-white font-bold uppercase text-xs rounded-sm flex items-center justify-center gap-2"
                >
                    <RefreshCw size={14} /> Reboot System
                </button>
                <button 
                    onClick={() => window.location.href = '/'}
                    className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold uppercase text-xs rounded-sm flex items-center justify-center gap-2"
                >
                    <Home size={14} /> Safe Mode
                </button>
            </div>
          </div>
        </div>
      );
    }

    // Cast 'this' to any to avoid "Property 'props' does not exist" TS error
    return (this as any).props.children;
  }
}