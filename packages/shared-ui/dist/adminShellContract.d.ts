/**
 * Fleet admin shell layout contract — single scroll owner on #main-content.
 * Products may override class tokens via AdminShell `classes` prop (e.g. QuizForge qf-*).
 */
export declare const CEG_ADMIN_SHELL_ROOT_CLASS = "ceg-admin-shell";
export declare const CEG_ADMIN_SHELL_BODY_CLASS = "ceg-admin-shell-body";
export declare const CEG_ADMIN_MAIN_CONTENT_ID = "main-content";
export declare const CEG_ADMIN_MAIN_SCROLL_CLASS = "ceg-admin-main-scroll";
export declare const CEG_SKIP_LINK_CLASS = "ceg-skip-link";
export declare const CEG_ADMIN_SHELL_CONTRACT: {
    readonly root: "ceg-admin-shell";
    readonly body: "ceg-admin-shell-body";
    readonly mainId: "main-content";
    readonly mainScroll: "ceg-admin-main-scroll";
    readonly skipLink: "ceg-skip-link";
};
export type AdminShellContract = {
    root: string;
    body: string;
    mainId: string;
    mainScroll: string;
    skipLink: string;
};
//# sourceMappingURL=adminShellContract.d.ts.map