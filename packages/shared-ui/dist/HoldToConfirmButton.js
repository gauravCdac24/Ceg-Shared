import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState, } from 'react';
import { useReducedMotion } from 'framer-motion';
import './HoldToConfirmButton.css';
function cn(...parts) {
    return parts.filter(Boolean).join(' ');
}
function CheckIcon() {
    return (_jsx("svg", { width: "15", height: "15", viewBox: "0 0 256 256", fill: "currentColor", "aria-hidden": "true", children: _jsx("path", { d: "M128 24a104 104 0 1 0 104 104A104.11 104.11 0 0 0 128 24Zm45.66 85.66-56 56a8 8 0 0 1-11.32 0l-24-24a8 8 0 0 1 11.32-11.32L116 148.69l50.34-50.35a8 8 0 0 1 11.32 11.32Z" }) }));
}
export function HoldToConfirmButton({ children = 'Hold to confirm', className, confirmedContent, compact = false, disabled, duration = 1600, onConfirm, resetAfter = 1800, ...buttonProps }) {
    const buttonRef = useRef(null);
    const confirmTimerRef = useRef(null);
    const resetTimerRef = useRef(null);
    const activePointerIdRef = useRef(null);
    const inputModeRef = useRef('pointer');
    const isHoldingRef = useRef(false);
    const [inputMode, setInputMode] = useState(null);
    const [status, setStatus] = useState('idle');
    const shouldReduceMotion = useReducedMotion();
    const clearConfirmTimer = useCallback(() => {
        if (confirmTimerRef.current === null)
            return;
        window.clearTimeout(confirmTimerRef.current);
        confirmTimerRef.current = null;
    }, []);
    const completeHold = useCallback(() => {
        if (!isHoldingRef.current)
            return;
        isHoldingRef.current = false;
        activePointerIdRef.current = null;
        clearConfirmTimer();
        setStatus('confirmed');
        onConfirm(inputModeRef.current);
        if (resetAfter > 0) {
            resetTimerRef.current = window.setTimeout(() => {
                setStatus('idle');
                resetTimerRef.current = null;
            }, resetAfter);
        }
    }, [clearConfirmTimer, onConfirm, resetAfter]);
    const cancelHold = useCallback(() => {
        if (!isHoldingRef.current)
            return;
        isHoldingRef.current = false;
        activePointerIdRef.current = null;
        clearConfirmTimer();
        setStatus('idle');
    }, [clearConfirmTimer]);
    const startHold = useCallback((input) => {
        if (disabled || status === 'confirmed' || isHoldingRef.current)
            return;
        if (resetTimerRef.current !== null) {
            window.clearTimeout(resetTimerRef.current);
            resetTimerRef.current = null;
        }
        inputModeRef.current = input;
        setInputMode(input);
        isHoldingRef.current = true;
        setStatus('holding');
        confirmTimerRef.current = window.setTimeout(completeHold, duration);
    }, [completeHold, disabled, duration, status]);
    useEffect(() => {
        return () => {
            clearConfirmTimer();
            if (resetTimerRef.current !== null) {
                window.clearTimeout(resetTimerRef.current);
            }
        };
    }, [clearConfirmTimer]);
    useEffect(() => {
        if (disabled)
            cancelHold();
    }, [cancelHold, disabled]);
    function releasePointerCapture(pointerId) {
        const button = buttonRef.current;
        if (button?.hasPointerCapture(pointerId)) {
            button.releasePointerCapture(pointerId);
        }
    }
    function handlePointerDown(event) {
        if (!event.isPrimary || event.button !== 0 || disabled)
            return;
        activePointerIdRef.current = event.pointerId;
        event.currentTarget.setPointerCapture(event.pointerId);
        startHold('pointer');
    }
    function handlePointerMove(event) {
        if (!isHoldingRef.current || activePointerIdRef.current !== event.pointerId)
            return;
        const rect = event.currentTarget.getBoundingClientRect();
        const boundaryPadding = 8;
        const isOutside = event.clientX < rect.left - boundaryPadding ||
            event.clientX > rect.right + boundaryPadding ||
            event.clientY < rect.top - boundaryPadding ||
            event.clientY > rect.bottom + boundaryPadding;
        if (isOutside) {
            cancelHold();
            releasePointerCapture(event.pointerId);
        }
    }
    function handlePointerEnd(event) {
        if (activePointerIdRef.current !== event.pointerId)
            return;
        cancelHold();
        releasePointerCapture(event.pointerId);
    }
    function handleKeyDown(event) {
        if (event.repeat || (event.key !== 'Enter' && event.key !== ' '))
            return;
        event.preventDefault();
        startHold('keyboard');
    }
    function handleKeyUp(event) {
        if (event.key !== 'Enter' && event.key !== ' ')
            return;
        event.preventDefault();
        cancelHold();
    }
    const isConfirmed = status === 'confirmed';
    const isHolding = status === 'holding';
    const overlayStyle = {
        clipPath: isHolding ? 'inset(0 0 0 0)' : 'inset(0 100% 0 0)',
        transitionDuration: shouldReduceMotion || inputMode === 'keyboard'
            ? '0ms'
            : isHolding
                ? `${duration}ms`
                : '180ms',
        transitionProperty: 'clip-path',
        transitionTimingFunction: isHolding ? 'linear' : 'cubic-bezier(0.23, 1, 0.32, 1)',
    };
    return (_jsx("button", { ...buttonProps, ref: buttonRef, type: "button", "aria-busy": isHolding, disabled: disabled, className: cn('hold-confirm-btn', compact && 'hold-confirm-btn--compact', isConfirmed && 'hold-confirm-btn--confirmed', className), "data-input": inputMode, onBlur: cancelHold, onKeyDown: handleKeyDown, onKeyUp: handleKeyUp, onLostPointerCapture: cancelHold, onPointerCancel: handlePointerEnd, onPointerDown: handlePointerDown, onPointerMove: handlePointerMove, onPointerUp: handlePointerEnd, children: isConfirmed ? (_jsx("span", { className: "hold-confirm-btn__content", children: confirmedContent ?? (_jsxs(_Fragment, { children: [_jsx(CheckIcon, {}), "Confirmed"] })) })) : (_jsxs(_Fragment, { children: [_jsx("span", { className: "hold-confirm-btn__content", children: children }), _jsx("span", { "aria-hidden": "true", className: "hold-confirm-btn__overlay", style: overlayStyle, children: children })] })) }));
}
//# sourceMappingURL=HoldToConfirmButton.js.map