import React, { useCallback, useEffect, useRef, useState } from 'react';
import './AdminActionDock.css';

export type AdminDockAction = {
  id: string;
  label: string;
  subtitle?: string;
  onClick: () => void;
  icon: React.ReactNode;
  badge?: number;
  disabled?: boolean;
  tone?: 'primary' | 'warning' | 'success';
  className?: string;
};

export type AdminActionDockProps = {
  actions: AdminDockAction[];
  /** localStorage key for expanded state */
  storageKey?: string;
  ariaLabel?: string;
  className?: string;
  /** Visually collapse the panel without changing stored expanded preference */
  forceCollapsed?: boolean;
  /** Optional data-tour target for the main toggle button */
  toggleDataTour?: string;
};

function readExpanded(storageKey: string): boolean {
  try {
    const v = localStorage.getItem(storageKey);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch {
    /* ignore */
  }
  return false;
}

/**
 * Bottom-right expandable quick-action dock (CeG Portal pattern).
 * Actions expand on hover to show labels.
 */
export function AdminActionDock({
  actions,
  storageKey = 'ceg_admin_action_dock_expanded',
  ariaLabel = 'Quick actions',
  className = '',
  forceCollapsed = false,
  toggleDataTour,
}: AdminActionDockProps) {
  const [expanded, setExpanded] = useState(() => readExpanded(storageKey));
  const panelExpanded = expanded && !forceCollapsed;
  const panelRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (panelExpanded) return;
    const panel = panelRef.current;
    const active = document.activeElement;
    if (panel && active instanceof HTMLElement && panel.contains(active)) {
      toggleRef.current?.focus();
    }
  }, [panelExpanded]);

  const toggle = useCallback(() => {
    setExpanded((e) => {
      const next = !e;
      try {
        localStorage.setItem(storageKey, next ? '1' : '0');
      } catch {
        /* ignore */
      }
      return next;
    });
  }, [storageKey]);

  return (
    <div className={`ceg-admin-dock ${className}`.trim()} role="group" aria-label={ariaLabel}>
      <div
        ref={panelRef}
        className={`ceg-admin-dock__actions-panel${panelExpanded ? ' is-expanded' : ''}`}
        aria-hidden={panelExpanded ? undefined : true}
      >
        <div className="ceg-admin-dock__actions-inner">
          <div className="ceg-admin-dock__actions">
            {actions.map((action) => (
              <button
                key={action.id}
                type="button"
                className={`ceg-admin-dock__action${
                  action.tone === 'warning'
                    ? ' ceg-admin-dock__action--warning'
                    : action.tone === 'success'
                      ? ' ceg-admin-dock__action--success'
                      : ''
                }${action.className ? ` ${action.className}` : ''}`}
                onClick={action.onClick}
                disabled={action.disabled}
                aria-label={action.label}
                tabIndex={panelExpanded ? 0 : -1}
              >
                <span className="ceg-admin-dock__action-icon">
                  {action.icon}
                  {action.badge != null && action.badge > 0 ? (
                    <span className="ceg-admin-dock__badge" aria-hidden>
                      {action.badge > 99 ? '99+' : action.badge}
                    </span>
                  ) : null}
                </span>
                <span className="ceg-admin-dock__label-wrap">
                  {action.label}
                  {action.subtitle ? (
                    <span className="ceg-admin-dock__subtitle">{action.subtitle}</span>
                  ) : null}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
      <button
        ref={toggleRef}
        type="button"
        className="ceg-admin-dock__toggle"
        onClick={toggle}
        aria-expanded={panelExpanded}
        aria-label={panelExpanded ? 'Collapse quick actions' : 'Expand quick actions'}
        {...(toggleDataTour ? { 'data-tour': toggleDataTour } : {})}
      >
        <span className="ceg-admin-dock__toggle-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M12 19V5M5 12l7-7 7 7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>
    </div>
  );
}
