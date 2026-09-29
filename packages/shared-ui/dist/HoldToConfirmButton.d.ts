import { type ButtonHTMLAttributes, type ReactNode } from 'react';
import './HoldToConfirmButton.css';
export type ConfirmationInput = 'keyboard' | 'pointer';
export type HoldStatus = 'confirmed' | 'holding' | 'idle';
export type HoldToConfirmButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'onClick'> & {
    children?: ReactNode;
    confirmedContent?: ReactNode;
    compact?: boolean;
    duration?: number;
    onConfirm: (input: ConfirmationInput) => void;
    resetAfter?: number;
};
export declare function HoldToConfirmButton({ children, className, confirmedContent, compact, disabled, duration, onConfirm, resetAfter, ...buttonProps }: HoldToConfirmButtonProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=HoldToConfirmButton.d.ts.map