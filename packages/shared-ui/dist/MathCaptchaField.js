import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import "./MathCaptchaField.css";
const reloadBtnCompact = {
    height: 28,
    width: 28,
    fontSize: 14,
};
function drawCaptchaImage(canvas, text) {
    const ctx = canvas.getContext("2d");
    if (!ctx || !text)
        return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    const gradient = ctx.createLinearGradient(0, 0, w, h);
    gradient.addColorStop(0, "#f0f4f8");
    gradient.addColorStop(1, "#e2e8f0");
    ctx.fillStyle = gradient;
    if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(0, 0, w, h, 6);
        ctx.fill();
    }
    else {
        ctx.fillRect(0, 0, w, h);
    }
    for (let i = 0; i < 36; i += 1) {
        ctx.beginPath();
        ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(15, 23, 42, ${Math.random() * 0.12})`;
        ctx.fill();
    }
    for (let i = 0; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * w, Math.random() * h);
        ctx.bezierCurveTo(Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h, Math.random() * w, Math.random() * h);
        ctx.strokeStyle = `rgba(15, 23, 42, ${0.06 + Math.random() * 0.1})`;
        ctx.lineWidth = 1;
        ctx.stroke();
    }
    const palette = ["#e74c3c", "#2980b9", "#27ae60", "#8e44ad", "#f39c12", "#16a085"];
    const charW = w / text.length;
    for (let i = 0; i < text.length; i += 1) {
        const ch = text.charAt(i);
        if (!ch)
            continue;
        ctx.save();
        const x = i * charW + charW / 2;
        const y = h / 2 + (Math.random() * 8 - 4);
        const angle = (Math.random() - 0.5) * 0.5;
        const size = 18 + Math.floor(Math.random() * 6);
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.font = `${Math.random() > 0.5 ? "bold " : ""}${size}px Georgia, serif`;
        ctx.fillStyle = palette[i % palette.length] ?? "#334155";
        ctx.fillText(ch, -7, 0);
        ctx.restore();
    }
}
function ImageCaptchaCanvas({ question }) {
    const ref = useRef(null);
    const displayText = (question || "").replace(/\s+/g, "").toUpperCase().slice(0, 12);
    useEffect(() => {
        if (!ref.current || !displayText)
            return;
        drawCaptchaImage(ref.current, displayText);
    }, [displayText]);
    return (_jsx("canvas", { ref: ref, width: 192, height: 44, role: "img", "aria-label": "Security verification image \u2014 type the characters shown", className: "ceg-math-captcha__canvas" }));
}
export function MathCaptchaField({ captcha, answer, onAnswerChange, onReload, loading = false, loadError = null, variant = "cert-studio", label = "Security verification", reloadLabel = "New challenge", style, className, }) {
    const disabled = !captcha?.enabled;
    if (!loading && !loadError && disabled)
        return null;
    const question = captcha?.question ?? "";
    return (_jsxs("div", { style: style, className: ["ceg-math-captcha", className].filter(Boolean).join(" "), "data-testid": "math-captcha", "aria-live": "polite", children: [_jsx("label", { className: "ceg-math-captcha__label", children: label }), loading ? (_jsx("p", { style: { fontSize: "0.8rem", margin: 0, opacity: 0.65 }, children: "Loading challenge\u2026" })) : loadError ? (_jsxs(_Fragment, { children: [_jsx("p", { style: { fontSize: "0.8rem", margin: "0 0 0.5rem", color: "var(--danger, #b91c1c)" }, children: loadError }), _jsx("button", { type: "button", onClick: onReload, className: "ceg-math-captcha__reload", style: { width: "auto", padding: "0 0.75rem" }, children: "\u21BB Retry" })] })) : variant === "image" ? (_jsxs("div", { className: "ceg-math-captcha__row", children: [_jsx(ImageCaptchaCanvas, { question: question }), _jsx("button", { type: "button", onClick: onReload, title: reloadLabel, "aria-label": reloadLabel, className: "ceg-math-captcha__reload", children: "\u21BB" }), _jsx("input", { type: "text", autoComplete: "off", name: "captcha_answer", value: answer, onChange: (e) => onAnswerChange(e.target.value.toUpperCase()), required: true, placeholder: "Enter the code shown", maxLength: 12, className: "ceg-math-captcha__input", spellCheck: false })] })) : variant === "plain" ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "ceg-math-captcha__row", style: { marginBottom: "0.35rem" }, children: [_jsx("p", { style: { fontSize: "0.8rem", margin: 0, flex: 1, minWidth: 0 }, children: question }), _jsx("button", { type: "button", onClick: onReload, title: reloadLabel, className: "ceg-math-captcha__reload", style: reloadBtnCompact, children: "\u21BB" })] }), _jsx("input", { type: "text", inputMode: "numeric", autoComplete: "off", name: "captcha_answer", value: answer, onChange: (e) => onAnswerChange(e.target.value), required: true, placeholder: "Your answer", className: "ceg-math-captcha__input", style: { width: "100%", flex: "1 1 auto" } })] })) : (_jsxs("div", { className: "ceg-math-captcha__row", children: [_jsx("div", { className: "ceg-math-captcha__challenge", "aria-hidden": true, children: _jsx("del", { style: { textDecoration: "line-through", textDecorationThickness: 2 }, children: question }) }), _jsx("button", { type: "button", onClick: onReload, title: reloadLabel, "aria-label": reloadLabel, className: "ceg-math-captcha__reload", children: "\u21BB" }), _jsx("input", { type: "text", inputMode: "numeric", autoComplete: "off", name: "captcha_answer", value: answer, onChange: (e) => onAnswerChange(e.target.value), required: true, placeholder: "Enter answer", className: "ceg-math-captcha__input" })] }))] }));
}
//# sourceMappingURL=MathCaptchaField.js.map