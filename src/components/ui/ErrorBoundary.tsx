"use client";

import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App render error", {
      message: error.message,
      componentStack: errorInfo.componentStack,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4">
          <div className="w-full rounded-2xl border border-border bg-surface p-6 text-center shadow-soft sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">
              Something went wrong
            </p>
            <h1 className="mt-4 text-2xl font-semibold text-foreground">
              We could not load this view.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted">
              Please try again. If this keeps happening, contact support.
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false })}
              className="mt-6 inline-flex rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-indigo-500 active:scale-95"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
