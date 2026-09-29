import * as React from "react";
import { type CollapsibleSidebarOptions } from "./CollapsibleSidebarContext";
import { type AdminShellContract } from "./adminShellContract";
import "./AdminShell.css";
export type AdminShellProps = {
    /** Top bar / header region (fixed height, shrink-0). */
    header: React.ReactNode;
    /** Sidebar rail — rendered inside CollapsibleSidebarProvider. */
    sidebar: React.ReactNode;
    /** Primary page content (inside scrollable main). */
    children: React.ReactNode;
    /** Optional footer rendered inside main scroll area (QuizForge pattern). */
    mainFooter?: React.ReactNode;
    /** Banners / pre-main content inside the canvas wrapper. */
    mainPrefix?: React.ReactNode;
    /** Mobile bottom nav or similar — outside main scroll. */
    mobileNav?: React.ReactNode;
    /** Dialogs, docks, health banners, session timeout — portaled overlays. */
    overlays?: React.ReactNode;
    /** Collapsible sidebar persistence + width options. */
    sidebarProviderOptions?: CollapsibleSidebarOptions;
    /** Layout class tokens — override for product-specific CSS (e.g. qf-*). */
    classes?: AdminShellContract;
    /** Extra class on root shell container. */
    rootClassName?: string;
    /** Extra class on main scroll element. */
    mainClassName?: string;
    /** Adds product mobile-nav padding class on main when true. */
    isMobileNav?: boolean;
    /** Max width for inner content wrapper (default 88rem). */
    mainMaxWidth?: string;
    /** Skip link label. */
    skipLinkLabel?: string;
    /** data-layout attribute on root. */
    layout?: string;
    /** Mount fleet Sonner toaster in shell (default true). */
    showToaster?: boolean;
};
export declare function AdminShell({ header, sidebar, children, mainFooter, mainPrefix, mobileNav, overlays, sidebarProviderOptions, classes, rootClassName, mainClassName, isMobileNav, mainMaxWidth, skipLinkLabel, layout, showToaster, }: AdminShellProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=AdminShell.d.ts.map