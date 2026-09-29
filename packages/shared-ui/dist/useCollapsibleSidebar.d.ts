export type CollapsibleSidebarOptions = {
    /** localStorage key; default `ceg_admin_sidebar_collapsed` */
    storageKey?: string;
    expandedWidth?: number;
    collapsedWidth?: number;
};
export declare function useCollapsibleSidebar(options?: CollapsibleSidebarOptions): {
    collapsed: boolean;
    toggleCollapsed: () => void;
    width: number;
    expandedWidth: number;
    collapsedWidth: number;
};
//# sourceMappingURL=useCollapsibleSidebar.d.ts.map