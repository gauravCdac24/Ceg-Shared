import { CEG_SKIP_LINK_CLASS } from "./adminShellContract";
import { skipToMainContent } from "./skipToMainContent";

export type SkipToMainLinkProps = {
  label?: string;
  mainId?: string;
  className?: string;
};

export function SkipToMainLink({
  label = "Skip to main content",
  mainId = "main-content",
  className = CEG_SKIP_LINK_CLASS,
}: SkipToMainLinkProps) {
  return (
    <a
      href={`#${mainId}`}
      className={className}
      onClick={(e) => skipToMainContent(e, mainId)}
    >
      {label}
    </a>
  );
}
