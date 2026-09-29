import { useEffect, useRef, type CSSProperties } from "react";
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

const reloadBtnCompact: CSSProperties = {
  height: 28,
  width: 28,
  fontSize: 14,
};

function drawCaptchaImage(canvas: HTMLCanvasElement, text: string) {
  const ctx = canvas.getContext("2d");
  if (!ctx || !text) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const gradient = ctx.createLinearGradient(0, 0, w, h);
  gradient.addColorStop(0, "#f0f4f8");
  gradient.addColorStop(1, "#e2e8f0");
  ctx.fillStyle = gradient;
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(0, 0, w, h, 6);
    ctx.fill();
  } else {
    ctx.fillRect(0, 0, w, h);
  }

  for (let i = 0; i < 36; i += 1) {
    ctx.beginPath();
    ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(15, 23, 42, ${Math.random() * 0.12})`;
    ctx.fill();
  }

  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(Math.random() * w, Math.random() * h);
    ctx.bezierCurveTo(
      Math.random() * w,
      Math.random() * h,
      Math.random() * w,
      Math.random() * h,
      Math.random() * w,
      Math.random() * h,
    );
    ctx.strokeStyle = `rgba(15, 23, 42, ${0.06 + Math.random() * 0.1})`;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const palette = ["#e74c3c", "#2980b9", "#27ae60", "#8e44ad", "#f39c12", "#16a085"];
  const charW = w / text.length;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text.charAt(i);
    if (!ch) continue;
    ctx.save();
    const x = i * charW + charW / 2;
    const y = h / 2 + (Math.random() * 8 - 4);
    const angle = (Math.random() - 0.5) * 0.5;
    const size = 18 + Math.floor(Math.random() * 6);
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.font = `${Math.random() > 0.5 ? "bold " : ""}${size}px Georgia, serif`;
    ctx.fillStyle = palette[i % palette.length] ?? "#334155";
    ctx.fillText(ch, -7, 0);
    ctx.restore();
  }
}

function ImageCaptchaCanvas({ question }: { question: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const displayText = (question || "").replace(/\s+/g, "").toUpperCase().slice(0, 12);
  useEffect(() => {
    if (!ref.current || !displayText) return;
    drawCaptchaImage(ref.current, displayText);
  }, [displayText]);
  return (
    <canvas
      ref={ref}
      width={192}
      height={44}
      role="img"
      aria-label="Security verification image — type the characters shown"
      className="ceg-math-captcha__canvas"
    />
  );
}

export function MathCaptchaField({
  captcha,
  answer,
  onAnswerChange,
  onReload,
  loading = false,
  loadError = null,
  variant = "cert-studio",
  label = "Security verification",
  reloadLabel = "New challenge",
  style,
  className,
}: MathCaptchaFieldProps) {
  const disabled = !captcha?.enabled;
  if (!loading && !loadError && disabled) return null;

  const question = captcha?.question ?? "";

  return (
    <div style={style} className={["ceg-math-captcha", className].filter(Boolean).join(" ")} data-testid="math-captcha" aria-live="polite">
      <label className="ceg-math-captcha__label">{label}</label>

      {loading ? (
        <p style={{ fontSize: "0.8rem", margin: 0, opacity: 0.65 }}>Loading challenge…</p>
      ) : loadError ? (
        <>
          <p style={{ fontSize: "0.8rem", margin: "0 0 0.5rem", color: "var(--danger, #b91c1c)" }}>{loadError}</p>
          <button type="button" onClick={onReload} className="ceg-math-captcha__reload" style={{ width: "auto", padding: "0 0.75rem" }}>
            ↻ Retry
          </button>
        </>
      ) : variant === "image" ? (
        <div className="ceg-math-captcha__row">
          <ImageCaptchaCanvas question={question} />
          <button type="button" onClick={onReload} title={reloadLabel} aria-label={reloadLabel} className="ceg-math-captcha__reload">
            ↻
          </button>
          <input
            type="text"
            autoComplete="off"
            name="captcha_answer"
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value.toUpperCase())}
            required
            placeholder="Enter the code shown"
            maxLength={12}
            className="ceg-math-captcha__input"
            spellCheck={false}
          />
        </div>
      ) : variant === "plain" ? (
        <>
          <div className="ceg-math-captcha__row" style={{ marginBottom: "0.35rem" }}>
            <p style={{ fontSize: "0.8rem", margin: 0, flex: 1, minWidth: 0 }}>{question}</p>
            <button type="button" onClick={onReload} title={reloadLabel} className="ceg-math-captcha__reload" style={reloadBtnCompact}>
              ↻
            </button>
          </div>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            name="captcha_answer"
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            required
            placeholder="Your answer"
            className="ceg-math-captcha__input"
            style={{ width: "100%", flex: "1 1 auto" }}
          />
        </>
      ) : (
        <div className="ceg-math-captcha__row">
          <div className="ceg-math-captcha__challenge" aria-hidden>
            <del style={{ textDecoration: "line-through", textDecorationThickness: 2 }}>{question}</del>
          </div>
          <button type="button" onClick={onReload} title={reloadLabel} aria-label={reloadLabel} className="ceg-math-captcha__reload">
            ↻
          </button>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            name="captcha_answer"
            value={answer}
            onChange={(e) => onAnswerChange(e.target.value)}
            required
            placeholder="Enter answer"
            className="ceg-math-captcha__input"
          />
        </div>
      )}
    </div>
  );
}
