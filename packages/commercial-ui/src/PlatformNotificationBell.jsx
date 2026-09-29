/**
 * Cross-product in-app notification bell (polls product `/in-app-notifications` API).
 *
 * @param {{ fetchNotifications: () => Promise<Array<{title?: string, body?: string, type?: string, created_at?: string}>>, pollMs?: number }} props
 */
import { useCallback, useEffect, useState } from 'react';

export function PlatformNotificationBell({ fetchNotifications, pollMs = 60_000, className = '' }) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);

  const load = useCallback(async () => {
    try {
      const list = await fetchNotifications();
      setItems(Array.isArray(list) ? list : []);
    } catch {
      setItems([]);
    }
  }, [fetchNotifications]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), pollMs);
    return () => window.clearInterval(id);
  }, [load, pollMs]);

  const unread = items.length;

  return (
    <div className={`platform-notification-bell ${className}`.trim()} style={{ position: 'relative' }}>
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        style={{
          position: 'relative',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          padding: 8,
        }}
      >
        <span aria-hidden>🔔</span>
        {unread > 0 ? (
          <span
            style={{
              position: 'absolute',
              top: 4,
              right: 4,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: '#dc2626',
              color: '#fff',
              fontSize: 10,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
            }}
          >
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>
      {open ? (
        <>
          <div
            role="presentation"
            style={{ position: 'fixed', inset: 0, zIndex: 40 }}
            onClick={() => setOpen(false)}
          />
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              marginTop: 8,
              width: 320,
              maxHeight: 360,
              overflow: 'auto',
              zIndex: 50,
              background: 'var(--surface-elevated, #fff)',
              border: '1px solid var(--border-subtle, #e5e7eb)',
              borderRadius: 8,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 14 }}>Notifications</div>
            {items.length === 0 ? (
              <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted, #6b7280)' }}>No notifications yet.</p>
            ) : (
              <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
                {items.slice(0, 20).map((n, i) => (
                  <li
                    key={`${n.type || 'n'}-${i}`}
                    style={{ padding: '8px 0', borderBottom: '1px solid var(--border-subtle, #f3f4f6)' }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title || 'Update'}</div>
                    {n.body ? <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>{n.body}</div> : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
