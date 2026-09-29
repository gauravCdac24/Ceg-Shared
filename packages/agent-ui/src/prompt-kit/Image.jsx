export function Image({ src, alt = '', className = '', loading = 'lazy' }) {
  if (!src) return null
  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      className={`pk-image${className ? ` ${className}` : ''}`}
    />
  )
}
