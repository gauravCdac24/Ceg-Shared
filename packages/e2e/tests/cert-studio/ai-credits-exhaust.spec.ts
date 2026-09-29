/**
 * @tags: ['slow', 'e2e', 'cert-studio']
 * E2E-4: AI credits chip and exhaustion (requires seeded tenant).
 */
import { test, expect } from '@playwright/test'

test.use({ storageState: 'auth/cert-studio-superadmin.json' })

test.describe('AI credits', () => {
  test.slow()

  test('AI provider settings shows credit context', async ({ page }) => {
    await page.goto('/cert/settings/ai-provider')
    await expect(page.getByRole('heading', { name: /ai provider/i })).toBeVisible({ timeout: 15000 })
    await expect(page.getByText(/credit|usage/i).first()).toBeVisible()
  })
})
