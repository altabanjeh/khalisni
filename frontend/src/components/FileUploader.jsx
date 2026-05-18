import { FileText, Paperclip, TriangleAlert, UploadCloud, X } from 'lucide-react'
import { useId, useRef, useState } from 'react'

const MAX_SIZE = 10 * 1024 * 1024
const DEFAULT_ACCEPT = '.pdf,.jpg,.jpeg,.png,.doc,.docx'

function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function buildSyntheticFileList(nextFiles) {
  if (typeof DataTransfer !== 'undefined') {
    const dataTransfer = new DataTransfer()
    nextFiles.forEach((file) => dataTransfer.items.add(file))
    return dataTransfer.files
  }

  return Object.assign([...nextFiles], {
    item(index) {
      return nextFiles[index] || null
    },
  })
}

function matchesAcceptToken(file, token) {
  const normalized = String(token || '').trim().toLowerCase()
  if (!normalized) return true

  if (normalized.startsWith('.')) {
    return file.name.toLowerCase().endsWith(normalized)
  }

  if (normalized.endsWith('/*')) {
    return file.type.toLowerCase().startsWith(normalized.replace('*', ''))
  }

  return file.type.toLowerCase() === normalized
}

function isAcceptedFile(file, acceptValue) {
  const tokens = String(acceptValue || '')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)

  if (!tokens.length) return true
  return tokens.some((token) => matchesAcceptToken(file, token))
}

function FileUploader({
  label,
  register,
  name,
  error,
  multiple = false,
  registration,
  accept,
  hint,
  onChange: externalOnChange,
}) {
  const inputRegistration = registration || (typeof register === 'function' && name ? register(name) : {})
  const { ref: registrationRef, onChange: registrationOnChange, ...registrationProps } = inputRegistration
  const [files, setFiles] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [validationError, setValidationError] = useState('')
  const inputRef = useRef(null)
  const inputId = useId()
  const acceptValue = accept || DEFAULT_ACCEPT

  function syncRegisteredValue(nextFiles) {
    const fileList = buildSyntheticFileList(nextFiles)

    if (inputRef.current) {
      try {
        inputRef.current.files = fileList
      } catch {
        // Test environments may expose files as read-only.
      }
    }

    registrationOnChange?.({
      target: {
        name: registrationProps.name || name,
        type: 'file',
        files: fileList,
      },
      type: 'change',
    })
  }

  function handleFiles(fileList) {
    setValidationError('')
    const nextInputFiles = Array.from(fileList || [])

    if (!nextInputFiles.length) {
      setFiles([])
      syncRegisteredValue([])
      if (externalOnChange) externalOnChange(multiple ? [] : null)
      return
    }

    const oversized = nextInputFiles.find((file) => file.size > MAX_SIZE)
    if (oversized) {
      setValidationError(`الملف "${oversized.name}" يتجاوز الحد الأقصى المسموح (10 MB).`)
      return
    }

    const invalid = nextInputFiles.find((file) => !isAcceptedFile(file, acceptValue))
    if (invalid) {
      setValidationError(`نوع الملف "${invalid.name}" غير مدعوم لهذا الحقل.`)
      return
    }

    const normalizedFiles = multiple ? nextInputFiles : nextInputFiles.slice(0, 1)
    setFiles(normalizedFiles)
    syncRegisteredValue(normalizedFiles)
    if (externalOnChange) externalOnChange(multiple ? normalizedFiles : normalizedFiles[0] || null)
  }

  function removeFile(index) {
    const nextFiles = files.filter((_, fileIndex) => fileIndex !== index)
    setFiles(nextFiles)
    setValidationError('')
    syncRegisteredValue(nextFiles)

    if (inputRef.current && nextFiles.length === 0) {
      inputRef.current.value = ''
    }

    if (externalOnChange) externalOnChange(multiple ? nextFiles : nextFiles[0] || null)
  }

  return (
    <div className="space-y-2">
      {label ? <label className="block text-sm font-semibold text-ink">{label}</label> : null}

      <div
        className={`rounded-3xl border-2 border-dashed p-5 text-center transition ${
          dragOver ? 'border-brand-500 bg-brand-50 shadow-soft' : 'border-brand-200 bg-brand-50/60'
        }`}
        onDragLeave={() => setDragOver(false)}
        onDragOver={(event) => {
          event.preventDefault()
          setDragOver(true)
        }}
        onDrop={(event) => {
          event.preventDefault()
          setDragOver(false)
          handleFiles(event.dataTransfer.files)
        }}
      >
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-brand-500 shadow-soft">
          {dragOver ? <UploadCloud className="h-6 w-6" /> : <Paperclip className="h-6 w-6" />}
        </div>
        <p className="text-sm font-semibold text-brand-600">
          {dragOver ? 'أفلت الملف هنا' : 'اسحب وأفلت الملف هنا'}
        </p>
        <p className="mt-1 text-xs text-slate-500">أو</p>
        <label className="btn-secondary mt-2 cursor-pointer px-4 py-2 text-xs" htmlFor={inputId}>
          اختر ملفاً
        </label>
        <input
          {...registrationProps}
          id={inputId}
          accept={acceptValue}
          className="hidden"
          multiple={multiple}
          onChange={(event) => {
            registrationOnChange?.(event)
            handleFiles(event.target.files)
          }}
          ref={(node) => {
            inputRef.current = node
            registrationRef?.(node)
          }}
          type="file"
        />
        <p className="mt-3 text-xs text-slate-400">
          {hint || 'الملفات المسموحة: PDF, JPG, PNG, DOC, DOCX | الحد الأقصى: 10 MB'}
        </p>
        {files.length ? (
          <p className="mt-2 text-xs font-medium text-brand-700">
            {multiple ? `تم اختيار ${files.length} ملفات` : `تم اختيار ${files[0].name}`}
          </p>
        ) : null}
      </div>

      {files.length > 0 ? (
        <ul className="space-y-2">
          {files.map((file, index) => (
            <li key={`${file.name}-${index}`} className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 text-sm">
              <FileText className="h-4 w-4 shrink-0 text-brand-500" />
              <span className="flex-1 truncate font-medium text-ink">{file.name}</span>
              <span className="shrink-0 text-xs text-slate-400">{formatSize(file.size)}</span>
              <button
                aria-label={`حذف الملف ${file.name}`}
                className="shrink-0 rounded-xl p-1 hover:bg-red-50"
                onClick={() => removeFile(index)}
                type="button"
              >
                <X className="h-4 w-4 text-danger" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {validationError || error ? (
        <p className="flex items-center gap-2 text-sm text-danger" role="alert">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          <span>{validationError || error?.message}</span>
        </p>
      ) : null}
    </div>
  )
}

export default FileUploader
