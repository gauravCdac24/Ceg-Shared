import { DEFAULT_CEG_SOCIAL_LINKS } from "./ProductFooter";
const year = new Date().getFullYear();
const LEGAL = [
    { name: "Terms and Conditions", href: "https://www.india.gov.in/help/terms_of_use", external: true },
    { name: "Privacy Policy", href: "https://www.meity.gov.in/policies", external: true },
    { name: "Accessibility", href: "https://www.meity.gov.in/", external: true },
];
function withBase(basePath, path) {
    const base = (basePath || "").replace(/\/$/, "");
    if (!path.startsWith("/"))
        return path;
    return `${base}${path}`;
}
export const footerPresets = {
    cert_studio: () => ({
        logo: {
            url: "/",
            src: "/logos/cdac.png",
            alt: "C-DAC logo",
            title: "Certificate & Forms Studio",
        },
        description: "Design certificate and form templates, bulk-generate tamper-evident PDFs, and offer public QR verification.",
        socialLinks: DEFAULT_CEG_SOCIAL_LINKS,
        sections: [
            {
                title: "Platform",
                links: [
                    { name: "Sign in", href: "/login" },
                    { name: "Register organisation", href: "/register" },
                    { name: "Public verify", href: "/verify" },
                    { name: "Pricing", href: "/pricing" },
                ],
            },
            {
                title: "Product",
                links: [
                    { name: "Features", href: "/#features" },
                    { name: "User guide", href: "/#guide" },
                    { name: "FAQ", href: "/#faq" },
                    { name: "Billing", href: "/billing" },
                ],
            },
            {
                title: "Resources",
                links: [
                    { name: "API documentation", href: "/v1/docs", external: true },
                    { name: "OpenAPI JSON", href: "/v1/openapi.json", external: true },
                    { name: "Contact", href: "mailto:contact@cdac.in", external: true },
                ],
            },
        ],
        copyright: `© ${year} Centre for Development of Advanced Computing (C-DAC). All rights reserved.`,
        legalLinks: LEGAL,
        variant: "dark",
    }),
    quizforge: (basePath = "") => ({
        logo: {
            url: withBase(basePath, "/"),
            src: withBase(basePath, "/cdac-logo.png"),
            alt: "C-DAC logo",
            title: "QuizForge",
        },
        description: "Assessment and live quiz platform for institutions. Build question pools, run proctored exams, and publish results with C-DAC verification.",
        socialLinks: DEFAULT_CEG_SOCIAL_LINKS,
        sections: [
            {
                title: "Platform",
                links: [
                    { name: "Sign in", href: withBase(basePath, "/auth/login") },
                    { name: "Register", href: withBase(basePath, "/auth/register") },
                    { name: "Verify certificate", href: withBase(basePath, "/verify-certificate") },
                    { name: "Pricing", href: withBase(basePath, "/pricing") },
                ],
            },
            {
                title: "Product",
                links: [
                    { name: "Dashboard", href: withBase(basePath, "/admin/dashboard") },
                    { name: "Question pool", href: withBase(basePath, "/admin/pool") },
                    { name: "Live quiz", href: withBase(basePath, "/admin/live") },
                    { name: "Billing", href: withBase(basePath, "/billing") },
                ],
            },
            {
                title: "Resources",
                links: [
                    { name: "Integration hub", href: withBase(basePath, "/admin/integration-hub") },
                    { name: "Privacy Policy", href: "https://www.meity.gov.in/policies", external: true },
                    { name: "Contact", href: "mailto:contact@cdac.in", external: true },
                ],
            },
        ],
        copyright: `© ${year} C-DAC, Government of India. All rights reserved.`,
        legalLinks: LEGAL,
        variant: "dark",
    }),
    fetchdesk: () => ({
        logo: {
            url: "/",
            src: "/cdac-logo.png",
            alt: "C-DAC logo",
            title: "FetchDesk",
        },
        description: "Content operations for government news and programme publishing. Crawl sources, curate feeds, and publish with editorial workflows.",
        socialLinks: DEFAULT_CEG_SOCIAL_LINKS,
        sections: [
            {
                title: "Platform",
                links: [
                    { name: "Sign in", href: "/login" },
                    { name: "Register", href: "/register" },
                    { name: "Pricing", href: "/pricing" },
                ],
            },
            {
                title: "Product",
                links: [
                    { name: "News feeds", href: "/news" },
                    { name: "Sources", href: "/sources" },
                    { name: "Editorial", href: "/editorial" },
                ],
            },
            {
                title: "Resources",
                links: [
                    { name: "API documentation", href: "/api/v1/docs", external: true },
                    { name: "Privacy Policy", href: "https://www.meity.gov.in/policies", external: true },
                    { name: "Contact", href: "mailto:contact@cdac.in", external: true },
                ],
            },
        ],
        copyright: `© ${year} C-DAC, Government of India. All rights reserved.`,
        legalLinks: LEGAL,
        variant: "light",
    }),
    workshopos: () => ({
        logo: {
            url: "/",
            src: "/cdac-logo.png",
            alt: "WorkshopOS",
            title: "WorkshopOS",
        },
        description: "Plan, register, and run workshops from one workspace. Manage events, bookings, certificates, and participant communications.",
        socialLinks: [],
        sections: [
            {
                title: "Platform",
                links: [
                    { name: "Events", href: "/events" },
                    { name: "Sign in", href: "/login" },
                    { name: "Register", href: "/register" },
                    { name: "Pricing", href: "/pricing" },
                ],
            },
            {
                title: "Product",
                links: [
                    { name: "Download certificate", href: "/certificate" },
                    { name: "Organiser workspace", href: "/login" },
                ],
            },
            {
                title: "Resources",
                links: [
                    { name: "Privacy Policy", href: "https://www.meity.gov.in/policies", external: true },
                    { name: "Terms of Use", href: "https://www.india.gov.in/help/terms_of_use", external: true },
                    { name: "Contact", href: "mailto:contact@cdac.in", external: true },
                ],
            },
        ],
        copyright: `© ${year} WorkshopOS. All rights reserved.`,
        legalLinks: LEGAL,
        variant: "dark",
    }),
    ceg_portal: () => ({
        logo: {
            url: "/",
            src: "/images/logo.png",
            alt: "Centre for e-Governance programme logo",
            title: "Centre for e-Governance",
        },
        description: "National programme for digital literacy, e-governance awareness, and citizen services.",
        address: "1st Floor, Electronics Niketan, 6 CGO Complex, Lodhi Road, New Delhi – 110 003",
        socialLinks: [
            ...DEFAULT_CEG_SOCIAL_LINKS,
            { icon: "youtube", href: "https://www.youtube.com/@MeitYIndia", label: "YouTube" },
        ],
        sections: [
            {
                title: "Explore",
                links: [
                    { name: "Home", href: "/" },
                    { name: "About Us", href: "/about" },
                    { name: "Gallery", href: "/gallery" },
                    { name: "IT News", href: "/news" },
                    { name: "IT Events", href: "/events" },
                ],
            },
            {
                title: "Services",
                links: [
                    { name: "Request a Visit", href: "/request-visit" },
                    { name: "Downloads", href: "/downloads" },
                    { name: "Feedback", href: "/feedback" },
                    { name: "Contact Us", href: "/contact" },
                ],
            },
            {
                title: "Useful Links",
                links: [
                    { name: "Digital India", href: "https://digitalindia.gov.in/", external: true },
                    { name: "India.gov.in", href: "https://www.india.gov.in/", external: true },
                    { name: "C-DAC", href: "https://www.cdac.in/", external: true },
                    { name: "MyGov", href: "https://mygov.in/", external: true },
                ],
            },
        ],
        copyright: `© ${year} National e-Governance Programme. All rights reserved.`,
        legalLinks: [
            ...LEGAL,
            { name: "Sitemap", href: "/sitemap" },
            { name: "Feedback", href: "/feedback" },
        ],
        variant: "dark",
    }),
};
export function getProductFooterProps(product, basePath, overrides = {}) {
    return { ...footerPresets[product](basePath), ...overrides };
}
//# sourceMappingURL=footerPresets.js.map