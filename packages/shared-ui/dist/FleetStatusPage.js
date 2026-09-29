import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from "./Button";
import "./FleetStatusPage.css";
const DEFAULTS = {
    "not-found": {
        code: "404",
        title: "Page not found",
        description: "The page you're looking for doesn't exist or has been moved.",
    },
    forbidden: {
        code: "403",
        title: "Access denied",
        description: "You don't have permission to view this page.",
    },
    "server-error": {
        code: "500",
        title: "Something went wrong",
        description: "We're having trouble loading this page. Please try again in a moment.",
    },
    "session-expired": {
        code: "401",
        title: "Session expired",
        description: "Your session has ended. Sign in again to continue.",
    },
};
export function FleetStatusPage({ kind, title, description, homeHref = "/", homeLabel = "Back to home", onGoBack, backLabel = "Go back", children, }) {
    const preset = DEFAULTS[kind];
    const heading = title ?? preset.title;
    const body = description ?? preset.description;
    return (_jsxs("main", { className: "ceg-fleet-status", role: "main", children: [_jsx("p", { className: "ceg-fleet-status__code", "aria-hidden": true, children: preset.code }), _jsx("h1", { className: "ceg-fleet-status__title", children: heading }), _jsx("p", { className: "ceg-fleet-status__description", children: body }), _jsxs("div", { className: "ceg-fleet-status__actions", children: [homeHref ? (_jsx("a", { className: "ceg-btn ceg-btn--primary", href: homeHref, children: homeLabel })) : null, onGoBack ? (_jsx(Button, { variant: "secondary", type: "button", onClick: onGoBack, children: backLabel })) : null, children] })] }));
}
export function FleetNotFoundPage(props) {
    return _jsx(FleetStatusPage, { kind: "not-found", ...props });
}
export function FleetForbiddenPage(props) {
    return _jsx(FleetStatusPage, { kind: "forbidden", ...props });
}
export function FleetServerErrorPage(props) {
    return _jsx(FleetStatusPage, { kind: "server-error", ...props });
}
export function FleetSessionExpiredPage(props) {
    return _jsx(FleetStatusPage, { kind: "session-expired", ...props });
}
//# sourceMappingURL=FleetStatusPage.js.map