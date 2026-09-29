/**
 * @tags: ['e2e', 'cert-studio', 'p0']
 * EA-007-H2: Job Status + e-sign operator surface smoke.
 */
import { test, expect } from '@playwright/test'

test.use({ storageState: 'auth/cert-studio-superadmin.json' })

test.describe('Job status and e-sign UI', () => {
  test('generation history page loads', async ({ page }) => {
    await page.goto('/cert/jobs')
    await expect(page.getByRole('heading', { name: 'Generation history' })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByRole('link', { name: /new bulk run/i })).toBeVisible()
  })

  test('job detail renders status shell when history has a run', async ({ page }) => {
    await page.goto('/cert/jobs')

    const firstJob = page.locator('a[href*="/jobs/"]').first()
    const hasJob = await firstJob.isVisible({ timeout: 8000 }).catch(() => false)
    if (!hasJob) {
      test.skip(true, 'No jobs in tenant — seed or complete a bulk run first')
      return
    }

    await firstJob.click()
    await expect(page.getByRole('link', { name: 'Generation history' })).toBeVisible({
      timeout: 15000,
    })
    await expect(page.getByRole('heading', { name: /certificate run/i })).toBeVisible()
    await expect(page.locator('body')).toContainText(/Job\s+[0-9a-f-]{8,}/i)
  })
})
