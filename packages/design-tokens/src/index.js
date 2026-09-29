export const fonts = {
  heading: '"Plus Jakarta Sans", "Inter", "Segoe UI", sans-serif',
  body: '"Inter", "Segoe UI", "Helvetica Neue", Arial, sans-serif',
  mono: '"JetBrains Mono", "Consolas", "Courier New", monospace',
};

export const palette = {
  primary: "#1B4F8A",
  primaryDark: "#14395f",
  primaryLight: "#3e74b8",
  accent: "#00A86B",
  surface: "#F7F9FC",
  textPrimary: "#1A2332",
  textSecondary: "#6B7A99",
  success: "#198754",
  warning: "#b77224",
  error: "#b7131a",
  info: "#0ea5e9",
};

/** Government anti-slop design system — use with `@ceg/design-tokens/ceg-gov.css`. */
export const govPalette = {
  primary: "#1B3A6B",
  primaryLight: "#2D5AA0",
  primaryDark: "#122847",
  accent: "#C8932A",
  accentLight: "#E8B84B",
  success: "#2D7D46",
  warning: "#B45309",
  error: "#9B1C1C",
  surface: "#FFFFFF",
  surface2: "#F4F6F9",
  surface3: "#E8ECF2",
  textPrimary: "#1A1A2E",
  textSecondary: "#4A5568",
  textMuted: "#718096",
};

export const govNeverDo = [
  "No purple/violet gradients on cards or hero sections",
  "No pill buttons (9999px radius) except small tags",
  "No glassmorphism / backdrop-filter on main content",
  "No emoji as navigation or heading icons",
  "No gradient text (background-clip: text)",
  "No full-width stretched buttons in desktop tables",
  "No card grids where a data table is appropriate",
  "No font-weight 300 on body text",
  "No 30–60px blur shadows",
];

/** 4px base spacing scale */
export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
};

/** rem-based type scale — align with mandatory UX audit (Sub-Agent 2) */
export const typography = {
  xs: { size: "0.75rem", lineHeight: 1.25 }, // helper text (12px min)
  sm: { size: "0.875rem", lineHeight: 1.5 }, // body, table cells, form labels (14px)
  base: { size: "1rem", lineHeight: 1.5 },
  lg: { size: "1.125rem", lineHeight: 1.45 }, // section subtitle (18px)
  xl: { size: "1.25rem", lineHeight: 1.35 },
  "2xl": { size: "1.5rem", lineHeight: 1.3 }, // page title floor (24px)
  "3xl": { size: "1.75rem", lineHeight: 1.25 }, // page title (28px)
};

/** Semantic UI roles mapped to typography tokens */
export const uiRoles = {
  pageTitle: typography["3xl"],
  sectionSubtitle: typography.lg,
  body: typography.sm,
  tableCell: typography.sm,
  formLabel: typography.sm,
  helper: typography.xs,
  button: typography.sm,
};

export const shadows = {
  sm: "0 1px 2px rgba(15, 23, 42, 0.06)",
  md: "0 4px 12px rgba(15, 23, 42, 0.08)",
  lg: "0 8px 24px rgba(15, 23, 42, 0.1)",
  xl: "0 16px 40px rgba(15, 23, 42, 0.14)",
};

export const motion = {
  easingEntrance: "cubic-bezier(0.22, 1, 0.36, 1)",
  durationEntranceMs: 400,
  durationHoverMs: 200,
  translateHoverY: "-3px",
  staggerMs: 70,
};

export const shape = {
  radiusSm: 10,
  radiusMd: 16,
  radiusLg: 20,
  radiusXl: 28,
};

/** CSS class names from `styles.css` — glass / clay / frosted surfaces + motion lift. */
export const surfaces = {
  glassCard: "ceg-glass-card",
  clayCard: "ceg-clay-card",
  frostedModal: "ceg-frosted-modal",
  motionLift: "ceg-motion-lift",
};

/**
 * Optional stagger utility for list/card entrance animations.
 * Add `data-stagger` on a container and `data-stagger-item` on children.
 */
export function createStaggerRevealObserver(root = document) {
  if (typeof window === "undefined" || !("IntersectionObserver" in window)) {
    return { disconnect: () => {} };
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const items = entry.target.querySelectorAll("[data-stagger-item]");
        items.forEach((item, index) => {
          item.style.setProperty("--ceg-stagger-index", String(index));
          item.classList.add("ceg-stagger-in");
        });
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.2 },
  );

  root.querySelectorAll?.("[data-stagger]").forEach((node) => observer.observe(node));
  return observer;
}
