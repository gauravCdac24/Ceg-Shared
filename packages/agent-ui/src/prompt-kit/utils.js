/** Parse [THOUGHT] blocks and newline-delimited reasoning into discrete steps. */
export function parseThoughtIntoSteps(thoughtText, history = []) {
  const steps = []
  for (const entry of history) {
    const raw = String(entry?.text || entry || '').trim()
    if (!raw) continue
    const lines = raw
      .split(/\n+/)
      .map((l) => l.replace(/^[\s\-*•\d.)]+/, '').trim())
      .filter((l) => l.length > 2)
    if (lines.length <= 1) {
      steps.push({ id: entry.id || `h-${steps.length}`, title: raw.slice(0, 120), items: [raw] })
    } else {
      steps.push({
        id: entry.id || `h-${steps.length}`,
        title: lines[0].slice(0, 120),
        items: lines.slice(1).length ? lines.slice(1) : [lines[0]],
      })
    }
  }
  const current = String(thoughtText || '').trim()
  if (current && !steps.some((s) => s.title === current.slice(0, 120))) {
    const lines = current
      .split(/\n+/)
      .map((l) => l.replace(/^[\s\-*•\d.)]+/, '').trim())
      .filter((l) => l.length > 2)
    steps.push({
      id: `live-${steps.length}`,
      title: (lines[0] || current).slice(0, 120),
      items: lines.length > 1 ? lines.slice(1) : [current],
      live: true,
    })
  }
  return steps
}

/** Extract web search / URL sources from tool result JSON text. */
export function parseSourcesFromToolResult(text, toolName) {
  if (!text) return []
  let payload = text
  try {
    payload = JSON.parse(text)
  } catch {
    return []
  }
  if (!payload || typeof payload !== 'object') return []
  const rows = payload.results || payload.sources || payload.items
  if (!Array.isArray(rows)) return []
  return rows
    .map((row, i) => ({
      id: `${toolName}-${i}`,
      href: row.url || row.href || '',
      title: row.title || row.name || row.url || 'Source',
      description: row.snippet || row.description || '',
    }))
    .filter((s) => s.href)
}

const TOOL_LABELS = {
  web_search: 'Web search',
  fetch_url: 'Fetch URL',
  pdf_extract: 'PDF extract',
  handle_improve_intent: 'Design analysis',
  handle_create_from_brief_intent: 'Create from brief',
  handle_brand_match_intent: 'Brand matching',
  handle_bulk_intent: 'Bulk issuance',
  handle_recreate_intent: 'Recreate layout',
  canvas_add_frame: 'Add decorative frame',
  canvas_set_background: 'Set background',
  get_template_info: 'Template info',
  preview_certificate: 'Certificate preview',
  check_job_status: 'Job status',
  run_quizforge_agent: 'QuizForge agent',
  run_certstudio_agent: 'Cert Studio agent',
  run_fetchdesk_agent: 'FetchDesk agent',
  run_workshopos_agent: 'WorkshopOS agent',
  create_end_to_end_workflow: 'Cross-product workflow',
}

const SUBAGENT_TOOLS = new Set([
  'run_quizforge_agent',
  'run_certstudio_agent',
  'run_fetchdesk_agent',
  'run_workshopos_agent',
  'create_end_to_end_workflow',
])

export function isSubagentTool(name) {
  return SUBAGENT_TOOLS.has(name)
}

/** Label for streaming / tool-running UI (subagent spawn uses FlickerSpinner). */
export function streamingStatusLabel(toolSteps = [], defaultLabel = 'Cleo is thinking') {
  const running = toolSteps.find((t) => t.status === 'running')
  if (!running) return defaultLabel
  if (running.name === '_status') return running.text || 'Still working…'
  if (isSubagentTool(running.name)) {
    return `Spawning ${humanizeToolName(running.name)}…`
  }
  return `${humanizeToolName(running.name)}…`
}

export function humanizeToolName(name) {
  if (!name) return 'Tool'
  if (TOOL_LABELS[name]) return TOOL_LABELS[name]
  return String(name)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Heartbeat / connecting chips — never show as permanent tool rows. */
export function isEphemeralTool(name) {
  return name === '_status' || name === 'heartbeat'
}

export function mapToolStatus(status) {
  if (status === 'running') return 'running'
  if (status === 'error') return 'error'
  if (status === 'done') return 'completed'
  return 'pending'
}

function looksLikeJsonBlob(raw) {
  const t = String(raw || '').trim()
  if (!t) return false
  if ((t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))) return true
  // Truncated / streaming JSON — still hide from chip labels
  return t.startsWith('{') || t.startsWith('[')
}

function isCompleteJsonBlob(raw) {
  const t = String(raw || '').trim()
  return (t.startsWith('{') && t.endsWith('}')) || (t.startsWith('[') && t.endsWith(']'))
}

/** User-facing one-liner for tool result JSON — never dump raw errors in the chip label. */
export function summarizeToolOutput(output) {
  const raw = String(output || '').trim()
  if (!raw) return ''
  try {
    const payload = JSON.parse(raw)
    if (!payload || typeof payload !== 'object') return looksLikeJsonBlob(raw) ? '' : raw.slice(0, 160)
    if (payload.error === 'tool_timeout') {
      const label = humanizeToolName(payload.tool)
      return `${label} timed out — the model may still be loading. Try again or use a shorter request.`
    }
    if (payload.error === 'no_brand_kit' && payload.message) return String(payload.message)
    if (payload.message) return String(payload.message).slice(0, 220)
    if (payload.plan_summary) return String(payload.plan_summary).slice(0, 220)
    if (payload.ok === true && !payload.message) return 'Done'
    if (payload.error) return String(payload.error).replace(/_/g, ' ')
    // Structured success with no message — keep chip clean (details stay behind expand).
    return ''
  } catch {
    /* plain text */
  }
  if (looksLikeJsonBlob(raw)) return ''
  return raw.length > 160 ? `${raw.slice(0, 160)}…` : raw
}

/**
 * Strip model/tool JSON dumps from assistant chat text so bubbles stay readable.
 * Keeps fenced ```json``` blocks (handled by Markdown) but removes bare object dumps.
 */
export function sanitizeAssistantText(text) {
  let out = String(text || '')
  if (!out.trim()) return ''

  // Protect fenced code so we don't eat intentional ```json``` blocks.
  const fences = []
  out = out.replace(/```[\s\S]*?```/g, (block) => {
    const token = `\u0000FENCE${fences.length}\u0000`
    fences.push(block)
    return token
  })

  const trimmed = out.trim()
  // Bare JSON object/array as the entire message → prefer message/reply/text fields.
  if (isCompleteJsonBlob(trimmed) && !trimmed.includes('\u0000FENCE')) {
    try {
      const parsed = JSON.parse(trimmed)
      if (parsed && typeof parsed === 'object') {
        if (typeof parsed.message === 'string' && parsed.message.trim()) return parsed.message.trim()
        if (typeof parsed.reply === 'string' && parsed.reply.trim()) return parsed.reply.trim()
        if (typeof parsed.text === 'string' && parsed.text.trim()) return parsed.text.trim()
        return ''
      }
    } catch {
      /* keep original */
    }
  }

  // Inline bare JSON objects (not in fences) — replace with nothing.
  out = out.replace(/(^|\n)\s*(\{[\s\S]*?\})\s*(?=\n|$)/g, (full, lead, blob) => {
    const candidate = blob.trim()
    if (!isCompleteJsonBlob(candidate)) return full
    try {
      JSON.parse(candidate)
      return lead
    } catch {
      return full
    }
  })

  out = out.replace(/\u0000FENCE(\d+)\u0000/g, (_, i) => fences[Number(i)] || '')
  return out.replace(/\n{3,}/g, '\n\n').trim()
}

/** Agent-runner reflection / planning lines that must not appear in user-facing thought UI. */
export function isInternalAgentThought(text) {
  const t = String(text || '').trim()
  if (!t) return false
  if (/^planning response/i.test(t)) return true
  if (/^refining:/i.test(t)) return true
  if (/^the agent should/i.test(t)) return true
  if (/^improved hint:/i.test(t)) return true
  return false
}
