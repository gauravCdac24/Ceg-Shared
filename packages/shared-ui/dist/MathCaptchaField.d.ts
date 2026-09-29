import { type CSSProperties } from "react";
import "./MathCaptchaField.css";
/** Server-issued math captcha (WorkshopOS / FetchDesk / CeG backends). */
export type CaptchaChallenge = {
    enabled: boolean;
    challenge_id?: string;
    question?: string;
    token?: string;
};
export type MathCaptchaFieldProps = {
    captcha: CaptchaChallenge | null;
    answer: string;
    onAnswerChange: (value: string) => void;
    onReload: () => void;
    loading?: boolean;
    loadError?: string | null;
    variant?: "cert-studio" | "plain" | "image";
    label?: string;
    reloadLabel?: string;
    style?: CSSProperties;
    className?: string;
};
export declare function MathCaptchaField({ captcha, answer, onAnswerChange, onReload, loading, loadError, variant, label, reloadLabel, style, className, }: MathCaptchaFieldProps): import("react/jsx-runtime").JSX.Element | null;
//# sourceMappingURL=MathCaptchaField.d.ts.map