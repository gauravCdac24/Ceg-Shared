import { useCallback, useMemo, useState } from 'react';
export function useCollapsibleSidebar(options = {}) {
    const { storageKey = 'ceg_admin_sidebar_collapsed', expandedWidth = 248, collapsedWidth = 72, } = options;
    const [collapsed, setCollapsed] = useState(() => {
        try {
            return localStorage.getItem(storageKey) === '1';
        }
        catch {
            return false;
        }
    });
    const toggleCollapsed = useCallback(() => {
        setCollapsed((c) => {
            const next = !c;
            try {
                localStorage.setItem(storageKey, next ? '1' : '0');
            }
            catch {
                /* ignore */
            }
            return next;
        });
    }, [storageKey]);
    const width = collapsed ? collapsedWidth : expandedWidth;
    return useMemo(() => ({ collapsed, toggleCollapsed, width, expandedWidth, collapsedWidth }), [collapsed, toggleCollapsed, width, expandedWidth, collapsedWidth]);
}
//# sourceMappingURL=useCollapsibleSidebar.js.map