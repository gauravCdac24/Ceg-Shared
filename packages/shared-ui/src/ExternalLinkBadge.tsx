import "./ExternalLinkBadge.css";

export type ExternalLinkBadgeMode = "new-tab" | "inline";

export type ExternalLinkBadgeProps = {
  /** new-tab = opens another app/site; inline = same-shell deep link that feels external. */
  mode?: ExternalLinkBadgeMode;
  className?: string;
  /** Override visible text. */
  label?: string;
};

const DEFAULT_LABEL: Record<ExternalLinkBadgeMode, string> = {
  "new-tab": "Opens in new tab",
  inline: "Leaves this page",
};

/**
 * Visual cue for cross-product / external entry points. Does not change navigation —
 * place next to the control that already opens the other product.
 */
export function ExternalLinkBadge({
  mode = "new-tab",
  className,
  label,
}: ExternalLinkBadgeProps) {
  const text = label ?? DEFAULT_LABEL[mode];
  return (
    <span
      className={["ceg-ext-link-badge", `ceg-ext-link-badge--${mode}`, className]
        .filter(Boolean)
        .join(" ")}
      title={text}
    >
      {mode === "new-tab" ? (
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7zM5 5v14h14v-7h-2v5H7V7h5V5H5z"
          />
        </svg>
      ) : (
        <svg width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path
            fill="currentColor"
            d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z"
          />
        </svg>
      )}
      <span className="ceg-ext-link-badge__text">{text}</span>
    </span>
  );
}
