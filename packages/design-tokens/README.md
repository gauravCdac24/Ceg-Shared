# @ceg/design-tokens

Fleet-wide design tokens for CeG monorepo frontends. **Canonical source** for new products; Cert Studio migrates via CSS alias layer (PS-DS-001).

## Install

```bash
# pnpm workspace (recommended)
pnpm add @ceg/design-tokens

# In app entry (e.g. main.tsx)
import '@ceg/design-tokens/styles.css';
```

## JS exports (`src/index.js`)

| Export | Use |
|--------|-----|
| `palette` | Brand colors (CeG blue/green) |
| `govPalette` | Government anti-slop palette |
| `govNeverDo` | PR review checklist — patterns to reject |
| `spacing` | 4px base scale |
| `typography` / `uiRoles` | Type scale + semantic roles |
| `surfaces` | Card/panel elevation presets |
| `fonts` | Heading/body/mono stacks |

## CSS variables (`styles.css` / `ceg-gov.css`)

Import `styles.css` for default fleet tokens, or `ceg-gov.css` for government lane.

**Product semantic palettes (MOD-001):**

```ts
import '@ceg/design-tokens/styles.css';
import '@ceg/design-tokens/product-workshopos.css'; // or product-fetchdesk.css
import '@ceg/design-tokens/semantic-base.css';     // optional fleet role bridge
```

| Product | CSS import | Prefix |
|---------|------------|--------|
| WorkshopOS | `product-workshopos.css` | `--wos-*` (teal ops) |
| FetchDesk | `product-fetchdesk.css` | `--fd-*` (terminal editorial) |

## Cert Studio alias mapping (migration)

Cert Studio uses product-local `--primary`, `--surface`, etc. Map to fleet tokens without breaking existing CSS:

| Cert Studio var | `@ceg/design-tokens` | `govPalette` / `palette` |
|-----------------|------------------------|---------------------------|
| `--primary` | `--ceg-color-primary` | `#1B4F8A` / `#1B3A6B` |
| `--primary-dark` | `--ceg-color-primary-dark` | `#14395f` / `#122847` |
| `--accent` | `--ceg-color-accent` | `#00A86B` / `#C8932A` |
| `--surface` | `--ceg-color-surface` | `#F7F9FC` / `#FFFFFF` |
| `--surface-2` | `--ceg-color-surface-2` | — / `#F4F6F9` |
| `--text-primary` | `--ceg-color-text-primary` | `#1A2332` / `#1A1A2E` |
| `--text-secondary` | `--ceg-color-text-secondary` | `#6B7A99` / `#4A5568` |
| `--error` | `--ceg-color-error` | `#b7131a` / `#9B1C1C` |
| `--success` | `--ceg-color-success` | `#198754` / `#2D7D46` |
| `--warning` | `--ceg-color-warning` | `#b77224` / `#B45309` |
| `--radius-sm` | `--ceg-radius-sm` | `4px` |
| `--radius-md` | `--ceg-radius-md` | `8px` |
| `--shadow-sm` | `--ceg-shadow-sm` | see `styles.css` |

**Migration steps (per product):**

1. Import `@ceg/design-tokens/styles.css` before product CSS.
2. Add alias block in product `tokens.css`: `--primary: var(--ceg-color-primary);` etc.
3. Remove duplicate hex values from product theme files over time.
4. Enforce `govNeverDo` in PR review for gov-facing products.

## Product adoption status

| Product | Token source | Target |
|---------|--------------|--------|
| CeG Portal | `@ceg/design-tokens` + MUI theme | ✅ canonical |
| WorkshopOS | `@ceg/design-tokens` + branding vars | ✅ |
| QuizForge | `@ceg/design-tokens` + Tailwind | ✅ |
| FetchDesk | `@ceg/design-tokens` | ✅ |
| Cert Studio | Local `tokens.css` | Alias → fleet (PS-DS-001) |

## Tests

```bash
cd packages/design-tokens && npm test
```

## References

- `docs/platform-standards/CEG-PLATFORM-STANDARDS.md` — PS-DS-001
- `packages/design-tokens/style-guide.html` — visual reference
