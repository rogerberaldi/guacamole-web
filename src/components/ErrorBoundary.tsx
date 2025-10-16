import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-6">
          <div className="max-w-2xl w-full bg-neutral-800 rounded-lg shadow-xl p-8">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Application Error</h1>
                <p className="text-neutral-400">
                  Something went wrong with the remote desktop connection
                </p>
              </div>
            </div>

            {this.state.error && (
              <div className="bg-neutral-900 rounded-lg p-4 mb-4">
                <h2 className="text-sm font-semibold text-red-400 mb-2">Error Message</h2>
                <p className="text-white font-mono text-sm">{this.state.error.toString()}</p>
              </div>
            )}

            {this.state.errorInfo && (
              <details className="bg-neutral-900 rounded-lg p-4">
                <summary className="text-sm font-semibold text-neutral-300 cursor-pointer">
                  Technical Details
                </summary>
                <pre className="mt-4 text-xs text-neutral-400 overflow-auto">
                  {this.state.errorInfo.componentStack}
                </pre>
              </details>
            )}

            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
