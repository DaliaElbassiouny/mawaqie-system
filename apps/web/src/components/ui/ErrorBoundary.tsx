'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4 p-8">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
            <span className="text-red-400 text-xl">!</span>
          </div>
          <div className="text-center">
            <p className="text-text-primary font-medium mb-1">حدث خطأ غير متوقع</p>
            <p className="text-text-muted text-sm">Something went wrong in this section.</p>
            {this.state.error && (
              <p className="text-xs text-text-muted mt-2 font-mono opacity-60">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={this.reset}
            className="px-4 py-2 text-sm rounded-md border border-surface-border text-text-primary hover:bg-surface-hover transition-colors"
          >
            إعادة المحاولة / Retry
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
