import { jsx as _jsx } from "react/jsx-runtime";
import { CEG_SKIP_LINK_CLASS } from "./adminShellContract";
import { skipToMainContent } from "./skipToMainContent";
export function SkipToMainLink({ label = "Skip to main content", mainId = "main-content", className = CEG_SKIP_LINK_CLASS, }) {
    return (_jsx("a", { href: `#${mainId}`, className: className, onClick: (e) => skipToMainContent(e, mainId), children: label }));
}
//# sourceMappingURL=SkipToMainLink.js.map