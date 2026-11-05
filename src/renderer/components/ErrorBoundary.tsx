import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error('[REACT ERROR BOUNDARY]', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-3 text-red-400 bg-black/90 rounded-xl text-xs flex flex-col gap-1 items-center justify-center">
          <span className="font-semibold text-white">Something went wrong</span>
          <span className="text-[10px] text-zinc-400 font-mono text-center">
            {this.state.error?.message}
          </span>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            className="mt-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px]"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
