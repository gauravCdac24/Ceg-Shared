import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isSafeMarkdownHref } from '../prompt-kit/markdownSafety.js'

describe('isSafeMarkdownHref', () => {
  it('allows https links', () => {
    assert.equal(isSafeMarkdownHref('https://example.com'), true)
  })

  it('blocks javascript urls', () => {
    assert.equal(isSafeMarkdownHref('javascript:alert(1)'), false)
  })

  it('blocks data urls', () => {
    assert.equal(isSafeMarkdownHref('data:text/html,<script>alert(1)</script>'), false)
  })
})
