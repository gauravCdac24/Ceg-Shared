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

export const visitLabels = {
  all: {
    sidebar: "All visits",
    paletteLabel: "All visits",
    pageTitle: "All visits",
    breadcrumb: "All visits",
  },
  upcoming: {
    sidebar: "Upcoming visits",
    paletteLabel: "Upcoming visit",
    pageTitle: "Upcoming visits",
    breadcrumb: "Upcoming",
  },
  submitted: {
    sidebar: "Needs review",
    paletteLabel: "Needs review",
    pageTitle: "Needs review",
    breadcrumb: "Needs review",
  },
  approved: {
    sidebar: "Approved",
    paletteLabel: "Approved",
    pageTitle: "Approved visits",
    breadcrumb: "Approved",
  },
  requisitionReview: {
    sidebar: "Signed forms",
    paletteLabel: "Signed forms",
    pageTitle: "Signed forms to check",
    breadcrumb: "Signed forms",
  },
  rejected: {
    sidebar: "Rejected",
    paletteLabel: "Rejected",
    pageTitle: "Rejected visits",
    breadcrumb: "Rejected",
  },
  completed: {
    sidebar: "Completed",
    paletteLabel: "Completed",
    pageTitle: "Completed visits",
    breadcrumb: "Completed",
  },
  offline: {
    sidebar: "Record offline visit",
    paletteLabel: "Record offline visit",
    pageTitle: "Record offline visit",
    breadcrumb: "Offline visit",
  },
  calendar: {
    sidebar: "Visit schedule",
    paletteLabel: "Visit schedule",
    pageTitle: "Visit schedule",
    breadcrumb: "Visit schedule",
  },
} as const satisfies LabelGroup;

export const quizLabels = {
  hub: {
    sidebar: "Assessments",
    paletteLabel: "Assessments",
    pageTitle: "Assessments",
    breadcrumb: "Assessments",
  },
  ranking: {
    sidebar: "Rankings",
    paletteLabel: "Rankings",
    pageTitle: "Rankings",
    breadcrumb: "Rankings",
  },
  rankingStudent: {
    sidebar: "Student",
    paletteLabel: "Student rankings",
    pageTitle: "Student rankings",
    breadcrumb: "Student",
  },
  rankingFaculty: {
    sidebar: "Faculty",
    paletteLabel: "Faculty rankings",
    pageTitle: "Faculty rankings",
    breadcrumb: "Faculty",
  },
  rankingPublic: {
    sidebar: "Public quiz",
    paletteLabel: "Public quiz rankings",
    pageTitle: "Public quiz rankings",
    breadcrumb: "Public",
  },
  platformEmbed: {
    sidebar: "Open QuizForge",
    paletteLabel: "Open QuizForge",
    pageTitle: "Open QuizForge",
    breadcrumb: "QuizForge",
  },
} as const satisfies LabelGroup;

export const certificateLabels = {
  hub: {
    sidebar: "Certificates",
    paletteLabel: "Certificates",
    pageTitle: "Certificates",
    breadcrumb: "Certificates",
  },
  operations: {
    sidebar: "Batches",
    paletteLabel: "Certificate batches",
    pageTitle: "Certificate batches",
    breadcrumb: "Batches",
  },
  studio: {
    sidebar: "Design templates",
    paletteLabel: "Design templates",
    pageTitle: "Issue certificates",
    breadcrumb: "Design templates",
  },
  visitBatches: {
    sidebar: "Certificate batches",
    paletteLabel: "Certificate batches",
    pageTitle: "Certificate batches",
    breadcrumb: "Batches",
  },
} as const satisfies LabelGroup;

export const galleryLabels = {
  hub: {
    sidebar: "Photo gallery",
    paletteLabel: "Photo gallery",
    pageTitle: "Photo gallery",
    breadcrumb: "Photo gallery",
  },
  carousel: {
    sidebar: "Home page media",
    paletteLabel: "Home page media",
    pageTitle: "Home page media",
    breadcrumb: "Home page media",
  },
  glimpses: {
    sidebar: "Home page media",
    paletteLabel: "Home page media",
    pageTitle: "Home page media",
    breadcrumb: "Home page media",
  },
} as const satisfies LabelGroup;

export const newsLabels = {
  news: {
    sidebar: "News",
    paletteLabel: "News",
    pageTitle: "News",
    breadcrumb: "News",
  },
  events: {
    sidebar: "Events",
    paletteLabel: "Events",
    pageTitle: "Events",
    breadcrumb: "Events",
  },
} as const satisfies LabelGroup;

export const settingsLabels = {
  preferences: {
    sidebar: "Settings",
    paletteLabel: "Settings",
    pageTitle: "Settings",
    breadcrumb: "Settings",
  },
  apiKeys: {
    sidebar: "Connected products",
    paletteLabel: "Connected products",
    pageTitle: "Connected products",
    breadcrumb: "Connected products",
  },
  integrationGuide: {
    sidebar: "How products connect",
    paletteLabel: "How products connect",
    pageTitle: "How products connect",
    breadcrumb: "How products connect",
  },
  password: {
    sidebar: "Change password",
    paletteLabel: "Change password",
    pageTitle: "Change password",
    breadcrumb: "Password",
  },
} as const satisfies LabelGroup;

export const platformLabels = {
  overview: {
    sidebar: "Overview",
    paletteLabel: "Overview",
    pageTitle: "Platform",
    breadcrumb: "Overview",
  },
  tenants: {
    sidebar: "Organisations",
    paletteLabel: "Organisations",
    pageTitle: "Organisations",
    breadcrumb: "Organisations",
  },
  users: {
    sidebar: "Users",
    paletteLabel: "Users",
    pageTitle: "Users",
    breadcrumb: "Users",
  },
  apiKeys: {
    sidebar: "Product keys",
    paletteLabel: "Product keys",
    pageTitle: "Product keys",
    breadcrumb: "Product keys",
  },
  setupGuide: {
    sidebar: "Setup guide",
    paletteLabel: "Setup guide",
    pageTitle: "Setup guide",
    breadcrumb: "Setup guide",
  },
  failedTasks: {
    sidebar: "Failed tasks",
    paletteLabel: "Failed tasks",
    pageTitle: "Failed tasks",
    breadcrumb: "Failed tasks",
  },
  activityLog: {
    sidebar: "Activity log",
    paletteLabel: "Activity log",
    pageTitle: "Activity log",
    breadcrumb: "Activity log",
  },
  handover: {
    sidebar: "Handover",
    paletteLabel: "Handover",
    pageTitle: "Handover",
    breadcrumb: "Handover",
  },
  commercial: {
    sidebar: "Plans & billing",
    paletteLabel: "Plans & billing",
    pageTitle: "Plans & billing",
    breadcrumb: "Plans & billing",
  },
  orgAdmins: {
    sidebar: "Org admin requests",
    paletteLabel: "Org admin requests",
    pageTitle: "Org admin requests",
    breadcrumb: "Org admins",
  },
  /** Display name for quizforge product surfaces (not Attendance). */
  quizHealth: {
    sidebar: "Quiz",
    paletteLabel: "Quiz health",
    pageTitle: "Quiz integration",
    breadcrumb: "Quiz",
  },
} as const satisfies LabelGroup;

export const labelRegistry = {
  visits: visitLabels,
  quiz: quizLabels,
  certificates: certificateLabels,
  gallery: galleryLabels,
  news: newsLabels,
  settings: settingsLabels,
  platform: platformLabels,
} as const;

export type LabelGroupKey = keyof typeof labelRegistry;

type NestedKeyOf<G extends LabelGroup> = keyof G & string;

export type LabelKey =
  | `visits.${NestedKeyOf<typeof visitLabels>}`
  | `quiz.${NestedKeyOf<typeof quizLabels>}`
  | `certificates.${NestedKeyOf<typeof certificateLabels>}`
  | `gallery.${NestedKeyOf<typeof galleryLabels>}`
  | `news.${NestedKeyOf<typeof newsLabels>}`
  | `settings.${NestedKeyOf<typeof settingsLabels>}`
  | `platform.${NestedKeyOf<typeof platformLabels>}`;

export type LabelField = keyof SurfaceLabels;

export function getLabel(key: LabelKey, field: LabelField = "pageTitle"): string {
  const [group, surface] = key.split(".") as [LabelGroupKey, string];
  const groupMap = labelRegistry[group] as LabelGroup | undefined;
  const entry = groupMap?.[surface];
  if (!entry) {
    return key;
  }
  return entry[field];
}

export function getSurfaceLabels(key: LabelKey): SurfaceLabels {
  const [group, surface] = key.split(".") as [LabelGroupKey, string];
  const groupMap = labelRegistry[group] as LabelGroup | undefined;
  const entry = groupMap?.[surface];
  if (!entry) {
    return { sidebar: key, paletteLabel: key, pageTitle: key, breadcrumb: key };
  }
  return entry;
}
