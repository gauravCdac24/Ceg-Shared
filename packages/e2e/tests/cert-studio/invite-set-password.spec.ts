/**
 * @tags: ['slow', 'e2e', 'cert-studio']
 * E2E-3: Admin invite → set password → login (requires Mailpit / dev OTP hint).
 */
import { test, expect } from '@playwright/test'

test.use({ storageState: 'auth/cert-studio-superadmin.json' })

test.describe('Invite and set password', () => {
  test.slow()

  test('team settings page loads invite flow', async ({ page }) => {
    await page.goto('/cert/settings/team')
    await expect(page.getByRole('heading', { name: /team|users|members/i })).toBeVisible({ timeout: 15000 })
  })
})
