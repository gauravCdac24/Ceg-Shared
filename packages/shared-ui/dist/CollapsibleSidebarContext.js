import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from 'react';
import { useCollapsibleSidebar } from './useCollapsibleSidebar';
const CollapsibleSidebarContext = createContext(null);
export function CollapsibleSidebarProvider({ children, options, }) {
    const value = useCollapsibleSidebar(options);
    return (_jsx(CollapsibleSidebarContext.Provider, { value: value, children: children }));
}
export function useCollapsibleSidebarContext() {
    const ctx = useContext(CollapsibleSidebarContext);
    if (!ctx) {
        throw new Error('useCollapsibleSidebarContext must be used within CollapsibleSidebarProvider');
    }
    return ctx;
}
//# sourceMappingURL=CollapsibleSidebarContext.js.map