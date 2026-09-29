/** Cert Studio E2E fixtures — env overrides with sensible local defaults. */

export const TEST_SERIAL = process.env.E2E_TEST_SERIAL || 'CEG-TEST-00001'
export const TEST_TEMPLATE_ID = process.env.E2E_TEST_TEMPLATE_ID || ''
export const TEST_VERIFY_CODE = process.env.E2E_TEST_VERIFY_CODE || TEST_SERIAL
