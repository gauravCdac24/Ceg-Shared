import test from 'node:test'
import assert from 'node:assert/strict'
import { fuzzyFilterSessions } from '../agentHistoryFuzzy.js'

test('fuzzyFilterSessions empty query returns all', () => {
  const rows = [{ session_id: '1', title: 'Hello' }, { session_id: '2', title: 'World' }]
  assert.equal(fuzzyFilterSessions(rows, '').length, 2)
})

test('fuzzyFilterSessions matches tokens', () => {
  const rows = [
    { session_id: 'a', title: 'QR verification layout' },
    { session_id: 'b', title: 'Brand kit apply' },
  ]
  const hit = fuzzyFilterSessions(rows, 'qr layout')
  assert.equal(hit.length, 1)
  assert.equal(hit[0].session_id, 'a')
})

test('fuzzyFilterSessions no match', () => {
  assert.equal(fuzzyFilterSessions([{ session_id: '1', title: 'Hello' }], 'zzz').length, 0)
})
