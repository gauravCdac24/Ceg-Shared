import test from 'node:test'
import assert from 'node:assert/strict'
import { parseSimpleText } from '../parseSimpleText.js'

test('parseSimpleText splits bold and code', () => {
  const parts = parseSimpleText('Hello **world** and `code` here')
  assert.equal(parts.length, 5)
  assert.deepEqual(parts[0], { type: 'text', value: 'Hello ' })
  assert.deepEqual(parts[1], { type: 'bold', value: 'world' })
  assert.deepEqual(parts[2], { type: 'text', value: ' and ' })
  assert.deepEqual(parts[3], { type: 'code', value: 'code' })
  assert.deepEqual(parts[4], { type: 'text', value: ' here' })
})

test('parseSimpleText plain text', () => {
  assert.deepEqual(parseSimpleText('plain'), [{ type: 'text', value: 'plain' }])
})
