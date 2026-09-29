import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
const pill = {
    border: "1px solid rgba(26, 86, 219, 0.25)",
    background: "rgba(26, 86, 219, 0.05)",
    color: "var(--primary, #1a56db)",
    borderRadius: 999,
    padding: "0.25rem 0.65rem",
    fontSize: "0.72rem",
    fontWeight: 600,
    cursor: "pointer",
};
export function EcosystemAppLinks({ links, onNavigate, title = "Linked programme apps", style, className, }) {
    if (links.length === 0)
        return null;
    return (_jsxs("div", { style: {
            marginTop: "1rem",
            paddingTop: "0.85rem",
            borderTop: "1px dashed rgba(0, 0, 0, 0.08)",
            ...style,
        }, className: className, children: [_jsx("div", { style: {
                    fontSize: "0.68rem",
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--text-secondary, #64748b)",
                    marginBottom: "0.55rem",
                }, children: title }), _jsx("div", { style: { display: "flex", flexWrap: "wrap", gap: "0.45rem" }, children: links.map((l) => (_jsx("button", { type: "button", onClick: () => onNavigate(l.href), style: pill, children: l.label }, l.key))) })] }));
}
//# sourceMappingURL=EcosystemAppLinks.js.map