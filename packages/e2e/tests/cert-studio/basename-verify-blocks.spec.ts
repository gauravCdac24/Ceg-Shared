/**
 * @tags: ['slow', 'e2e', 'cert-studio', 'basename']
 *
 * E2E-verify: basename-safe navigation from editor blocks.
 *
 * Regression targeted:
 * - CertVerifyBlock uses React Router navigation (basename-safe).
 * - ButtonBlock verify_certificate must NOT fall back to appPath/window.location.href.
 */
import { test, expect } from '@playwright/test'

import { TEST_SERIAL } from '../fixtures/cert-studio-data'

test.use({ storageState: 'auth/cert-studio-superadmin.json' })

const ORG_HELPER = '{{org_name}}'
const VERIFY_CODE = TEST_SERIAL

function escapeRegex(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildCraftStateWithButton() {
  return JSON.stringify({
    ROOT: {
      type: { resolvedName: 'PageRoot' },
      isCanvas: true,
      props: {},
      nodes: ['hero-default', 'verify-default', 'button-verify'],
      linkedNodes: {},
    },
    'hero-default': {
      type: { resolvedName: 'HeroBlock' },
      isCanvas: false,
      props: {
        title: ORG_HELPER,
        subtitle: 'Verify certificate authenticity using your certificate ID.',
        showLogo: true,
        alignment: 'center',
        paddingY: 48,
      },
      nodes: [],
      linkedNodes: {},
    },
    'verify-default': {
      type: { resolvedName: 'CertVerifyBlock' },
      isCanvas: false,
      props: {
        title: 'Verify a certificate',
        helperText: `Lookup credentials issued by ${ORG_HELPER}.`,
        placeholder: 'Enter certificate ID',
        buttonLabel: 'Verify now',
        verifyUrlHint: '{{verify_url}}',
        showQrHint: true,
        accentColor: 'var(--primary-color, #2563eb)',
      },
      nodes: [],
      linkedNodes: {},
    },
    'button-verify': {
      type: { resolvedName: 'ButtonBlock' },
      isCanvas: false,
      props: {
        label: 'Verify via button',
        variant: 'primary',
        size: 'medium',
        backgroundColor: 'var(--primary-color, #2563eb)',
        textColor: '#ffffff',
        borderRadius: 10,
        alignment: 'center',
        fullWidth: false,
        action: {
          type: 'verify_certificate',
          certificateCode: VERIFY_CODE,
        },
      },
      nodes: [],
      linkedNodes: {},
    },
  })
}

async function getCsrfToken(page) {
  return page.evaluate(() => {
    const m = document.cookie.match(/(?:^|;\\s*)csrftoken=([^;]+)/i)
    return m ? decodeURIComponent(m[1]) : ''
  })
}

test.describe('Basename-safe verify navigation', () => {
  test('CertVerifyBlock + ButtonBlock both land on /cert/verify/org/:slug/:code', async ({ page, context }) => {
    const craftState = buildCraftStateWithButton()

    // 1) Ensure CSRF cookie is primed (server sets csrftoken via /v1/auth/csrf).
    await page.goto('/cert/dashboard')
    await page.evaluate(() => fetch('/cert/v1/auth/csrf', { credentials: 'include' }))
    const csrf = await getCsrfToken(page)
    expect(csrf).not.toBe('')

    // 2) Seed the org public presence landing craft_state.
    await page.evaluate(
      async ({ craftState, csrfToken }) => {
        const res = await fetch('/cert/v1/settings/public-landing', {
          method: 'PUT',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-Token': csrfToken,
          },
          body: JSON.stringify({
            craft_state: craftState,
            mode: 'draft',
            seo_title: '',
            seo_description: '',
            watermark: {},
            page_background: {},
          }),
        })
        if (!res.ok) {
          const text = await res.text()
          throw new Error(`public-landing PUT failed: ${res.status} ${text}`)
        }
      },
      { craftState, csrfToken: csrf },
    )

    // 3) Open Experience Studio editor (public presence) and preview draft.
    await page.evaluate(() => localStorage.removeItem('certstudio-landing-draft'))
    await page.goto('/cert/settings/public-presence/studio')

    const previewBtn = page.locator('.org-landing-studio__toolbar-actions button', { hasText: /Preview/i }).first()
    await expect(previewBtn).toBeVisible({ timeout: 30_000 })

    const [previewPage] = await Promise.all([
      context.waitForEvent('page'),
      previewBtn.click(),
    ])

    await expect(previewPage).toHaveURL(/\/cert\/org\/.+\?preview=1/, { timeout: 30_000 })

    const previewUrl = previewPage.url()
    const orgSlug = new URL(previewUrl).pathname.split('/').pop() || ''
    expect(orgSlug).not.toBe('')

    // 4a) CertVerifyBlock submit.
    await previewPage.getByPlaceholder('Enter certificate ID').fill(VERIFY_CODE)
    await previewPage.getByRole('button', { name: /Verify now/i }).click()
    await expect(previewPage).toHaveURL(new RegExp(`/cert/verify/org/${orgSlug}/${escapeRegex(VERIFY_CODE)}`), {
      timeout: 30_000,
    })

    // 4b) ButtonBlock click (reload preview tab first).
    await previewPage.goto(previewUrl)
    await previewPage.getByRole('button', { name: 'Verify via button' }).click()
    await expect(previewPage).toHaveURL(new RegExp(`/cert/verify/org/${orgSlug}/${escapeRegex(VERIFY_CODE)}`), {
      timeout: 30_000,
    })
  })
})

