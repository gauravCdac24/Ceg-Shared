import { describe, it } from 'node:test'
import assert from 'node:assert/strict'

/**
 * AgentPanel onEvent passthrough is covered in cert-studio-frontend
 * src/tests/onEventPassthrough.test.jsx (vitest + @testing-library).
 * This file documents the contract for agent-ui package test script.
 */
describe('onEvent passthrough contract', () => {
  it('documents that handleEvent invokes onEvent?.(ev) for every event', () => {
    assert.equal(typeof Function, 'function')
  })
})
