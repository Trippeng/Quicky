import { test, expect } from '@playwright/test'

// Assumptions: Frontend dev server running at BASE_URL; backend at /api via proxy
// This smoke validates: login flow, refresh-on-load, and basic dashboard navigation.

test('login, session refresh, and dashboard navigation', async ({ page }) => {
  const base = process.env.BASE_URL || 'http://127.0.0.1:5173'
  // Try root first, then /login if routed separately
  await page.goto(base)
  // Navigate to login if a Login link/button exists
  const loginBtn = page.getByRole('button', { name: /log in|login/i })
  if (await loginBtn.count()) {
    await loginBtn.first().click()
  } else {
    await page.goto(base + '/login')
  }

  // Fill demo credentials (seeded user) with resilient selectors
  const emailField = page.getByLabel(/email/i)
  const passwordField = page.getByLabel(/password/i)
  const emailByPlaceholder = page.getByPlaceholder(/email/i)
  const passwordByPlaceholder = page.getByPlaceholder(/password/i)
  const emailInput = (await emailField.count()) ? emailField.first() : emailByPlaceholder.first()
  const passwordInput = (await passwordField.count()) ? passwordField.first() : passwordByPlaceholder.first()

  await emailInput.fill('demo@example.com')
  await passwordInput.fill('password123')
  const submitBtn = page.getByRole('button', { name: /log in|sign in|submit/i })
  if (await submitBtn.count()) {
    await submitBtn.first().click()
  } else {
    // Fallback: press Enter on password field
    await passwordInput.press('Enter')
  }

  // Expect navigation to org selection or dashboard
  await page.waitForLoadState('networkidle')
  // Accept either org page or dashboard route present
  const url = page.url()
  expect(url.includes('/org') || url.includes('/dashboard')).toBeTruthy()

  // Trigger a refresh: emulate expired access by reloading; client should attempt /auth/refresh and keep session
  await page.reload()
  await page.waitForLoadState('networkidle')
  const urlAfter = page.url()
  expect(urlAfter.includes('/org') || urlAfter.includes('/dashboard')).toBeTruthy()

  // Navigate into dashboard core cards if not already there
  if (!urlAfter.includes('/dashboard')) {
    // Click first organization card/button if present
    const orgBtn = page.getByRole('button', { name: /demo org/i })
    if (await orgBtn.isVisible()) {
      await orgBtn.click()
      await page.waitForURL(/.*\/dashboard.*/)
    }
  }

  // Basic card interactions: ensure Teams/List/Tasks/Chat controls exist
  const teamsCard = page.getByRole('heading', { name: /teams/i })
  await expect(teamsCard).toBeVisible()

  // Navigate to lists and tasks via visible buttons/links if present
  const nextButtons = page.getByRole('button', { name: /next/i })
  // Presence is sufficient for smoke; optional click
  if (await nextButtons.count()) {
    await nextButtons.first().click({ force: true })
  }

  // Final assertion: page remains in dashboard, indicating state survived navigation
  expect(page.url()).toContain('/dashboard')
})
