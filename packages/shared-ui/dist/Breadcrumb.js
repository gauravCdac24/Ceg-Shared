import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import "./Breadcrumb.css";
/**
 * Route-driven breadcrumb trail. Pass label chains from labels registry / route map.
 * Does not replace page-level "Back to…" buttons — add alongside until per-page cleanup.
 */
export function Breadcrumb({ items, linkComponent: LinkComp = "a", className, "aria-label": ariaLabel = "Breadcrumb", }) {
    if (!items.length)
        return null;
    return (_jsx("nav", { className: ["ceg-breadcrumb", className].filter(Boolean).join(" "), "aria-label": ariaLabel, children: _jsx("ol", { className: "ceg-breadcrumb__list", children: items.map((item, i) => {
                const last = i === items.length - 1;
                return (_jsxs("li", { className: "ceg-breadcrumb__item", children: [i > 0 ? (_jsx("span", { className: "ceg-breadcrumb__sep", "aria-hidden": "true", children: "/" })) : null, last || !item.href ? (_jsx("span", { className: "ceg-breadcrumb__current", "aria-current": last ? "page" : undefined, children: item.label })) : LinkComp === "a" ? (_jsx("a", { className: "ceg-breadcrumb__link", href: item.href, children: item.label })) : (_jsx(LinkComp, { className: "ceg-breadcrumb__link", to: item.href, children: item.label }))] }, `${item.label}-${i}`));
            }) }) }));
}
/** Build a trail from a flat path→label map (exact match, then longest prefix). */
export function breadcrumbTrailFromMap(pathname, map, root = { label: "Admin", href: "/admin/dashboard" }) {
    const normalized = pathname.replace(/\/+$/, "") || "/";
    const exact = map[normalized];
    if (exact) {
        return [root, { label: exact }];
    }
    let best = null;
    for (const [path, label] of Object.entries(map)) {
        if (normalized === path || normalized.startsWith(`${path}/`)) {
            if (!best || path.length > best.path.length)
                best = { path, label };
        }
    }
    if (best)
        return [root, { label: best.label }];
    return [root];
}
//# sourceMappingURL=Breadcrumb.js.map