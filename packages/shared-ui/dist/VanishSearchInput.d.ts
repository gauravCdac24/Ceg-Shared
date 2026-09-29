import { type ReactNode } from 'react';
import './VanishSearchInput.css';
export type VanishSearchInputProps = {
    /** Rotating placeholder phrases shown when the field is empty */
    placeholders: string[];
    value?: string;
    defaultValue?: string;
    onChange?: (value: string) => void;
    /** Fired on Enter; when vanishOnSubmit is true the value is cleared after the effect */
    onSubmit?: (value: string) => void;
    /** Particle vanish on Enter (best for explicit search, not live filters) */
    vanishOnSubmit?: boolean;
    disabled?: boolean;
    className?: string;
    inputClassName?: string;
    ariaLabel?: string;
    leftIcon?: ReactNode;
    placeholderIntervalMs?: number;
};
/**
 * Search input with rotating placeholders and optional particle vanish on submit.
 * Adapted from Aceternity PlaceholdersAndVanishInput for the Ceg monorepo (no shadcn).
 */
export declare function VanishSearchInput({ placeholders, value: controlledValue, defaultValue, onChange, onSubmit, vanishOnSubmit, disabled, className, inputClassName, ariaLabel, leftIcon, placeholderIntervalMs, }: VanishSearchInputProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=VanishSearchInput.d.ts.map