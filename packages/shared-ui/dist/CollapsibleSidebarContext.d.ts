import React from 'react';
import { useCollapsibleSidebar, type CollapsibleSidebarOptions } from './useCollapsibleSidebar';
export type { CollapsibleSidebarOptions };
type SidebarContextValue = ReturnType<typeof useCollapsibleSidebar>;
export declare function CollapsibleSidebarProvider({ children, options, }: {
    children: React.ReactNode;
    options?: CollapsibleSidebarOptions;
}): import("react/jsx-runtime").JSX.Element;
export declare function useCollapsibleSidebarContext(): SidebarContextValue;
//# sourceMappingURL=CollapsibleSidebarContext.d.ts.map