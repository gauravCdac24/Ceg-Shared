export function TextShimmer({ children, className = '', duration = 4, as: Tag = 'span' }) {
  return (
    <Tag
      className={`pk-text-shimmer${className ? ` ${className}` : ''}`}
      style={{ '--pk-shimmer-duration': `${duration}s` }}
    >
      {children}
    </Tag>
  )
}
