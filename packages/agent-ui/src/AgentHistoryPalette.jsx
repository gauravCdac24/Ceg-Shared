import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Archive, ArchiveRestore, MessageSquare, Search, Trash2, X } from 'lucide-react'
import { fuzzyFilterSessions } from './agentHistoryFuzzy.js'

function formatWhen(iso) {
  if (!iso) return ''
  try {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

/**
 * Search-first session history (Cmd/Ctrl+K). Presentational — no product imports.
 * @param {'modal'|'fullscreen'} [mode='modal']
 */
export function AgentHistoryPalette({
  open = false,
  onClose,
  sessions = [],
  activeSessionId = null,
  loading = false,
  archiveFilter = 'active',
  onArchiveFilterChange,
  onSelect,
  onArchive,
  onUnarchive,
  onDelete,
  mode = 'modal',
  title = 'Chat history',
}) {
  const labelId = useId()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState(0)

  const filtered = useMemo(() => {
    const byArchive = sessions.filter((s) => {
      const archived = Boolean(s.archived)
      return archiveFilter === 'archived' ? archived : !archived
    })
    return fuzzyFilterSessions(byArchive, query)
  }, [sessions, archiveFilter, query])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setHighlight(0)
      return
    }
    const t = window.setTimeout(() => inputRef.current?.focus(), 0)
    return () => window.clearTimeout(t)
  }, [open])

  useEffect(() => {
    setHighlight(0)
  }, [query, archiveFilter, sessions])

  const selectAt = useCallback(
    (index) => {
      const row = filtered[index]
      if (!row) return
      onSelect?.(row.session_id)
      onClose?.()
    },
    [filtered, onClose, onSelect],
  )

  const onKeyDown = useCallback(
    (e) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose?.()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlight((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlight((i) => Math.max(i - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        selectAt(highlight)
      }
    },
    [filtered.length, highlight, onClose, selectAt],
  )

  if (!open) return null

  const shellClass =
    mode === 'fullscreen'
      ? 'ceg-agent-history-palette ceg-agent-history-palette--fullscreen'
      : 'ceg-agent-history-palette ceg-agent-history-palette--modal'

  return (
    <div className={shellClass} role="presentation" onKeyDown={onKeyDown}>
      <button type="button" className="ceg-agent-history-palette__backdrop" aria-label="Close history" onClick={onClose} />
      <div
        className="ceg-agent-history-palette__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
      >
        <div className="ceg-agent-history-palette__head">
          <h2 id={labelId} className="ceg-agent-history-palette__title">
            {title}
          </h2>
          <button type="button" className="ceg-agent-panel__icon-btn" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className="ceg-agent-history-palette__search">
          <Search size={14} aria-hidden className="ceg-agent-history-palette__search-icon" />
          <input
            ref={inputRef}
            type="search"
            className="ceg-agent-history-palette__input"
            placeholder="Search chats…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search chats"
            autoComplete="off"
          />
        </div>

        <div className="ceg-agent-history-palette__filters" role="tablist" aria-label="Chat filters">
          {[
            { id: 'active', label: 'Active' },
            { id: 'archived', label: 'Archived' },
          ].map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={archiveFilter === id}
              className={`ceg-agent-history-palette__chip${archiveFilter === id ? ' ceg-agent-history-palette__chip--active' : ''}`}
              onClick={() => onArchiveFilterChange?.(id)}
            >
              {label}
            </button>
          ))}
        </div>

        <ul className="ceg-agent-history-palette__list" role="listbox" aria-label="Sessions">
          {loading ? <li className="ceg-agent-history-palette__meta">Loading…</li> : null}
          {!loading && filtered.length === 0 ? (
            <li className="ceg-agent-history-palette__meta">
              {archiveFilter === 'archived' ? 'No archived chats.' : query ? 'No matches.' : 'No chats yet.'}
            </li>
          ) : null}
          {filtered.map((s, index) => {
            const active = String(s.session_id) === String(activeSessionId)
            const archived = Boolean(s.archived)
            const titleText = s.title || 'New chat'
            return (
              <li
                key={s.session_id}
                className={`ceg-agent-history-palette__row${active ? ' ceg-agent-history-palette__row--active' : ''}${
                  index === highlight ? ' ceg-agent-history-palette__row--highlight' : ''
                }`}
                role="option"
                aria-selected={active || index === highlight}
              >
                <button
                  type="button"
                  className="ceg-agent-history-palette__item"
                  onClick={() => selectAt(index)}
                  onMouseEnter={() => setHighlight(index)}
                >
                  <MessageSquare size={14} aria-hidden />
                  <span className="ceg-agent-history-palette__item-title">{titleText}</span>
                  <span className="ceg-agent-history-palette__item-when">{formatWhen(s.updated_at)}</span>
                </button>
                <div className="ceg-agent-history-palette__actions">
                  {archived ? (
                    <button
                      type="button"
                      className="ceg-agent-history-palette__action"
                      title="Restore"
                      aria-label={`Restore ${titleText}`}
                      onClick={() => onUnarchive?.(s.session_id)}
                    >
                      <ArchiveRestore size={13} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="ceg-agent-history-palette__action"
                      title="Archive"
                      aria-label={`Archive ${titleText}`}
                      onClick={() => onArchive?.(s.session_id)}
                    >
                      <Archive size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    className="ceg-agent-history-palette__action ceg-agent-history-palette__action--danger"
                    title="Delete"
                    aria-label={`Delete ${titleText}`}
                    onClick={() => onDelete?.(s.session_id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>

        <p className="ceg-agent-history-palette__hint">
          <kbd>↑</kbd>
          <kbd>↓</kbd> navigate · <kbd>Enter</kbd> open · <kbd>Esc</kbd> close
        </p>
      </div>
    </div>
  )
}