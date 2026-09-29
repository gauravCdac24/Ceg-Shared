/** 7×7 dot-matrix flicker loader (Cleo / subagent spawn indicator). */
export function FlickerSpinner({ size = 28, className = '' }) {
  const style = {
    '--on': '#2B2F6E',
    '--off': '#B59898',
    '--dur': '1.350s',
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 42 42"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-hidden
      className={className || undefined}
      style={style}
    >
      <title>Loading</title>
      <style>{`
        circle { fill: var(--off); }
        circle.on { fill: var(--on); }
        @media (prefers-reduced-motion: reduce) { circle { animation: none !important; } }
        @keyframes f111110011 { 0% { opacity: 1; } 55.55% { opacity: 1; } 55.56% { opacity: 0; } 77.77% { opacity: 0; } 77.78% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f111111011 { 0% { opacity: 1; } 66.66% { opacity: 1; } 66.67% { opacity: 0; } 77.77% { opacity: 0; } 77.78% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f111100111 { 0% { opacity: 1; } 44.43% { opacity: 1; } 44.44% { opacity: 0; } 66.66% { opacity: 0; } 66.67% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f111110111 { 0% { opacity: 1; } 55.55% { opacity: 1; } 55.56% { opacity: 0; } 66.66% { opacity: 0; } 66.67% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f111001111 { 0% { opacity: 1; } 33.32% { opacity: 1; } 33.33% { opacity: 0; } 55.55% { opacity: 0; } 55.56% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f111101111 { 0% { opacity: 1; } 44.43% { opacity: 1; } 44.44% { opacity: 0; } 55.55% { opacity: 0; } 55.56% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f110011111 { 0% { opacity: 1; } 22.21% { opacity: 1; } 22.22% { opacity: 0; } 44.43% { opacity: 0; } 44.44% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f111011111 { 0% { opacity: 1; } 33.32% { opacity: 1; } 33.33% { opacity: 0; } 44.43% { opacity: 0; } 44.44% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f100111111 { 0% { opacity: 1; } 11.10% { opacity: 1; } 11.11% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f110111111 { 0% { opacity: 1; } 22.21% { opacity: 1; } 22.22% { opacity: 0; } 33.32% { opacity: 0; } 33.33% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f001111111 { 0% { opacity: 0; } 22.21% { opacity: 0; } 22.22% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f101111111 { 0% { opacity: 1; } 11.10% { opacity: 1; } 11.11% { opacity: 0; } 22.21% { opacity: 0; } 22.22% { opacity: 1; } 100% { opacity: 1; } }
        @keyframes f011111110 { 0% { opacity: 0; } 11.10% { opacity: 0; } 11.11% { opacity: 1; } 88.88% { opacity: 1; } 88.89% { opacity: 0; } 100% { opacity: 0; } }
        @keyframes f011111111 { 0% { opacity: 0; } 11.10% { opacity: 0; } 11.11% { opacity: 1; } 100% { opacity: 1; } }
      `}</style>
      <circle cx="3" cy="3" r="2" />
      <circle className="on" cx="3" cy="3" r="2" opacity={1} style={{ animation: 'f111110011 var(--dur) linear infinite' }} />
      <circle cx="9" cy="3" r="2" />
      <circle className="on" cx="9" cy="3" r="2" opacity={1} style={{ animation: 'f111111011 var(--dur) linear infinite' }} />
      <circle cx="15" cy="3" r="2" />
      <circle className="on" cx="15" cy="3" r="2" opacity={1} style={{ animation: 'f111110011 var(--dur) linear infinite' }} />
      <circle cx="21" cy="3" r="2" />
      <circle className="on" cx="21" cy="3" r="2" opacity={1} style={{ animation: 'f111111011 var(--dur) linear infinite' }} />
      <circle cx="27" cy="3" r="2" />
      <circle className="on" cx="27" cy="3" r="2" opacity={1} style={{ animation: 'f111110011 var(--dur) linear infinite' }} />
      <circle cx="33" cy="3" r="2" />
      <circle className="on" cx="33" cy="3" r="2" opacity={1} style={{ animation: 'f111111011 var(--dur) linear infinite' }} />
      <circle cx="39" cy="3" r="2" />
      <circle className="on" cx="39" cy="3" r="2" opacity={1} style={{ animation: 'f111110011 var(--dur) linear infinite' }} />
      <circle cx="3" cy="9" r="2" />
      <circle className="on" cx="3" cy="9" r="2" opacity={1} style={{ animation: 'f111100111 var(--dur) linear infinite' }} />
      <circle cx="9" cy="9" r="2" />
      <circle className="on" cx="9" cy="9" r="2" opacity={1} style={{ animation: 'f111110111 var(--dur) linear infinite' }} />
      <circle cx="15" cy="9" r="2" />
      <circle className="on" cx="15" cy="9" r="2" opacity={1} style={{ animation: 'f111100111 var(--dur) linear infinite' }} />
      <circle cx="21" cy="9" r="2" />
      <circle className="on" cx="21" cy="9" r="2" opacity={1} style={{ animation: 'f111110111 var(--dur) linear infinite' }} />
      <circle cx="27" cy="9" r="2" />
      <circle className="on" cx="27" cy="9" r="2" opacity={1} style={{ animation: 'f111100111 var(--dur) linear infinite' }} />
      <circle cx="33" cy="9" r="2" />
      <circle className="on" cx="33" cy="9" r="2" opacity={1} style={{ animation: 'f111110111 var(--dur) linear infinite' }} />
      <circle cx="39" cy="9" r="2" />
      <circle className="on" cx="39" cy="9" r="2" opacity={1} style={{ animation: 'f111100111 var(--dur) linear infinite' }} />
      <circle cx="3" cy="15" r="2" />
      <circle className="on" cx="3" cy="15" r="2" opacity={1} style={{ animation: 'f111001111 var(--dur) linear infinite' }} />
      <circle cx="9" cy="15" r="2" />
      <circle className="on" cx="9" cy="15" r="2" opacity={1} style={{ animation: 'f111101111 var(--dur) linear infinite' }} />
      <circle cx="15" cy="15" r="2" />
      <circle className="on" cx="15" cy="15" r="2" opacity={1} style={{ animation: 'f111001111 var(--dur) linear infinite' }} />
      <circle cx="21" cy="15" r="2" />
      <circle className="on" cx="21" cy="15" r="2" opacity={1} style={{ animation: 'f111101111 var(--dur) linear infinite' }} />
      <circle cx="27" cy="15" r="2" />
      <circle className="on" cx="27" cy="15" r="2" opacity={1} style={{ animation: 'f111001111 var(--dur) linear infinite' }} />
      <circle cx="33" cy="15" r="2" />
      <circle className="on" cx="33" cy="15" r="2" opacity={1} style={{ animation: 'f111101111 var(--dur) linear infinite' }} />
      <circle cx="39" cy="15" r="2" />
      <circle className="on" cx="39" cy="15" r="2" opacity={1} style={{ animation: 'f111001111 var(--dur) linear infinite' }} />
      <circle cx="3" cy="21" r="2" />
      <circle className="on" cx="3" cy="21" r="2" opacity={1} style={{ animation: 'f110011111 var(--dur) linear infinite' }} />
      <circle cx="9" cy="21" r="2" />
      <circle className="on" cx="9" cy="21" r="2" opacity={1} style={{ animation: 'f111011111 var(--dur) linear infinite' }} />
      <circle cx="15" cy="21" r="2" />
      <circle className="on" cx="15" cy="21" r="2" opacity={1} style={{ animation: 'f110011111 var(--dur) linear infinite' }} />
      <circle cx="21" cy="21" r="2" />
      <circle className="on" cx="21" cy="21" r="2" opacity={1} style={{ animation: 'f111011111 var(--dur) linear infinite' }} />
      <circle cx="27" cy="21" r="2" />
      <circle className="on" cx="27" cy="21" r="2" opacity={1} style={{ animation: 'f110011111 var(--dur) linear infinite' }} />
      <circle cx="33" cy="21" r="2" />
      <circle className="on" cx="33" cy="21" r="2" opacity={1} style={{ animation: 'f111011111 var(--dur) linear infinite' }} />
      <circle cx="39" cy="21" r="2" />
      <circle className="on" cx="39" cy="21" r="2" opacity={1} style={{ animation: 'f110011111 var(--dur) linear infinite' }} />
      <circle cx="3" cy="27" r="2" />
      <circle className="on" cx="3" cy="27" r="2" opacity={1} style={{ animation: 'f100111111 var(--dur) linear infinite' }} />
      <circle cx="9" cy="27" r="2" />
      <circle className="on" cx="9" cy="27" r="2" opacity={1} style={{ animation: 'f110111111 var(--dur) linear infinite' }} />
      <circle cx="15" cy="27" r="2" />
      <circle className="on" cx="15" cy="27" r="2" opacity={1} style={{ animation: 'f100111111 var(--dur) linear infinite' }} />
      <circle cx="21" cy="27" r="2" />
      <circle className="on" cx="21" cy="27" r="2" opacity={1} style={{ animation: 'f110111111 var(--dur) linear infinite' }} />
      <circle cx="27" cy="27" r="2" />
      <circle className="on" cx="27" cy="27" r="2" opacity={1} style={{ animation: 'f100111111 var(--dur) linear infinite' }} />
      <circle cx="33" cy="27" r="2" />
      <circle className="on" cx="33" cy="27" r="2" opacity={1} style={{ animation: 'f110111111 var(--dur) linear infinite' }} />
      <circle cx="39" cy="27" r="2" />
      <circle className="on" cx="39" cy="27" r="2" opacity={1} style={{ animation: 'f100111111 var(--dur) linear infinite' }} />
      <circle cx="3" cy="33" r="2" />
      <circle className="on" cx="3" cy="33" r="2" opacity={0} style={{ animation: 'f001111111 var(--dur) linear infinite' }} />
      <circle cx="9" cy="33" r="2" />
      <circle className="on" cx="9" cy="33" r="2" opacity={1} style={{ animation: 'f101111111 var(--dur) linear infinite' }} />
      <circle cx="15" cy="33" r="2" />
      <circle className="on" cx="15" cy="33" r="2" opacity={0} style={{ animation: 'f001111111 var(--dur) linear infinite' }} />
      <circle cx="21" cy="33" r="2" />
      <circle className="on" cx="21" cy="33" r="2" opacity={1} style={{ animation: 'f101111111 var(--dur) linear infinite' }} />
      <circle cx="27" cy="33" r="2" />
      <circle className="on" cx="27" cy="33" r="2" opacity={0} style={{ animation: 'f001111111 var(--dur) linear infinite' }} />
      <circle cx="33" cy="33" r="2" />
      <circle className="on" cx="33" cy="33" r="2" opacity={1} style={{ animation: 'f101111111 var(--dur) linear infinite' }} />
      <circle cx="39" cy="33" r="2" />
      <circle className="on" cx="39" cy="33" r="2" opacity={0} style={{ animation: 'f001111111 var(--dur) linear infinite' }} />
      <circle cx="3" cy="39" r="2" />
      <circle className="on" cx="3" cy="39" r="2" opacity={0} style={{ animation: 'f011111110 var(--dur) linear infinite' }} />
      <circle cx="9" cy="39" r="2" />
      <circle className="on" cx="9" cy="39" r="2" opacity={0} style={{ animation: 'f011111111 var(--dur) linear infinite' }} />
      <circle cx="15" cy="39" r="2" />
      <circle className="on" cx="15" cy="39" r="2" opacity={0} style={{ animation: 'f011111110 var(--dur) linear infinite' }} />
      <circle cx="21" cy="39" r="2" />
      <circle className="on" cx="21" cy="39" r="2" opacity={0} style={{ animation: 'f011111111 var(--dur) linear infinite' }} />
      <circle cx="27" cy="39" r="2" />
      <circle className="on" cx="27" cy="39" r="2" opacity={0} style={{ animation: 'f011111110 var(--dur) linear infinite' }} />
      <circle cx="33" cy="39" r="2" />
      <circle className="on" cx="33" cy="39" r="2" opacity={0} style={{ animation: 'f011111111 var(--dur) linear infinite' }} />
      <circle cx="39" cy="39" r="2" />
      <circle className="on" cx="39" cy="39" r="2" opacity={0} style={{ animation: 'f011111110 var(--dur) linear infinite' }} />
    </svg>
  )
}
