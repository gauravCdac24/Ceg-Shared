import * as React from "react";
export type ModalSize = "sm" | "md" | "lg" | "xl";
export type ModalProps = {
    open: boolean;
    onClose: () => void;
    title?: React.ReactNode;
    children: React.ReactNode;
    size?: ModalSize;
    className?: string;
    /** Surface class from design-tokens. Default: frosted modal. */
    surfaceClassName?: string;
    closeLabel?: string;
};
export declare function Modal({ open, onClose, title, children, size, className, surfaceClassName, closeLabel, }: ModalProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=Modal.d.ts.map