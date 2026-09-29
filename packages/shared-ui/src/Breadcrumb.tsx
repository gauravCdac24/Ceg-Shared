import * as React from "react";
import "./Breadcrumb.css";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

export type BreadcrumbLinkProps = {
  className?: string;
  href?: string;
  to?: string;
  children: React.ReactNode;
};

export type BreadcrumbProps = {
  items: BreadcrumbItem[];
  /** Optional link component (e.g. react-router Link). Defaults to <a>. */
  linkComponent?: React.ComponentType<BreadcrumbLinkProps> | "a";
  className?: string;
  "aria-label"?: string;
};

/**
 * Route-driven breadcrumb trail. Pass label chains from labels registry / route map.
 * Does not replace page-level "Back to…" buttons — add alongside until per-page cleanup.
 */
export function Breadcrumb({
  items,
  linkComponent: LinkComp = "a",
  className,
  "aria-label": ariaLabel = "Breadcrumb",
}: BreadcrumbProps) {
  if (!items.length) return null;

  return (
    <nav className={["ceg-breadcrumb", className].filter(Boolean).join(" ")} aria-label={ariaLabel}>
      <ol className="ceg-breadcrumb__list">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="ceg-breadcrumb__item">
              {i > 0 ? (
                <span className="ceg-breadcrumb__sep" aria-hidden="true">
                  /
                </span>
              ) : null}
              {last || !item.href ? (
                <span className="ceg-breadcrumb__current" aria-current={last ? "page" : undefined}>
                  {item.label}
                </span>
              ) : LinkComp === "a" ? (
                <a className="ceg-breadcrumb__link" href={item.href}>
                  {item.label}
                </a>
              ) : (
                <LinkComp className="ceg-breadcrumb__link" to={item.href}>
                  {item.label}
                </LinkComp>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** Build a trail from a flat path→label map (exact match, then longest prefix). */
export function breadcrumbTrailFromMap(
  pathname: string,
  map: Record<string, string>,
  root: BreadcrumbItem = { label: "Admin", href: "/admin/dashboard" },
): BreadcrumbItem[] {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  const exact = map[normalized];
  if (exact) {
    return [root, { label: exact }];
  }
  let best: { path: string; label: string } | null = null;
  for (const [path, label] of Object.entries(map)) {
    if (normalized === path || normalized.startsWith(`${path}/`)) {
      if (!best || path.length > best.path.length) best = { path, label };
    }
  }
  if (best) return [root, { label: best.label }];
  return [root];
}
