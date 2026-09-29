import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from 'react';
import './AdminActionDock.css';
function readExpanded(storageKey) {
    try {
        const v = localStorage.getItem(storageKey);
        if (v === '1')
            return true;
        if (v === '0')
            return false;
    }
    catch {
        /* ignore */
    }
    return false;
}
/**
 * Bottom-right expandable quick-action dock (CeG Portal pattern).
 * Actions expand on hover to show labels.
 */
export function AdminActionDock({ actions, storageKey = 'ceg_admin_action_dock_expanded', ariaLabel = 'Quick actions', className = '', forceCollapsed = false, toggleDataTour, }) {
    const [expanded, setExpanded] = useState(() => readExpanded(storageKey));
    const panelExpanded = expanded && !forceCollapsed;
    const panelRef = useRef(null);
    const toggleRef = useRef(null);
    useEffect(() => {
        if (panelExpanded)
            return;
        const panel = panelRef.current;
        const active = document.activeElement;
        if (panel && active instanceof HTMLElement && panel.contains(active)) {
            toggleRef.current?.focus();
        }
    }, [panelExpanded]);
    const toggle = useCallback(() => {
        setExpanded((e) => {
            const next = !e;
            try {
                localStorage.setItem(storageKey, next ? '1' : '0');
            }
            catch {
                /* ignore */
            }
            return next;
        });
    }, [storageKey]);
    return (_jsxs("div", { className: `ceg-admin-dock ${className}`.trim(), role: "group", "aria-label": ariaLabel, children: [_jsx("div", { ref: panelRef, className: `ceg-admin-dock__actions-panel${panelExpanded ? ' is-expanded' : ''}`, "aria-hidden": panelExpanded ? undefined : true, children: _jsx("div", { className: "ceg-admin-dock__actions-inner", children: _jsx("div", { className: "ceg-admin-dock__actions", children: actions.map((action) => (_jsxs("button", { type: "button", className: `ceg-admin-dock__action${action.tone === 'warning'
                                ? ' ceg-admin-dock__action--warning'
                                : action.tone === 'success'
                                    ? ' ceg-admin-dock__action--success'
                                    : ''}${action.className ? ` ${action.className}` : ''}`, onClick: action.onClick, disabled: action.disabled, "aria-label": action.label, tabIndex: panelExpanded ? 0 : -1, children: [_jsxs("span", { className: "ceg-admin-dock__action-icon", children: [action.icon, action.badge != null && action.badge > 0 ? (_jsx("span", { className: "ceg-admin-dock__badge", "aria-hidden": true, children: action.badge > 99 ? '99+' : action.badge })) : null] }), _jsxs("span", { className: "ceg-admin-dock__label-wrap", children: [action.label, action.subtitle ? (_jsx("span", { className: "ceg-admin-dock__subtitle", children: action.subtitle })) : null] })] }, action.id))) }) }) }), _jsx("button", { ref: toggleRef, type: "button", className: "ceg-admin-dock__toggle", onClick: toggle, "aria-expanded": panelExpanded, "aria-label": panelExpanded ? 'Collapse quick actions' : 'Expand quick actions', ...(toggleDataTour ? { 'data-tour': toggleDataTour } : {}), children: _jsx("span", { className: "ceg-admin-dock__toggle-icon", children: _jsx("svg", { width: "20", height: "20", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", "aria-hidden": true, children: _jsx("path", { d: "M12 19V5M5 12l7-7 7 7", strokeLinecap: "round", strokeLinejoin: "round" }) }) }) })] }));
}
//# sourceMappingURL=AdminActionDock.js.map