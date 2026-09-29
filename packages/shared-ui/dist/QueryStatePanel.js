import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import "./QueryStatePanel.css";
import { Button } from "./Button";
import { EmptyState } from "./EmptyState";
function Bone({ className = "", style }) {
    return _jsx("div", { className: `ceg-query-bone ${className}`.trim(), style: style, "aria-hidden": "true" });
}
function Boneyard({ variant }) {
    if (variant === "inline") {
        return (_jsxs("div", { className: "ceg-query-boneyard ceg-query-boneyard--inline", "aria-hidden": "true", children: [_jsx(Bone, { style: { height: 14, width: "38%" } }), _jsx(Bone, { className: "ceg-query-skeleton__row", style: { height: 36 } }), _jsx(Bone, { className: "ceg-query-skeleton__row", style: { height: 36 } })] }));
    }
    if (variant === "page") {
        return (_jsxs("div", { className: "ceg-query-boneyard ceg-query-boneyard--page", "aria-hidden": "true", children: [_jsx("div", { className: "ceg-query-boneyard__kpis", children: [1, 2, 3, 4].map((i) => (_jsx(Bone, { className: "ceg-query-bone--kpi" }, i))) }), _jsxs("div", { className: "ceg-query-boneyard__panels", children: [_jsx(Bone, { className: "ceg-query-bone--panel" }), _jsx(Bone, { className: "ceg-query-bone--panel" })] })] }));
    }
    return (_jsxs("div", { className: "ceg-query-boneyard ceg-query-boneyard--table", "aria-hidden": "true", children: [_jsxs("div", { className: "ceg-query-boneyard__toolbar", children: [_jsx(Bone, { style: { height: 32, width: 160 } }), _jsx(Bone, { style: { height: 32, width: 96 } })] }), [1, 2, 3, 4, 5, 6].map((i) => (_jsx(Bone, { className: "ceg-query-skeleton__row", style: { height: i === 1 ? 40 : 36 } }, i)))] }));
}
/**
 * Unified loading / error / empty wrapper for admin list queries (PS-DS-002).
 * Promoted from QuizForge — use instead of toast-only error flashes.
 */
export function QueryStatePanel({ loading = false, error = false, empty = false, useCard = true, loadingText = "Loading data…", errorText = "Something went wrong while loading this section.", errorDetail, emptyTitle = "Nothing to show yet", emptyDescription, emptyIcon, emptyActionLabel, onEmptyAction, onRetry, loadingVariant = "table", children, }) {
    const wrap = (content) => useCard ? _jsx("div", { className: "ceg-query-panel", children: content }) : _jsx(_Fragment, { children: content });
    if (loading) {
        const content = (_jsxs("div", { "aria-live": "polite", role: "status", children: [_jsx("span", { className: "ceg-query-panel__sr-only", children: loadingText }), _jsx(Boneyard, { variant: loadingVariant })] }));
        return loadingVariant === "page" ? content : wrap(content);
    }
    if (error) {
        return wrap(_jsxs("div", { className: "ceg-query-panel__center", children: [_jsx("p", { className: "ceg-query-panel__message", children: errorText }), errorDetail ? (_jsx("p", { className: "ceg-query-panel__detail", "aria-label": "Support reference", children: errorDetail })) : null, onRetry ? (_jsx(Button, { size: "sm", variant: "secondary", onClick: onRetry, children: "Retry" })) : null] }));
    }
    if (empty) {
        return wrap(_jsx(EmptyState, { icon: emptyIcon, title: emptyTitle, description: emptyDescription, actionLabel: emptyActionLabel, onAction: onEmptyAction }));
    }
    return _jsx(_Fragment, { children: children });
}
//# sourceMappingURL=QueryStatePanel.js.map