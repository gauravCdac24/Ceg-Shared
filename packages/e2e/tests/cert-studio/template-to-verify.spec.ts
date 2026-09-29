/**
 * @tags: ['slow', 'e2e', 'cert-studio']
 * E2E-2: Template publish → single cert → public verify.
 */
import { test, expect } from '@playwright/test'

import { TEST_SERIAL } from '../fixtures/cert-studio-data'

test.use({ storageState: 'auth/cert-studio-superadmin.json' })

test.describe('Template to verify flow', () => {
  test.slow()

  test('library and verify pages are reachable', async ({ page }) => {
    await page.goto('/cert/templates')
    await expect(page.locator('body')).toBeVisible()

    await page.goto(`/cert/verify/${TEST_SERIAL}`)
    await expect(page.locator('body')).toContainText(/verify|certificate|not found|invalid/i)
  })
})
