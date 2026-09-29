import { useRef, useState } from 'react'

export function FileUpload({ onFilesAdded, children, multiple = true, accept, disabled = false, className = '' }) {
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef(null)

  const handleFiles = (fileList) => {
    if (!fileList?.length || disabled) return
    onFilesAdded?.(Array.from(fileList))
  }

  return (
    <div
      className={`pk-file-upload${dragging ? ' pk-file-upload--drag' : ''}${className ? ` ${className}` : ''}`}
      onDragOver={(e) => {
        e.preventDefault()
        if (!disabled) setDragging(true)
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        if (!disabled) handleFiles(e.dataTransfer.files)
      }}
    >
      <input
        ref={inputRef}
        type="file"
        className="sr-only"
        multiple={multiple}
        accept={accept}
        disabled={disabled}
        onChange={(e) => {
          handleFiles(e.target.files)
          e.target.value = ''
        }}
      />
      {children}
      {dragging ? <div className="pk-file-upload__overlay">Drop files here</div> : null}
    </div>
  )
}

export function FileUploadTrigger({ children, onClick, className = '', disabled = false }) {
  return (
    <button type="button" className={`pk-file-upload__trigger${className ? ` ${className}` : ''}`} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}

export function FileUploadContent({ children, className = '' }) {
  return <div className={`pk-file-upload__content${className ? ` ${className}` : ''}`}>{children}</div>
}
