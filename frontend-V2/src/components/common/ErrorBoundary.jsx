import React from 'react';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground p-8">
          <div className="max-w-xl w-full bg-card border border-border rounded-xl p-8 shadow-2xl flex flex-col items-center text-center">
            <div className="text-destructive mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mx-auto">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
            </div>
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-muted-foreground mb-6">
              An unexpected error occurred in the application. Our team has been notified.
            </p>
            <div className="flex gap-4 mb-6">
              <button 
                onClick={() => window.location.reload()}
                className="bg-primary text-primary-foreground hover:opacity-90 px-6 py-2 rounded-lg font-medium transition-opacity"
              >
                Refresh Page
              </button>
              <button 
                onClick={() => {
                  window.location.href = '/';
                }}
                className="border border-border hover:bg-muted px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Go Home
              </button>
            </div>
            {import.meta.env.DEV && this.state.error && (
              <div className="mt-4 text-left w-full bg-black/40 p-4 rounded-lg overflow-auto text-xs font-mono text-red-400 max-h-64">
                <p className="font-bold mb-2">{this.state.error.toString()}</p>
                <pre className="whitespace-pre-wrap">{this.state.errorInfo?.componentStack}</pre>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children; 
  }
}
