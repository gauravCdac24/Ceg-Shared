import React from 'react';
import './AdminActionDock.css';
export type AdminDockAction = {
    id: string;
    label: string;
    subtitle?: string;
    onClick: () => void;
    icon: React.ReactNode;
    badge?: number;
    disabled?: boolean;
    tone?: 'primary' | 'warning' | 'success';
    className?: string;
};
export type AdminActionDockProps = {
    actions: AdminDockAction[];
    /** localStorage key for expanded state */
    storageKey?: string;
    ariaLabel?: string;
    className?: string;
    /** Visually collapse the panel without changing stored expanded preference */
    forceCollapsed?: boolean;
    /** Optional data-tour target for the main toggle button */
    toggleDataTour?: string;
};
/**
 * Bottom-right expandable quick-action dock (CeG Portal pattern).
 * Actions expand on hover to show labels.
 */
export declare function AdminActionDock({ actions, storageKey, ariaLabel, className, forceCollapsed, toggleDataTour, }: AdminActionDockProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=AdminActionDock.d.ts.map