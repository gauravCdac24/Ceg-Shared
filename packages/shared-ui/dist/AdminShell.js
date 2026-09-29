import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CollapsibleSidebarProvider, } from "./CollapsibleSidebarContext";
import { CEG_ADMIN_SHELL_CONTRACT, } from "./adminShellContract";
import { SkipToMainLink } from "./SkipToMainLink";
import { CegSonnerToaster } from "./sonnerToast";
import "./AdminShell.css";
export function AdminShell({ header, sidebar, children, mainFooter, mainPrefix, mobileNav, overlays, sidebarProviderOptions, classes = CEG_ADMIN_SHELL_CONTRACT, rootClassName = "", mainClassName = "", isMobileNav = false, mainMaxWidth = "88rem", skipLinkLabel, layout = "admin", showToaster = true, }) {
    const mainClasses = [classes.mainScroll, isMobileNav ? "qf-admin-main--mobile-nav" : "", mainClassName]
        .filter(Boolean)
        .join(" ");
    return (_jsx(CollapsibleSidebarProvider, { options: sidebarProviderOptions, children: _jsxs("div", { className: `${classes.root} ${rootClassName}`.trim(), "data-layout": layout, "data-ceg-admin-shell": "", children: [_jsx(SkipToMainLink, { label: skipLinkLabel, mainId: classes.mainId, className: classes.skipLink ?? CEG_ADMIN_SHELL_CONTRACT.skipLink }), sidebar, _jsxs("div", { className: classes.body, "data-ceg-admin-shell-body": "", children: [_jsx("div", { "data-ceg-admin-shell-header": "", children: header }), _jsxs("main", { id: classes.mainId, tabIndex: -1, className: mainClasses, "data-ceg-admin-main": "", ...(isMobileNav ? { "data-mobile-nav": "" } : {}), children: [_jsxs("div", { "data-ceg-admin-canvas": "", style: { maxWidth: mainMaxWidth }, children: [mainPrefix, children] }), mainFooter] })] }), mobileNav, overlays, showToaster ? _jsx(CegSonnerToaster, {}) : null] }) }));
}
//# sourceMappingURL=AdminShell.js.map