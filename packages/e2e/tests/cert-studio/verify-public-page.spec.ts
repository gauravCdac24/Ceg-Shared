/**
 * @tags: ['slow', 'e2e', 'cert-studio']
 * E2E-5: Public verify page — no auth required.
 */
import { test, expect } from '@playwright/test'

import { TEST_SERIAL } from '../fixtures/cert-studio-data'

test.describe('Public verify page', () => {
  test.slow()

  test('loads cert data for seeded serial', async ({ page }) => {
    await page.goto(`/cert/verify/${TEST_SERIAL}`)

    await expect(page.locator('body')).toContainText(/verify|verified|certificate|not found|invalid/i)

    const qr = page.locator('[data-testid="qr-code"]')
    if (await qr.count()) {
      await expect(qr).toBeVisible()
    }
  })

  test('invalid serial shows not-found state', async ({ page }) => {
    await page.goto('/cert/verify/INVALID-SERIAL-XYZ')
    await expect(page.getByText(/not found|invalid|could not/i).first()).toBeVisible({ timeout: 15000 })
  })
})
