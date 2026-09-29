/**
 * @tags: ['slow', 'e2e', 'cert-studio', 'sketch']
 * Draw → Stabilize → Accept / Reject / Continue flows.
 */
import { test, expect } from '@playwright/test'

const MOCK_SUCCESS = {
  intent: 'stabilize_sketch',
  commands: [
    { op: 'apply_theme_frame', style_id: 'classic', margin: 36 },
    { op: 'add_placeholder', role: 'recipient_name', x: 180, y: 260, w: 480, h: 40 },
  ],
  continuation_available: false,
  remaining_ink_object_ids: [],
  used_fallback: false,
}

const MOCK_FALLBACK = {
  ...MOCK_SUCCESS,
  used_fallback: true,
}

const MOCK_CONTINUE = {
  ...MOCK_SUCCESS,
  continuation_available: true,
  remaining_ink_object_ids: ['ink-2'],
}

test.use({ storageState: 'auth/cert-studio-superadmin.json' })

async function drawStroke(page) {
  const canvas = page.locator('canvas').first()
  await expect(canvas).toBeVisible({ timeout: 30_000 })
  const box = await canvas.boundingBox()
  if (!box) throw new Error('canvas box missing')
  const cx = box.x + box.width * 0.35
  const cy = box.y + box.height * 0.35
  await page.mouse.move(cx, cy)
  await page.mouse.down()
  await page.mouse.move(cx + 80, cy + 40, { steps: 8 })
  await page.mouse.move(cx + 20, cy + 90, { steps: 8 })
  await page.mouse.move(cx - 30, cy + 20, { steps: 8 })
  await page.mouse.up()
}

async function mockStabilize(page, resultBody: Record<string, unknown>, visionConfigured = true) {
  await page.route('**/v1/templates/**/sketch-stabilize', async (route) => {
    if (route.request().method() !== 'POST') return route.continue()
    const taskId = 'mock-sketch-task'
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ task_id: taskId, poll_url: `/v1/tasks/${taskId}/status` }),
    })
  })
  await page.route('**/v1/tasks/mock-sketch-task/status', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'done',
        result: {
          stabilize: resultBody,
          vision_configured: visionConfigured,
          used_fallback: Boolean(resultBody.used_fallback),
          basic_layout_only: Boolean(resultBody.used_fallback || !visionConfigured),
        },
      }),
    })
  })
}

async function openSketchEditor(page) {
  await page.goto('/cert/templates/new/edit?sketch=1')
  await expect(page).toHaveURL(/\/cert\/templates\/[^/]+\/edit/, { timeout: 30_000 })
}

async function runStabilizeFromDrawPanel(page) {
  await page.getByTestId('stabilize-sketch-btn').click()
  await page.getByTestId('sketch-style-brief').fill('classic certificate layout')
  await page.getByTestId('sketch-stabilize-confirm').click()
}

test.describe('Sketch stabilize flow', () => {
  test.slow()

  test('happy path: draw → stabilize → accept', async ({ page }) => {
    await mockStabilize(page, MOCK_SUCCESS)
    await openSketchEditor(page)
    await drawStroke(page)
    await runStabilizeFromDrawPanel(page)
    await expect(page.getByTestId('sketch-stabilize-progress')).toBeHidden({ timeout: 60_000 })
    await expect(page.locator('.cert-ai-ghost-overlay')).toBeVisible({ timeout: 15_000 })
    await page.locator('.cert-ai-ghost-overlay__btn--accept').click()
    await expect(page.locator('.cert-ai-ghost-overlay')).toBeHidden({ timeout: 10_000 })
  })

  test('fallback path shows basic layout copy', async ({ page }) => {
    await mockStabilize(page, MOCK_FALLBACK, false)
    await openSketchEditor(page)
    await drawStroke(page)
    await runStabilizeFromDrawPanel(page)
    await expect(page.locator('.cert-ai-ghost-overlay')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.cert-ai-ghost-overlay__label')).toContainText(/basic layout/i)
  })

  test('reject restores overlay dismissal', async ({ page }) => {
    await mockStabilize(page, MOCK_SUCCESS)
    await openSketchEditor(page)
    await drawStroke(page)
    await runStabilizeFromDrawPanel(page)
    await expect(page.locator('.cert-ai-ghost-overlay')).toBeVisible({ timeout: 15_000 })
    await page.locator('.cert-ai-ghost-overlay__btn--reject').click()
    await expect(page.locator('.cert-ai-ghost-overlay')).toBeHidden({ timeout: 10_000 })
  })

  test('continue stabilize skips full brief dialog', async ({ page }) => {
    let stabilizePosts = 0
    await page.route('**/v1/templates/**/sketch-stabilize', async (route) => {
      if (route.request().method() !== 'POST') return route.continue()
      stabilizePosts += 1
      const taskId = `mock-sketch-task-${stabilizePosts}`
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ task_id: taskId, poll_url: `/v1/tasks/${taskId}/status` }),
      })
    })
    await page.route('**/v1/tasks/mock-sketch-task-*/status', async (route) => {
      const pass = route.request().url().includes('-2')
      const body = pass ? MOCK_SUCCESS : MOCK_CONTINUE
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          status: 'done',
          result: { stabilize: body, vision_configured: true, used_fallback: false },
        }),
      })
    })

    await openSketchEditor(page)
    await drawStroke(page)
    await runStabilizeFromDrawPanel(page)
    await expect(page.locator('.cert-ai-ghost-overlay')).toBeVisible({ timeout: 15_000 })
    await page.getByTestId('sketch-continue-stabilize').click()
    await expect(page.getByTestId('sketch-style-brief')).toHaveCount(0)
    await expect(page.locator('.cert-ai-ghost-overlay')).toBeVisible({ timeout: 15_000 })
    expect(stabilizePosts).toBeGreaterThanOrEqual(2)
  })
})
