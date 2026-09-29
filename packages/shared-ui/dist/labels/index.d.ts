/**
 * Per-surface operator copy. Consumers (sidebar, palette, page title, breadcrumb)
 * should import via useLabel / getLabel — do not hand-duplicate strings.
 *
 * M1: registry only. Migrate consumers in M2+.
 */
export type SurfaceLabels = {
    /** Sidebar / nav item */
    sidebar: string;
    /** ⌘K command palette */
    paletteLabel: string;
    /** Page H1 / AdminPageHeader title */
    pageTitle: string;
    /** Breadcrumb leaf (often shorter than pageTitle) */
    breadcrumb: string;
};
export type LabelGroup = Record<string, SurfaceLabels>;
export declare const visitLabels: {
    readonly all: {
        readonly sidebar: "All visits";
        readonly paletteLabel: "All visits";
        readonly pageTitle: "All visits";
        readonly breadcrumb: "All visits";
    };
    readonly upcoming: {
        readonly sidebar: "Upcoming visits";
        readonly paletteLabel: "Upcoming visit";
        readonly pageTitle: "Upcoming visits";
        readonly breadcrumb: "Upcoming";
    };
    readonly submitted: {
        readonly sidebar: "Needs review";
        readonly paletteLabel: "Needs review";
        readonly pageTitle: "Needs review";
        readonly breadcrumb: "Needs review";
    };
    readonly approved: {
        readonly sidebar: "Approved";
        readonly paletteLabel: "Approved";
        readonly pageTitle: "Approved visits";
        readonly breadcrumb: "Approved";
    };
    readonly requisitionReview: {
        readonly sidebar: "Signed forms";
        readonly paletteLabel: "Signed forms";
        readonly pageTitle: "Signed forms to check";
        readonly breadcrumb: "Signed forms";
    };
    readonly rejected: {
        readonly sidebar: "Rejected";
        readonly paletteLabel: "Rejected";
        readonly pageTitle: "Rejected visits";
        readonly breadcrumb: "Rejected";
    };
    readonly completed: {
        readonly sidebar: "Completed";
        readonly paletteLabel: "Completed";
        readonly pageTitle: "Completed visits";
        readonly breadcrumb: "Completed";
    };
    readonly offline: {
        readonly sidebar: "Record offline visit";
        readonly paletteLabel: "Record offline visit";
        readonly pageTitle: "Record offline visit";
        readonly breadcrumb: "Offline visit";
    };
    readonly calendar: {
        readonly sidebar: "Visit schedule";
        readonly paletteLabel: "Visit schedule";
        readonly pageTitle: "Visit schedule";
        readonly breadcrumb: "Visit schedule";
    };
};
export declare const quizLabels: {
    readonly hub: {
        readonly sidebar: "Assessments";
        readonly paletteLabel: "Assessments";
        readonly pageTitle: "Assessments";
        readonly breadcrumb: "Assessments";
    };
    readonly ranking: {
        readonly sidebar: "Rankings";
        readonly paletteLabel: "Rankings";
        readonly pageTitle: "Rankings";
        readonly breadcrumb: "Rankings";
    };
    readonly rankingStudent: {
        readonly sidebar: "Student";
        readonly paletteLabel: "Student rankings";
        readonly pageTitle: "Student rankings";
        readonly breadcrumb: "Student";
    };
    readonly rankingFaculty: {
        readonly sidebar: "Faculty";
        readonly paletteLabel: "Faculty rankings";
        readonly pageTitle: "Faculty rankings";
        readonly breadcrumb: "Faculty";
    };
    readonly rankingPublic: {
        readonly sidebar: "Public quiz";
        readonly paletteLabel: "Public quiz rankings";
        readonly pageTitle: "Public quiz rankings";
        readonly breadcrumb: "Public";
    };
    readonly platformEmbed: {
        readonly sidebar: "Open QuizForge";
        readonly paletteLabel: "Open QuizForge";
        readonly pageTitle: "Open QuizForge";
        readonly breadcrumb: "QuizForge";
    };
};
export declare const certificateLabels: {
    readonly hub: {
        readonly sidebar: "Certificates";
        readonly paletteLabel: "Certificates";
        readonly pageTitle: "Certificates";
        readonly breadcrumb: "Certificates";
    };
    readonly operations: {
        readonly sidebar: "Batches";
        readonly paletteLabel: "Certificate batches";
        readonly pageTitle: "Certificate batches";
        readonly breadcrumb: "Batches";
    };
    readonly studio: {
        readonly sidebar: "Design templates";
        readonly paletteLabel: "Design templates";
        readonly pageTitle: "Issue certificates";
        readonly breadcrumb: "Design templates";
    };
    readonly visitBatches: {
        readonly sidebar: "Certificate batches";
        readonly paletteLabel: "Certificate batches";
        readonly pageTitle: "Certificate batches";
        readonly breadcrumb: "Batches";
    };
};
export declare const galleryLabels: {
    readonly hub: {
        readonly sidebar: "Photo gallery";
        readonly paletteLabel: "Photo gallery";
        readonly pageTitle: "Photo gallery";
        readonly breadcrumb: "Photo gallery";
    };
    readonly carousel: {
        readonly sidebar: "Home page media";
        readonly paletteLabel: "Home page media";
        readonly pageTitle: "Home page media";
        readonly breadcrumb: "Home page media";
    };
    readonly glimpses: {
        readonly sidebar: "Home page media";
        readonly paletteLabel: "Home page media";
        readonly pageTitle: "Home page media";
        readonly breadcrumb: "Home page media";
    };
};
export declare const newsLabels: {
    readonly news: {
        readonly sidebar: "News";
        readonly paletteLabel: "News";
        readonly pageTitle: "News";
        readonly breadcrumb: "News";
    };
    readonly events: {
        readonly sidebar: "Events";
        readonly paletteLabel: "Events";
        readonly pageTitle: "Events";
        readonly breadcrumb: "Events";
    };
};
export declare const settingsLabels: {
    readonly preferences: {
        readonly sidebar: "Settings";
        readonly paletteLabel: "Settings";
        readonly pageTitle: "Settings";
        readonly breadcrumb: "Settings";
    };
    readonly apiKeys: {
        readonly sidebar: "Connected products";
        readonly paletteLabel: "Connected products";
        readonly pageTitle: "Connected products";
        readonly breadcrumb: "Connected products";
    };
    readonly integrationGuide: {
        readonly sidebar: "How products connect";
        readonly paletteLabel: "How products connect";
        readonly pageTitle: "How products connect";
        readonly breadcrumb: "How products connect";
    };
    readonly password: {
        readonly sidebar: "Change password";
        readonly paletteLabel: "Change password";
        readonly pageTitle: "Change password";
        readonly breadcrumb: "Password";
    };
};
export declare const platformLabels: {
    readonly overview: {
        readonly sidebar: "Overview";
        readonly paletteLabel: "Overview";
        readonly pageTitle: "Platform";
        readonly breadcrumb: "Overview";
    };
    readonly tenants: {
        readonly sidebar: "Organisations";
        readonly paletteLabel: "Organisations";
        readonly pageTitle: "Organisations";
        readonly breadcrumb: "Organisations";
    };
    readonly users: {
        readonly sidebar: "Users";
        readonly paletteLabel: "Users";
        readonly pageTitle: "Users";
        readonly breadcrumb: "Users";
    };
    readonly apiKeys: {
        readonly sidebar: "Product keys";
        readonly paletteLabel: "Product keys";
        readonly pageTitle: "Product keys";
        readonly breadcrumb: "Product keys";
    };
    readonly setupGuide: {
        readonly sidebar: "Setup guide";
        readonly paletteLabel: "Setup guide";
        readonly pageTitle: "Setup guide";
        readonly breadcrumb: "Setup guide";
    };
    readonly failedTasks: {
        readonly sidebar: "Failed tasks";
        readonly paletteLabel: "Failed tasks";
        readonly pageTitle: "Failed tasks";
        readonly breadcrumb: "Failed tasks";
    };
    readonly activityLog: {
        readonly sidebar: "Activity log";
        readonly paletteLabel: "Activity log";
        readonly pageTitle: "Activity log";
        readonly breadcrumb: "Activity log";
    };
    readonly handover: {
        readonly sidebar: "Handover";
        readonly paletteLabel: "Handover";
        readonly pageTitle: "Handover";
        readonly breadcrumb: "Handover";
    };
    readonly commercial: {
        readonly sidebar: "Plans & billing";
        readonly paletteLabel: "Plans & billing";
        readonly pageTitle: "Plans & billing";
        readonly breadcrumb: "Plans & billing";
    };
    readonly orgAdmins: {
        readonly sidebar: "Org admin requests";
        readonly paletteLabel: "Org admin requests";
        readonly pageTitle: "Org admin requests";
        readonly breadcrumb: "Org admins";
    };
    /** Display name for quizforge product surfaces (not Attendance). */
    readonly quizHealth: {
        readonly sidebar: "Quiz";
        readonly paletteLabel: "Quiz health";
        readonly pageTitle: "Quiz integration";
        readonly breadcrumb: "Quiz";
    };
};
export declare const labelRegistry: {
    readonly visits: {
        readonly all: {
            readonly sidebar: "All visits";
            readonly paletteLabel: "All visits";
            readonly pageTitle: "All visits";
            readonly breadcrumb: "All visits";
        };
        readonly upcoming: {
            readonly sidebar: "Upcoming visits";
            readonly paletteLabel: "Upcoming visit";
            readonly pageTitle: "Upcoming visits";
            readonly breadcrumb: "Upcoming";
        };
        readonly submitted: {
            readonly sidebar: "Needs review";
            readonly paletteLabel: "Needs review";
            readonly pageTitle: "Needs review";
            readonly breadcrumb: "Needs review";
        };
        readonly approved: {
            readonly sidebar: "Approved";
            readonly paletteLabel: "Approved";
            readonly pageTitle: "Approved visits";
            readonly breadcrumb: "Approved";
        };
        readonly requisitionReview: {
            readonly sidebar: "Signed forms";
            readonly paletteLabel: "Signed forms";
            readonly pageTitle: "Signed forms to check";
            readonly breadcrumb: "Signed forms";
        };
        readonly rejected: {
            readonly sidebar: "Rejected";
            readonly paletteLabel: "Rejected";
            readonly pageTitle: "Rejected visits";
            readonly breadcrumb: "Rejected";
        };
        readonly completed: {
            readonly sidebar: "Completed";
            readonly paletteLabel: "Completed";
            readonly pageTitle: "Completed visits";
            readonly breadcrumb: "Completed";
        };
        readonly offline: {
            readonly sidebar: "Record offline visit";
            readonly paletteLabel: "Record offline visit";
            readonly pageTitle: "Record offline visit";
            readonly breadcrumb: "Offline visit";
        };
        readonly calendar: {
            readonly sidebar: "Visit schedule";
            readonly paletteLabel: "Visit schedule";
            readonly pageTitle: "Visit schedule";
            readonly breadcrumb: "Visit schedule";
        };
    };
    readonly quiz: {
        readonly hub: {
            readonly sidebar: "Assessments";
            readonly paletteLabel: "Assessments";
            readonly pageTitle: "Assessments";
            readonly breadcrumb: "Assessments";
        };
        readonly ranking: {
            readonly sidebar: "Rankings";
            readonly paletteLabel: "Rankings";
            readonly pageTitle: "Rankings";
            readonly breadcrumb: "Rankings";
        };
        readonly rankingStudent: {
            readonly sidebar: "Student";
            readonly paletteLabel: "Student rankings";
            readonly pageTitle: "Student rankings";
            readonly breadcrumb: "Student";
        };
        readonly rankingFaculty: {
            readonly sidebar: "Faculty";
            readonly paletteLabel: "Faculty rankings";
            readonly pageTitle: "Faculty rankings";
            readonly breadcrumb: "Faculty";
        };
        readonly rankingPublic: {
            readonly sidebar: "Public quiz";
            readonly paletteLabel: "Public quiz rankings";
            readonly pageTitle: "Public quiz rankings";
            readonly breadcrumb: "Public";
        };
        readonly platformEmbed: {
            readonly sidebar: "Open QuizForge";
            readonly paletteLabel: "Open QuizForge";
            readonly pageTitle: "Open QuizForge";
            readonly breadcrumb: "QuizForge";
        };
    };
    readonly certificates: {
        readonly hub: {
            readonly sidebar: "Certificates";
            readonly paletteLabel: "Certificates";
            readonly pageTitle: "Certificates";
            readonly breadcrumb: "Certificates";
        };
        readonly operations: {
            readonly sidebar: "Batches";
            readonly paletteLabel: "Certificate batches";
            readonly pageTitle: "Certificate batches";
            readonly breadcrumb: "Batches";
        };
        readonly studio: {
            readonly sidebar: "Design templates";
            readonly paletteLabel: "Design templates";
            readonly pageTitle: "Issue certificates";
            readonly breadcrumb: "Design templates";
        };
        readonly visitBatches: {
            readonly sidebar: "Certificate batches";
            readonly paletteLabel: "Certificate batches";
            readonly pageTitle: "Certificate batches";
            readonly breadcrumb: "Batches";
        };
    };
    readonly gallery: {
        readonly hub: {
            readonly sidebar: "Photo gallery";
            readonly paletteLabel: "Photo gallery";
            readonly pageTitle: "Photo gallery";
            readonly breadcrumb: "Photo gallery";
        };
        readonly carousel: {
            readonly sidebar: "Home page media";
            readonly paletteLabel: "Home page media";
            readonly pageTitle: "Home page media";
            readonly breadcrumb: "Home page media";
        };
        readonly glimpses: {
            readonly sidebar: "Home page media";
            readonly paletteLabel: "Home page media";
            readonly pageTitle: "Home page media";
            readonly breadcrumb: "Home page media";
        };
    };
    readonly news: {
        readonly news: {
            readonly sidebar: "News";
            readonly paletteLabel: "News";
            readonly pageTitle: "News";
            readonly breadcrumb: "News";
        };
        readonly events: {
            readonly sidebar: "Events";
            readonly paletteLabel: "Events";
            readonly pageTitle: "Events";
            readonly breadcrumb: "Events";
        };
    };
    readonly settings: {
        readonly preferences: {
            readonly sidebar: "Settings";
            readonly paletteLabel: "Settings";
            readonly pageTitle: "Settings";
            readonly breadcrumb: "Settings";
        };
        readonly apiKeys: {
            readonly sidebar: "Connected products";
            readonly paletteLabel: "Connected products";
            readonly pageTitle: "Connected products";
            readonly breadcrumb: "Connected products";
        };
        readonly integrationGuide: {
            readonly sidebar: "How products connect";
            readonly paletteLabel: "How products connect";
            readonly pageTitle: "How products connect";
            readonly breadcrumb: "How products connect";
        };
        readonly password: {
            readonly sidebar: "Change password";
            readonly paletteLabel: "Change password";
            readonly pageTitle: "Change password";
            readonly breadcrumb: "Password";
        };
    };
    readonly platform: {
        readonly overview: {
            readonly sidebar: "Overview";
            readonly paletteLabel: "Overview";
            readonly pageTitle: "Platform";
            readonly breadcrumb: "Overview";
        };
        readonly tenants: {
            readonly sidebar: "Organisations";
            readonly paletteLabel: "Organisations";
            readonly pageTitle: "Organisations";
            readonly breadcrumb: "Organisations";
        };
        readonly users: {
            readonly sidebar: "Users";
            readonly paletteLabel: "Users";
            readonly pageTitle: "Users";
            readonly breadcrumb: "Users";
        };
        readonly apiKeys: {
            readonly sidebar: "Product keys";
            readonly paletteLabel: "Product keys";
            readonly pageTitle: "Product keys";
            readonly breadcrumb: "Product keys";
        };
        readonly setupGuide: {
            readonly sidebar: "Setup guide";
            readonly paletteLabel: "Setup guide";
            readonly pageTitle: "Setup guide";
            readonly breadcrumb: "Setup guide";
        };
        readonly failedTasks: {
            readonly sidebar: "Failed tasks";
            readonly paletteLabel: "Failed tasks";
            readonly pageTitle: "Failed tasks";
            readonly breadcrumb: "Failed tasks";
        };
        readonly activityLog: {
            readonly sidebar: "Activity log";
            readonly paletteLabel: "Activity log";
            readonly pageTitle: "Activity log";
            readonly breadcrumb: "Activity log";
        };
        readonly handover: {
            readonly sidebar: "Handover";
            readonly paletteLabel: "Handover";
            readonly pageTitle: "Handover";
            readonly breadcrumb: "Handover";
        };
        readonly commercial: {
            readonly sidebar: "Plans & billing";
            readonly paletteLabel: "Plans & billing";
            readonly pageTitle: "Plans & billing";
            readonly breadcrumb: "Plans & billing";
        };
        readonly orgAdmins: {
            readonly sidebar: "Org admin requests";
            readonly paletteLabel: "Org admin requests";
            readonly pageTitle: "Org admin requests";
            readonly breadcrumb: "Org admins";
        };
        /** Display name for quizforge product surfaces (not Attendance). */
        readonly quizHealth: {
            readonly sidebar: "Quiz";
            readonly paletteLabel: "Quiz health";
            readonly pageTitle: "Quiz integration";
            readonly breadcrumb: "Quiz";
        };
    };
};
export type LabelGroupKey = keyof typeof labelRegistry;
type NestedKeyOf<G extends LabelGroup> = keyof G & string;
export type LabelKey = `visits.${NestedKeyOf<typeof visitLabels>}` | `quiz.${NestedKeyOf<typeof quizLabels>}` | `certificates.${NestedKeyOf<typeof certificateLabels>}` | `gallery.${NestedKeyOf<typeof galleryLabels>}` | `news.${NestedKeyOf<typeof newsLabels>}` | `settings.${NestedKeyOf<typeof settingsLabels>}` | `platform.${NestedKeyOf<typeof platformLabels>}`;
export type LabelField = keyof SurfaceLabels;
export declare function getLabel(key: LabelKey, field?: LabelField): string;
export declare function getSurfaceLabels(key: LabelKey): SurfaceLabels;
export {};
//# sourceMappingURL=index.d.ts.map