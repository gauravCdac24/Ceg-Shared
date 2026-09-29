import { type LabelField, type LabelKey, type SurfaceLabels } from "./index";
/** Hook for page/nav consumers. Stable string for a single field. */
export declare function useLabel(key: LabelKey, field?: LabelField): string;
/** Full sidebar/palette/title/breadcrumb set for one surface. */
export declare function useSurfaceLabels(key: LabelKey): SurfaceLabels;
//# sourceMappingURL=useLabel.d.ts.map