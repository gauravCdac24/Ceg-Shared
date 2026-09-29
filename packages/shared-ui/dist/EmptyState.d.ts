import * as React from "react";
import { type ButtonProps } from "./Button";
export type EmptyStateProps = {
    title?: React.ReactNode;
    description?: React.ReactNode;
    icon?: React.ReactNode;
    actionLabel?: string;
    onAction?: () => void;
    actionProps?: Omit<ButtonProps, "children" | "onClick">;
    className?: string;
};
export declare function EmptyState({ title, description, icon, actionLabel, onAction, actionProps, className, }: EmptyStateProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=EmptyState.d.ts.map