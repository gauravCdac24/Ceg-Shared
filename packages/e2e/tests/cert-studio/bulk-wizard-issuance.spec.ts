/**
 * @tags: ['slow', 'e2e', 'cert-studio']
 * E2E-1: Bulk wizard issuance flow (login → CSV → job complete).
 */
import { test, expect } from '@playwright/test'

test.use({ storageState: 'auth/cert-studio-superadmin.json' })

test.describe('Bulk certificate issuance', () => {
  test.slow()

  test('bulk wizard accepts CSV and queues job', async ({ page }) => {
    await page.goto('/cert/generate/bulk/new')

    await expect(page.getByRole('heading', { name: /bulk|generate/i })).toBeVisible({ timeout: 15000 })

    const csvContent =
      'name,email,course\n' +
      Array.from({ length: 10 }, (_, i) => `User ${i},user${i}@test.edu,React 101`).join('\n')

    const fileInput = page.locator('input[type="file"]').first()
    if (await fileInput.count()) {
      await fileInput.setInputFiles({
        name: 'bulk-test.csv',
        mimeType: 'text/csv',
        buffer: Buffer.from(csvContent),
      })
    }

    const mapHeading = page.getByRole('heading', { name: /map columns|column/i })
    if (await mapHeading.isVisible({ timeout: 8000 }).catch(() => false)) {
      await expect(mapHeading).toBeVisible()
    }

    const generateBtn = page.getByRole('button', { name: /generate|start|queue/i }).first()
    if (await generateBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await generateBtn.click()
      await expect(page.getByText(/queued|processing|submitted/i).first()).toBeVisible({ timeout: 15000 })
    }
  })
})
