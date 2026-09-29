import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useEffect, useRef, useState } from "react";
import { DynamicButton } from "./DynamicButton";
function CopyIcon({ className }) {
    return (_jsx("svg", { "aria-hidden": "true", className: className, width: "15", height: "15", viewBox: "0 0 256 256", fill: "currentColor", children: _jsx("path", { d: "M216 32H88a8 8 0 0 0-8 8v40H40a8 8 0 0 0-8 8v128a8 8 0 0 0 8 8h128a8 8 0 0 0 8-8v-40h40a8 8 0 0 0 8-8V40a8 8 0 0 0-8-8Zm-56 168H48V96h40v104a8 8 0 0 0 8 8h88Zm48-48H96V48h128v128Z" }) }));
}
function CheckIcon({ className }) {
    return (_jsx("svg", { "aria-hidden": "true", className: className, width: "15", height: "15", viewBox: "0 0 256 256", fill: "currentColor", children: _jsx("path", { d: "m232.49 80.49-128 128a12 12 0 0 1-17 0l-56-56a12 12 0 1 1 17-17L96 183l119.51-119.52a12 12 0 0 1 17 17Z" }) }));
}
export function CopyDynamicButton({ text, getText, label = "Copy", copiedLabel = "Copied", copiedDurationMs = 1200, onCopied, onCopyError, icon, copiedIcon, disabled, ...buttonProps }) {
    const [copied, setCopied] = useState(false);
    const [busy, setBusy] = useState(false);
    const timerRef = useRef(null);
    useEffect(() => {
        return () => {
            if (timerRef.current !== null) {
                window.clearTimeout(timerRef.current);
            }
        };
    }, []);
    const handleClick = useCallback(async () => {
        if (busy)
            return;
        setBusy(true);
        try {
            const value = getText ? await getText() : text;
            if (!value) {
                throw new Error("Nothing to copy");
            }
            await navigator.clipboard.writeText(value);
            setCopied(true);
            onCopied?.(value);
            if (timerRef.current !== null) {
                window.clearTimeout(timerRef.current);
            }
            timerRef.current = window.setTimeout(() => {
                setCopied(false);
                timerRef.current = null;
            }, copiedDurationMs);
        }
        catch (error) {
            onCopyError?.(error);
        }
        finally {
            setBusy(false);
        }
    }, [busy, copiedDurationMs, getText, onCopied, onCopyError, text]);
    const labelText = copied ? copiedLabel : label;
    const iconNode = copied
        ? (copiedIcon ?? _jsx(CheckIcon, { className: "dynamic-btn__icon--success" }))
        : (icon ?? _jsx(CopyIcon, {}));
    return (_jsx(DynamicButton, { ...buttonProps, disabled: disabled || busy, icon: iconNode, stateKey: copied ? "copied" : "copy", onClick: () => void handleClick(), children: labelText }));
}
//# sourceMappingURL=CopyDynamicButton.js.map