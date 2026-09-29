import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { CHEVRON_PATTERN, ORBIT_PATTERN, resolveLoadingPattern } from '../prompt-kit/loadingStatePatterns.js'

describe('LoadingState patterns', () => {
  it('chevron wave has nine staggered delays', () => {
    assert.equal(CHEVRON_PATTERN.delays.length, 9)
    assert.equal(CHEVRON_PATTERN.delays[0], 90)
    assert.equal(CHEVRON_PATTERN.dur, 650)
  })

  it('orbit skips center cell', () => {
    assert.equal(ORBIT_PATTERN.delays[4], null)
    assert.equal(ORBIT_PATTERN.dur, 950)
  })

  it('resolves variant names case-insensitively', () => {
    assert.equal(resolveLoadingPattern('drive').round, false)
    assert.equal(resolveLoadingPattern('Dots').round, true)
    assert.equal(resolveLoadingPattern('ORBIT').delays[4], null)
  })
})
