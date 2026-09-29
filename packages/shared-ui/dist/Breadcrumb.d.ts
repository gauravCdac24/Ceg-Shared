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
export declare function Breadcrumb({ items, linkComponent: LinkComp, className, "aria-label": ariaLabel, }: BreadcrumbProps): import("react/jsx-runtime").JSX.Element | null;
/** Build a trail from a flat path→label map (exact match, then longest prefix). */
export declare function breadcrumbTrailFromMap(pathname: string, map: Record<string, string>, root?: BreadcrumbItem): BreadcrumbItem[];
//# sourceMappingURL=Breadcrumb.d.ts.map