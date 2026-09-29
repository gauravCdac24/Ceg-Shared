export type IntegrationProductId = 'certstudio' | 'quizforge' | 'workshopos' | 'ceg_portal' | 'fetchdesk';
export type DocStep = {
    title: string;
    body: string;
};
export type DocEndpoint = {
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    path: string;
    summary: string;
    /** Logical domain for grouped endpoint trees (auth, templates, jobs, …). */
    group?: string;
};
export type DocEndpointGroupInfo = {
    id: string;
    label: string;
    description: string;
};
export type DocExample = {
    title: string;
    language: 'bash' | 'json' | 'typescript';
    code: string;
};
export type DocFaq = {
    q: string;
    a: string;
};
export type ProductIntegrationDoc = {
    id: IntegrationProductId;
    title: string;
    tagline: string;
    /** Short overview paragraph shown above Get Started. */
    overview?: string;
    /** Operator-facing title when IntegrationHubDocs audience="operator". */
    operatorTitle?: string;
    operatorTagline?: string;
    operatorOverview?: string;
    operatorSetupSteps?: DocStep[];
    integrationPrefix: string;
    authHeader: string;
    authNote: string;
    openApiPath?: string;
    setupSteps: DocStep[];
    endpointGroups?: DocEndpointGroupInfo[];
    endpoints: DocEndpoint[];
    examples: DocExample[];
    webhooks?: {
        events: string[];
        note: string;
    };
    envVars?: {
        name: string;
        description: string;
    }[];
    connectsTo?: string[];
    faq: DocFaq[];
};
export declare const ECOSYSTEM_PRODUCTS: {
    id: IntegrationProductId;
    label: string;
    role: string;
    operatorLabel?: string;
    operatorRole?: string;
}[];
export declare const PRODUCT_DOCS: Record<IntegrationProductId, ProductIntegrationDoc>;
export declare function getProductDoc(product: IntegrationProductId): ProductIntegrationDoc;
export declare function interpolateDocText(text: string, baseUrl: string, origin?: string): string;
//# sourceMappingURL=content.d.ts.map