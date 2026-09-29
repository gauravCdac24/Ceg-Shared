import * as React from "react";
export type ErrorBoundaryProps = {
    children: React.ReactNode;
    /** Custom fallback UI. Receives the error and a reset callback. */
    fallback?: (error: Error, reset: () => void) => React.ReactNode;
    title?: React.ReactNode;
    description?: React.ReactNode;
    onError?: (error: Error, info: React.ErrorInfo) => void;
};
type ErrorBoundaryState = {
    error: Error | null;
};
export declare class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState;
    static getDerivedStateFromError(error: Error): ErrorBoundaryState;
    componentDidCatch(error: Error, info: React.ErrorInfo): void;
    reset: () => void;
    render(): string | number | boolean | import("react/jsx-runtime").JSX.Element | Iterable<React.ReactNode> | null | undefined;
}
export {};
//# sourceMappingURL=ErrorBoundary.d.ts.map