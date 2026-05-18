import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle } from "lucide-react";

interface Props {
  children?: ReactNode;
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

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen w-full items-center justify-center bg-background p-4">
          <div className="flex max-w-md flex-col items-center space-y-4 text-center">
            <div className="rounded-full bg-destructive/10 p-3 text-destructive">
              <AlertCircle size={32} />
            </div>
            <h2 className="text-xl font-semibold tracking-tight">Something went wrong</h2>
            <p className="text-sm text-muted-foreground">
              An unexpected error occurred in the application workspace.
            </p>
            {this.state.error && (
              <div className="mt-4 w-full rounded-md bg-muted p-4 text-left text-xs text-muted-foreground overflow-auto">
                <code>{this.state.error.message}</code>
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Reload Workspace
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
