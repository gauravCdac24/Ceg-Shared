import React, { createContext, useContext } from 'react';
import { useCollapsibleSidebar, type CollapsibleSidebarOptions } from './useCollapsibleSidebar';

export type { CollapsibleSidebarOptions };

type SidebarContextValue = ReturnType<typeof useCollapsibleSidebar>;

const CollapsibleSidebarContext = createContext<SidebarContextValue | null>(null);

export function CollapsibleSidebarProvider({
  children,
  options,
}: {
  children: React.ReactNode;
  options?: CollapsibleSidebarOptions;
}) {
  const value = useCollapsibleSidebar(options);
  return (
    <CollapsibleSidebarContext.Provider value={value}>{children}</CollapsibleSidebarContext.Provider>
  );
}

export function useCollapsibleSidebarContext(): SidebarContextValue {
  const ctx = useContext(CollapsibleSidebarContext);
  if (!ctx) {
    throw new Error('useCollapsibleSidebarContext must be used within CollapsibleSidebarProvider');
  }
  return ctx;
}
