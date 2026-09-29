import { useMemo } from "react";
import { getLabel, getSurfaceLabels, } from "./index";
/** Hook for page/nav consumers. Stable string for a single field. */
export function useLabel(key, field = "pageTitle") {
    return useMemo(() => getLabel(key, field), [key, field]);
}
/** Full sidebar/palette/title/breadcrumb set for one surface. */
export function useSurfaceLabels(key) {
    return useMemo(() => getSurfaceLabels(key), [key]);
}
//# sourceMappingURL=useLabel.js.map