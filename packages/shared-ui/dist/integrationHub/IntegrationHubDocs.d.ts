import { type ReactNode } from 'react';
import { type IntegrationProductId } from './content';
import './IntegrationHubDocs.css';
export type IntegrationHubDocsProps = {
    product: IntegrationProductId;
    /** Full API prefix, e.g. https://host/api/v1 or https://host/quiz/v1 */
    apiBaseUrl: string;
    /** Site origin without API path — used in SDK examples */
    siteOrigin?: string;
    openApiUrl?: string;
    /** Render API key UI above docs (IntegrationKeysPanel, ApiKeys, etc.) */
    keyManagementSlot?: ReactNode;
    /** Links to sibling product docs in other apps */
    siblingLinks?: {
        label: string;
        href: string;
    }[];
    /** When true (default for tenant products), hide platform-operator integrations from the ecosystem section. */
    tenantView?: boolean;
    /**
     * operator — plain-language who-connects-to-whom; curl/JWT/env behind "For developers".
     * developer — full technical reference (default for non-CeG embeds).
     */
    audience?: 'operator' | 'developer';
    className?: string;
};
export declare function IntegrationHubDocs({ product, apiBaseUrl, siteOrigin, openApiUrl, keyManagementSlot, siblingLinks, tenantView, audience, className, }: IntegrationHubDocsProps): import("react/jsx-runtime").JSX.Element;
export type { IntegrationProductId } from './content';
export { ECOSYSTEM_PRODUCTS, getProductDoc, PRODUCT_DOCS } from './content';
//# sourceMappingURL=IntegrationHubDocs.d.ts.map