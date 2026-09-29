import { type ReactNode } from 'react';
import './FloatingNavDock.css';
export type FloatingNavItem = {
    id: string;
    title: string;
    icon: ReactNode;
    href?: string;
    onClick?: () => void;
    active?: boolean;
};
export type FloatingNavDockProps = {
    items: FloatingNavItem[];
    className?: string;
    ariaLabel?: string;
    /** Distance from viewport bottom in px */
    bottom?: number;
};
/**
 * Bottom-center floating nav with magnifying icons on hover (Aceternity Floating Dock pattern).
 * Complements {@link AdminActionDock} which is a bottom-right expandable quick-action panel.
 */
export declare function FloatingNavDock({ items, className, ariaLabel, bottom, }: FloatingNavDockProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=FloatingNavDock.d.ts.map