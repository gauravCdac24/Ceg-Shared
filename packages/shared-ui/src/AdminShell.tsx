import * as React from "react";
import {
  CollapsibleSidebarProvider,
  type CollapsibleSidebarOptions,
} from "./CollapsibleSidebarContext";
import {
  CEG_ADMIN_SHELL_CONTRACT,
  type AdminShellContract,
} from "./adminShellContract";
import { SkipToMainLink } from "./SkipToMainLink";
import { CegSonnerToaster } from "./sonnerToast";
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

export function AdminShell({
  header,
  sidebar,
  children,
  mainFooter,
  mainPrefix,
  mobileNav,
  overlays,
  sidebarProviderOptions,
  classes = CEG_ADMIN_SHELL_CONTRACT,
  rootClassName = "",
  mainClassName = "",
  isMobileNav = false,
  mainMaxWidth = "88rem",
  skipLinkLabel,
  layout = "admin",
  showToaster = true,
}: AdminShellProps) {
  const mainClasses = [classes.mainScroll, isMobileNav ? "qf-admin-main--mobile-nav" : "", mainClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <CollapsibleSidebarProvider options={sidebarProviderOptions}>
      <div
        className={`${classes.root} ${rootClassName}`.trim()}
        data-layout={layout}
        data-ceg-admin-shell=""
      >
        <SkipToMainLink
          label={skipLinkLabel}
          mainId={classes.mainId}
          className={classes.skipLink ?? CEG_ADMIN_SHELL_CONTRACT.skipLink}
        />

        {sidebar}

        <div className={classes.body} data-ceg-admin-shell-body="">
          <div data-ceg-admin-shell-header="">{header}</div>
          <main
            id={classes.mainId}
            tabIndex={-1}
            className={mainClasses}
            data-ceg-admin-main=""
            {...(isMobileNav ? { "data-mobile-nav": "" } : {})}
          >
            <div data-ceg-admin-canvas="" style={{ maxWidth: mainMaxWidth }}>
              {mainPrefix}
              {children}
            </div>
            {mainFooter}
          </main>
        </div>

        {mobileNav}
        {overlays}
        {showToaster ? <CegSonnerToaster /> : null}
      </div>
    </CollapsibleSidebarProvider>
  );
}
