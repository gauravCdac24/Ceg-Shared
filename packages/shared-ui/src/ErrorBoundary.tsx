import * as React from "react";
import { uiCopy } from "./copy";
import { Button } from "./Button";

export type ErrorBoundaryProps = {
  children: React.ReactNode;
  /** Custom fallback UI. Receives the error and a reset callback. */
  fallback?: (error: Error, reset: () => void) => React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
};

type ErrorBoundaryState = { error: Error | null };

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);
  }

  reset = () => {
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    const title = this.props.title ?? uiCopy.errorBoundary.title;
    const description = this.props.description ?? uiCopy.errorBoundary.description;

    return (
      <section className="ceg-error-boundary" role="alert">
        <h2 className="ceg-error-boundary__title">{title}</h2>
        <p className="ceg-error-boundary__description">{description}</p>
        <Button variant="secondary" onClick={this.reset}>
          {uiCopy.errorBoundary.retry}
        </Button>
      </section>
    );
  }
}
