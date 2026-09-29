import type { CaptchaChallenge } from "./MathCaptchaField";
export type FetchCaptchaFn = () => Promise<CaptchaChallenge>;
/**
 * Loads a server-signed math captcha and builds API payload fields.
 * Fails closed when the challenge cannot be loaded (no silent bypass).
 */
export declare function useMathCaptcha(fetchChallenge: FetchCaptchaFn): {
    captcha: CaptchaChallenge | null;
    answer: string;
    setAnswer: import("react").Dispatch<import("react").SetStateAction<string>>;
    loading: boolean;
    loadError: string | null;
    required: boolean;
    solved: boolean;
    canSubmit: boolean;
    payload: {
        captcha_challenge_id?: undefined;
        captcha_token?: undefined;
        captcha_answer?: undefined;
    } | {
        captcha_challenge_id: string;
        captcha_token: string;
        captcha_answer: string;
    };
    reload: () => void;
    refreshAfterFailure: () => void;
};
//# sourceMappingURL=useMathCaptcha.d.ts.map