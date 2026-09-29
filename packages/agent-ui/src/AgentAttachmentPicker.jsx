import { FileText, ImagePlus, Paperclip, X } from 'lucide-react'

import { useRef } from 'react'

import { FileUpload } from './prompt-kit/FileUpload.jsx'



const ACCEPT = 'image/jpeg,image/png,image/webp,image/gif,application/pdf'

const MAX_BYTES = 5 * 1024 * 1024



function readFileAsBase64(file) {

  return new Promise((resolve, reject) => {

    const reader = new FileReader()

    reader.onload = () => {

      const result = String(reader.result || '')

      const comma = result.indexOf(',')

      resolve(comma >= 0 ? result.slice(comma + 1) : result)

    }

    reader.onerror = () => reject(reader.error)

    reader.readAsDataURL(file)

  })

}



function readPreviewUrl(file) {

  if (!String(file.type || '').startsWith('image/')) return Promise.resolve(null)

  return new Promise((resolve) => {

    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result || ''))

    reader.onerror = () => resolve(null)

    reader.readAsDataURL(file)

  })

}



export function AgentAttachmentPicker({

  attachments = [],

  onChange,

  disabled = false,

  maxFiles = 3,

}) {

  const inputRef = useRef(null)



  const addFiles = async (fileList) => {

    if (!fileList?.length || disabled) return

    const next = [...attachments]

    for (const file of Array.from(fileList)) {

      if (next.length >= maxFiles) break

      if (file.size > MAX_BYTES) continue

      const [base64_data, preview] = await Promise.all([readFileAsBase64(file), readPreviewUrl(file)])

      next.push({

        id: `${file.name}-${file.size}-${Date.now()}`,

        filename: file.name,

        media_type: file.type || 'application/octet-stream',

        base64_data,

        preview,

      })

    }

    onChange?.(next)

  }



  const remove = (id) => {

    onChange?.(attachments.filter((a) => a.id !== id))

  }



  return (

    <FileUpload

      onFilesAdded={(files) => void addFiles(files)}

      accept={ACCEPT}

      multiple

      disabled={disabled || attachments.length >= maxFiles}

      className="ceg-agent-attachments"

    >

      <input

        ref={inputRef}

        type="file"

        accept={ACCEPT}

        multiple

        className="sr-only"

        disabled={disabled || attachments.length >= maxFiles}

        onChange={(e) => {

          void addFiles(e.target.files)

          e.target.value = ''

        }}

      />

      <button

        type="button"

        className="ceg-agent-attachments__add"

        disabled={disabled || attachments.length >= maxFiles}

        title="Attach PDF or image (max 5MB) — drag & drop supported"

        onClick={() => inputRef.current?.click()}

      >

        <Paperclip size={14} aria-hidden />

        <span>Attach</span>

      </button>

      {attachments.map((att) => (

        <span key={att.id} className="ceg-agent-attachments__chip">

          {att.preview ? (

            <img src={att.preview} alt="" className="ceg-agent-attachments__thumb" />

          ) : String(att.media_type || '').startsWith('image/') ? (

            <ImagePlus size={12} aria-hidden />

          ) : (

            <FileText size={12} aria-hidden />

          )}

          <span className="ceg-agent-attachments__name">{att.filename}</span>

          <button

            type="button"

            className="ceg-agent-attachments__remove"

            aria-label={`Remove ${att.filename}`}

            disabled={disabled}

            onClick={() => remove(att.id)}

          >

            <X size={12} />

          </button>

        </span>

      ))}

    </FileUpload>

  )

}


