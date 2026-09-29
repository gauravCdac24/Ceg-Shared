import { useCallback, useEffect, useMemo, useState } from "react";
/**
 * Loads a server-signed math captcha and builds API payload fields.
 * Fails closed when the challenge cannot be loaded (no silent bypass).
 */
export function useMathCaptcha(fetchChallenge) {
    const [captcha, setCaptcha] = useState(null);
    const [answer, setAnswer] = useState("");
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState(null);
    const reload = useCallback(() => {
        setLoading(true);
        setLoadError(null);
        void fetchChallenge()
            .then((c) => {
            setCaptcha(c);
            if (c.enabled && (!c.challenge_id || !c.token || !c.question)) {
                setLoadError("Security check unavailable. Refresh to try again.");
            }
        })
            .catch(() => {
            setCaptcha({ enabled: false });
            setLoadError("Unable to load security check. Refresh to try again.");
        })
            .finally(() => setLoading(false));
    }, [fetchChallenge]);
    useEffect(() => {
        reload();
    }, [reload]);
    const required = Boolean(captcha?.enabled && captcha.challenge_id && captcha.token);
    const solved = !required || answer.trim().length > 0;
    const canSubmit = !loading && solved && !loadError;
    const payload = useMemo(() => {
        if (!required)
            return {};
        return {
            captcha_challenge_id: captcha.challenge_id,
            captcha_token: captcha.token,
            captcha_answer: answer.trim(),
        };
    }, [required, captcha, answer]);
    const resetAnswer = useCallback(() => setAnswer(""), []);
    const refreshAfterFailure = useCallback(() => {
        reload();
        resetAnswer();
    }, [reload, resetAnswer]);
    return {
        captcha,
        answer,
        setAnswer,
        loading,
        loadError,
        required,
        solved,
        canSubmit,
        payload,
        reload,
        refreshAfterFailure,
    };
}
//# sourceMappingURL=useMathCaptcha.js.map