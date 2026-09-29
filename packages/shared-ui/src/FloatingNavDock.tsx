import { useRef, type ReactNode } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  type MotionValue,
} from 'framer-motion';
import './FloatingNavDock.css';

export type FloatingNavItem = {
  id: string;
  title: string;
  icon: ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
};

export type FloatingNavDockProps = {
  items: FloatingNavItem[];
  className?: string;
  ariaLabel?: string;
  /** Distance from viewport bottom in px */
  bottom?: number;
};

const DOCK_SPRING = { mass: 0.12, stiffness: 140, damping: 14 };

function DockItem({
  item,
  mouseX,
  onNavigate,
}: {
  item: FloatingNavItem;
  mouseX: MotionValue<number>;
  onNavigate: (item: FloatingNavItem) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const distance = useTransform(mouseX, (val) => {
    const el = ref.current;
    if (!el || val === Infinity) return Infinity;
    const rect = el.getBoundingClientRect();
    return val - rect.x - rect.width / 2;
  });

  const sizeSync = useTransform(distance, [-120, 0, 120], [40, 56, 40]);
  const size = useSpring(sizeSync, DOCK_SPRING);

  const className = `ceg-floating-nav-dock__item${item.active ? ' ceg-floating-nav-dock__item--active' : ''}`;

  const content = (
    <>
      <motion.span className="ceg-floating-nav-dock__icon-wrap" style={{ width: size, height: size }}>
        {item.icon}
      </motion.span>
      <span className="ceg-floating-nav-dock__label">{item.title}</span>
    </>
  );

  if (item.href) {
    return (
      <div ref={ref} className={className}>
        <a
          href={item.href}
          title={item.title}
          aria-label={item.title}
          aria-current={item.active ? 'page' : undefined}
          onClick={(e) => {
            if (item.onClick) {
              e.preventDefault();
              onNavigate(item);
            }
          }}
        >
          {content}
        </a>
      </div>
    );
  }

  return (
    <div ref={ref} className={className}>
      <button
        type="button"
        title={item.title}
        aria-label={item.title}
        aria-current={item.active ? 'page' : undefined}
        onClick={() => onNavigate(item)}
      >
        {content}
      </button>
    </div>
  );
}

/**
 * Bottom-center floating nav with magnifying icons on hover (Aceternity Floating Dock pattern).
 * Complements {@link AdminActionDock} which is a bottom-right expandable quick-action panel.
 */
export function FloatingNavDock({
  items,
  className = '',
  ariaLabel = 'Quick navigation',
  bottom = 24,
}: FloatingNavDockProps) {
  const mouseX = useMotionValue(Infinity);

  const onNavigate = (item: FloatingNavItem) => {
    item.onClick?.();
  };

  if (items.length === 0) return null;

  return (
    <nav
      className={`ceg-floating-nav-dock ${className}`.trim()}
      style={{ bottom }}
      aria-label={ariaLabel}
      onMouseMove={(e) => mouseX.set(e.pageX)}
      onMouseLeave={() => mouseX.set(Infinity)}
    >
      {items.map((item) => (
        <DockItem key={item.id} item={item} mouseX={mouseX} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}
