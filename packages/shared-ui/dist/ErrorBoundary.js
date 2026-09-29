import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { uiCopy } from "./copy";
import { Button } from "./Button";
export class ErrorBoundary extends React.Component {
    state = { error: null };
    static getDerivedStateFromError(error) {
        return { error };
    }
    componentDidCatch(error, info) {
        this.props.onError?.(error, info);
    }
    reset = () => {
        this.setState({ error: null });
    };
    render() {
        const { error } = this.state;
        if (!error)
            return this.props.children;
        if (this.props.fallback) {
            return this.props.fallback(error, this.reset);
        }
        const title = this.props.title ?? uiCopy.errorBoundary.title;
        const description = this.props.description ?? uiCopy.errorBoundary.description;
        return (_jsxs("section", { className: "ceg-error-boundary", role: "alert", children: [_jsx("h2", { className: "ceg-error-boundary__title", children: title }), _jsx("p", { className: "ceg-error-boundary__description", children: description }), _jsx(Button, { variant: "secondary", onClick: this.reset, children: uiCopy.errorBoundary.retry })] }));
    }
}
//# sourceMappingURL=ErrorBoundary.js.map