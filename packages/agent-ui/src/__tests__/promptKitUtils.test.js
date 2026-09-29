import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseThoughtIntoSteps,
  parseSourcesFromToolResult,
  humanizeToolName,
  streamingStatusLabel,
  isSubagentTool,
  isInternalAgentThought,
  summarizeToolOutput,
  sanitizeAssistantText,
  isEphemeralTool,
} from '../prompt-kit/utils.js'

describe('parseThoughtIntoSteps', () => {
  it('builds steps from thought history', () => {
    const steps = parseThoughtIntoSteps('Selecting palette', [
      { id: '1', text: 'Analyzing request\nUser wants brand colors' },
    ])
    assert.ok(steps.length >= 1)
    assert.ok(steps[0].title)
  })
})

describe('parseSourcesFromToolResult', () => {
  it('extracts web search sources', () => {
    const json = JSON.stringify({
      results: [{ url: 'https://example.com', title: 'Example', snippet: 'Hello' }],
    })
    const sources = parseSourcesFromToolResult(json, 'web_search')
    assert.equal(sources.length, 1)
    assert.equal(sources[0].href, 'https://example.com')
  })
})

describe('humanizeToolName', () => {
  it('maps known tools', () => {
    assert.equal(humanizeToolName('web_search'), 'Web search')
    assert.equal(humanizeToolName('run_quizforge_agent'), 'QuizForge agent')
  })
})

describe('isInternalAgentThought', () => {
  it('filters planning and refinement stubs', () => {
    assert.equal(isInternalAgentThought('Planning response'), true)
    assert.equal(isInternalAgentThought('Refining: The agent should greet the user'), true)
    assert.equal(isInternalAgentThought('Checking contrast on hero block'), false)
  })
})

describe('streamingStatusLabel', () => {
  it('labels subagent spawn', () => {
    assert.equal(isSubagentTool('run_fetchdesk_agent'), true)
    assert.equal(
      streamingStatusLabel([{ name: 'run_fetchdesk_agent', status: 'running' }]),
      'Spawning FetchDesk agent…',
    )
  })
})

describe('summarizeToolOutput', () => {
  it('humanizes tool_timeout JSON', () => {
    const text = summarizeToolOutput(JSON.stringify({ error: 'tool_timeout', tool: 'handle_recreate_intent' }))
    assert.match(text, /timed out/i)
    assert.match(text, /Recreate layout/i)
  })

  it('does not leak opaque success JSON as the chip label', () => {
    assert.equal(summarizeToolOutput(JSON.stringify({ ok: true, objects: 12 })), 'Done')
    assert.equal(summarizeToolOutput('{"broken'), '')
  })
})

describe('sanitizeAssistantText', () => {
  it('extracts message from bare JSON replies', () => {
    assert.equal(
      sanitizeAssistantText(JSON.stringify({ message: 'Hello!' })),
      'Hello!',
    )
  })

  it('keeps normal prose', () => {
    assert.equal(sanitizeAssistantText('Hello!'), 'Hello!')
  })

  it('preserves fenced json code blocks', () => {
    const src = 'Here:\n```json\n{"width":842}\n```\nDone'
    assert.equal(sanitizeAssistantText(src), src)
  })
})

describe('isEphemeralTool', () => {
  it('marks status heartbeats', () => {
    assert.equal(isEphemeralTool('_status'), true)
    assert.equal(isEphemeralTool('web_search'), false)
  })
})
