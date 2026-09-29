import type { ProductFooterProps } from "./ProductFooter";
export type FooterProductId = "cert_studio" | "quizforge" | "fetchdesk" | "workshopos" | "ceg_portal";
type PresetFactory = (basePath?: string) => ProductFooterProps;
export declare const footerPresets: Record<FooterProductId, PresetFactory>;
export declare function getProductFooterProps(product: FooterProductId, basePath?: string, overrides?: Partial<ProductFooterProps>): ProductFooterProps;
export {};
//# sourceMappingURL=footerPresets.d.ts.map