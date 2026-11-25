import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Shown instead of the broken part. Give the boundary a new `key` to try again. */
  fallback: ReactNode;
}

/** Keeps one broken part from turning the whole page white. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, { failed: boolean }> {
  declare readonly props: Readonly<ErrorBoundaryProps>;

  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Lỗi hiển thị:', error, info.componentStack);
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
