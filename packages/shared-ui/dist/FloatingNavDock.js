import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, } from 'framer-motion';
import './FloatingNavDock.css';
const DOCK_SPRING = { mass: 0.12, stiffness: 140, damping: 14 };
function DockItem({ item, mouseX, onNavigate, }) {
    const ref = useRef(null);
    const distance = useTransform(mouseX, (val) => {
        const el = ref.current;
        if (!el || val === Infinity)
            return Infinity;
        const rect = el.getBoundingClientRect();
        return val - rect.x - rect.width / 2;
    });
    const sizeSync = useTransform(distance, [-120, 0, 120], [40, 56, 40]);
    const size = useSpring(sizeSync, DOCK_SPRING);
    const className = `ceg-floating-nav-dock__item${item.active ? ' ceg-floating-nav-dock__item--active' : ''}`;
    const content = (_jsxs(_Fragment, { children: [_jsx(motion.span, { className: "ceg-floating-nav-dock__icon-wrap", style: { width: size, height: size }, children: item.icon }), _jsx("span", { className: "ceg-floating-nav-dock__label", children: item.title })] }));
    if (item.href) {
        return (_jsx("div", { ref: ref, className: className, children: _jsx("a", { href: item.href, title: item.title, "aria-label": item.title, "aria-current": item.active ? 'page' : undefined, onClick: (e) => {
                    if (item.onClick) {
                        e.preventDefault();
                        onNavigate(item);
                    }
                }, children: content }) }));
    }
    return (_jsx("div", { ref: ref, className: className, children: _jsx("button", { type: "button", title: item.title, "aria-label": item.title, "aria-current": item.active ? 'page' : undefined, onClick: () => onNavigate(item), children: content }) }));
}
/**
 * Bottom-center floating nav with magnifying icons on hover (Aceternity Floating Dock pattern).
 * Complements {@link AdminActionDock} which is a bottom-right expandable quick-action panel.
 */
export function FloatingNavDock({ items, className = '', ariaLabel = 'Quick navigation', bottom = 24, }) {
    const mouseX = useMotionValue(Infinity);
    const onNavigate = (item) => {
        item.onClick?.();
    };
    if (items.length === 0)
        return null;
    return (_jsx("nav", { className: `ceg-floating-nav-dock ${className}`.trim(), style: { bottom }, "aria-label": ariaLabel, onMouseMove: (e) => mouseX.set(e.pageX), onMouseLeave: () => mouseX.set(Infinity), children: items.map((item) => (_jsx(DockItem, { item: item, mouseX: mouseX, onNavigate: onNavigate }, item.id))) }));
}
//# sourceMappingURL=FloatingNavDock.js.map