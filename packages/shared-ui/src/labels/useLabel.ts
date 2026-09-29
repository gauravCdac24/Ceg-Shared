import { useMemo } from "react";
import {
  getLabel,
  getSurfaceLabels,
  type LabelField,
  type LabelKey,
  type SurfaceLabels,
} from "./index";

/** Hook for page/nav consumers. Stable string for a single field. */
export function useLabel(key: LabelKey, field: LabelField = "pageTitle"): string {
  return useMemo(() => getLabel(key, field), [key, field]);
}

/** Full sidebar/palette/title/breadcrumb set for one surface. */
export function useSurfaceLabels(key: LabelKey): SurfaceLabels {
  return useMemo(() => getSurfaceLabels(key), [key]);
}
