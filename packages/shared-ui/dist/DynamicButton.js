import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AnimatePresence, motion, useReducedMotion, } from "framer-motion";
import { forwardRef, useCallback, useImperativeHandle, useLayoutEffect, useRef, useState, } from "react";
import "./DynamicButton.css";
const uiEaseOut = [0.23, 1, 0.32, 1];
function getButtonClassName({ className, variant = "primary", width, }) {
    return [
        "dynamic-btn",
        variant === "secondary" ? "dynamic-btn--secondary" : "dynamic-btn--primary",
        width === "full" ? "dynamic-btn--full" : "",
        className,
    ]
        .filter(Boolean)
        .join(" ");
}
export const DynamicButton = forwardRef(function DynamicButton({ children, className, icon, stateKey, type = "button", variant = "primary", width = "content", ...props }, forwardedRef) {
    const shouldReduceMotion = useReducedMotion();
    const buttonRef = useRef(null);
    const measureRef = useRef(null);
    const measurementSignatureRef = useRef("");
    const [measuredWidth, setMeasuredWidth] = useState(null);
    const iconKey = stateKey ?? children;
    const measurementSignature = [
        children,
        className,
        icon ? "icon" : "no-icon",
        stateKey,
        variant,
    ].join("\0");
    const shouldMeasureWidth = width === "content";
    const widthTransition = shouldReduceMotion
        ? { duration: 0 }
        : { bounce: 0, duration: 0.26, type: "spring" };
    const contentTransition = {
        duration: shouldReduceMotion ? 0.16 : 0.18,
        ease: uiEaseOut,
    };
    const contentVisible = { opacity: 1, transform: "translateY(0px)" };
    const contentInitial = shouldReduceMotion
        ? { opacity: 0, transform: "translateY(0px)" }
        : { opacity: 0, transform: "translateY(8px)" };
    const contentExit = shouldReduceMotion
        ? { opacity: 0, transform: "translateY(0px)" }
        : { opacity: 0, transform: "translateY(-8px)" };
    useImperativeHandle(forwardedRef, () => buttonRef.current);
    const syncWidth = useCallback(() => {
        const button = buttonRef.current;
        const measure = measureRef.current;
        if (!button || !measure || !shouldMeasureWidth) {
            return;
        }
        const styles = window.getComputedStyle(button);
        const horizontalPadding = Number.parseFloat(styles.paddingLeft) +
            Number.parseFloat(styles.paddingRight) +
            Number.parseFloat(styles.borderLeftWidth) +
            Number.parseFloat(styles.borderRightWidth);
        const nextWidth = Math.ceil(measure.scrollWidth + horizontalPadding);
        setMeasuredWidth((currentWidth) => currentWidth === nextWidth ? currentWidth : nextWidth);
    }, [shouldMeasureWidth]);
    useLayoutEffect(() => {
        const measure = measureRef.current;
        if (!measure || !shouldMeasureWidth) {
            setMeasuredWidth(null);
            return;
        }
        syncWidth();
        const observer = new ResizeObserver(syncWidth);
        observer.observe(measure);
        window.addEventListener("resize", syncWidth);
        return () => {
            observer.disconnect();
            window.removeEventListener("resize", syncWidth);
        };
    }, [shouldMeasureWidth, syncWidth]);
    useLayoutEffect(() => {
        if (measurementSignatureRef.current === measurementSignature) {
            return;
        }
        measurementSignatureRef.current = measurementSignature;
        syncWidth();
    }, [measurementSignature, syncWidth]);
    return (_jsxs(motion.button, { ...props, animate: width === "content" ? { width: measuredWidth ?? "auto" } : undefined, className: getButtonClassName({ className, variant, width }), initial: false, ref: buttonRef, transition: width === "content" ? { width: widthTransition } : undefined, type: type, children: [_jsxs("span", { className: "relative inline-flex items-center gap-1.5", children: [icon ? (_jsx("span", { className: "dynamic-btn__icon-slot", children: _jsx(AnimatePresence, { initial: false, mode: "popLayout", children: _jsx(motion.span, { animate: contentVisible, className: "dynamic-btn__icon-layer", exit: contentExit, initial: contentInitial, transition: contentTransition, children: icon }, iconKey) }) })) : null, _jsx("span", { className: "dynamic-btn__label-slot", children: _jsx(AnimatePresence, { initial: false, mode: "popLayout", children: _jsx(motion.span, { animate: contentVisible, className: "dynamic-btn__label-layer", exit: contentExit, initial: contentInitial, transition: contentTransition, children: children }, children) }) })] }), _jsxs("span", { "aria-hidden": "true", className: "dynamic-btn__measure", ref: measureRef, children: [icon ? _jsx("span", { className: "dynamic-btn__measure-icon", children: icon }) : null, _jsx("span", { children: children })] })] }));
});
//# sourceMappingURL=DynamicButton.js.map