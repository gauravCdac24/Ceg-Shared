import './AnimatedOtpInput.css';
export declare function emptyOtp(length?: number): string[];
export type AnimatedOtpInputProps = {
    value: string[];
    onChange: (digits: string[]) => void;
    length?: number;
    disabled?: boolean;
    autoFocus?: boolean;
    animateOnComplete?: boolean;
    onComplete?: (code: string) => void;
    /** Change to reset success animation and allow re-entry after a failed verify. */
    resetSignal?: number | string;
    verifiedLabel?: string;
    className?: string;
    boxSize?: number;
    gap?: number;
};
export declare function AnimatedOtpInput({ value, onChange, length, disabled, autoFocus, animateOnComplete, onComplete, resetSignal, verifiedLabel, className, boxSize, gap, }: AnimatedOtpInputProps): import("react/jsx-runtime").JSX.Element;
//# sourceMappingURL=AnimatedOtpInput.d.ts.map