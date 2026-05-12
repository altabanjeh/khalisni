import { useEffect, useState } from 'react'

export function FieldGroup({ label, hint, error, children }) {
  return (
    <label className="block space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-ink">{label}</span>
        {hint ? <span className="text-xs text-slate-500">{hint}</span> : null}
      </div>
      {children}
      {error ? <p className="text-sm text-danger">{error.message}</p> : null}
    </label>
  )
}

export function ToggleField({ label, description, registration }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-3xl border border-border bg-brand-50/60 px-4 py-3">
      <div>
        <p className="text-sm font-semibold text-ink">{label}</p>
        {description ? <p className="text-xs text-slate-500">{description}</p> : null}
      </div>
      <span className="relative inline-flex">
        <input className="peer sr-only" type="checkbox" {...registration} />
        <span className="h-7 w-12 rounded-full bg-slate-300 transition peer-checked:bg-brand-600" />
        <span className="absolute left-1 top-1 h-5 w-5 rounded-full bg-white transition peer-checked:translate-x-5" />
      </span>
    </label>
  )
}

export function ColorPickerField({ label, hint, name, register, value, setValue, error, allowClear = false }) {
  const previewValue = value || '#000000'

  return (
    <FieldGroup error={error} hint={hint} label={label}>
      <div className="flex items-center gap-3 rounded-3xl border border-border bg-white px-3 py-3">
        <input
          className="h-11 w-14 cursor-pointer rounded-2xl border-0 bg-transparent p-0"
          type="color"
          value={previewValue}
          onChange={(event) => setValue(name, event.target.value, { shouldDirty: true, shouldValidate: true })}
        />
        <input className="field flex-1 border-0 bg-transparent px-0 py-0 shadow-none focus:ring-0" {...register(name)} />
        {allowClear ? (
          <button
            className="btn-ghost shrink-0 px-3 py-2 text-xs"
            onClick={() => setValue(name, '', { shouldDirty: true, shouldValidate: true })}
            type="button"
          >
            Clear
          </button>
        ) : null}
        <span className="h-8 w-8 rounded-full border border-border" style={{ backgroundColor: previewValue }} />
      </div>
    </FieldGroup>
  )
}

export function ImageUploadField({ label, hint, accept, registration, fileUrl, fileList, error }) {
  const [previewUrl, setPreviewUrl] = useState(fileUrl || '')

  useEffect(() => {
    if (fileList?.[0]) {
      const objectUrl = URL.createObjectURL(fileList[0])
      setPreviewUrl(objectUrl)
      return () => URL.revokeObjectURL(objectUrl)
    }
    setPreviewUrl(fileUrl || '')
    return undefined
  }, [fileList, fileUrl])

  return (
    <FieldGroup error={error} hint={hint} label={label}>
      <div className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/60 p-4">
        <input className="field border-dashed bg-white" type="file" accept={accept} {...registration} />
        {previewUrl ? (
          <div className="mt-4 overflow-hidden rounded-3xl border border-border bg-white p-3">
            <img alt={label} className="max-h-56 w-full rounded-2xl object-cover" src={previewUrl} />
          </div>
        ) : (
          <p className="mt-3 text-xs text-slate-500">No image selected.</p>
        )}
      </div>
    </FieldGroup>
  )
}

export function FormMessage({ message }) {
  if (!message?.text) return null

  return (
    <div
      className={`rounded-2xl border px-4 py-3 text-sm ${
        message.type === 'error'
          ? 'border-danger/20 bg-danger/5 text-danger'
          : 'border-success/20 bg-success/5 text-success'
      }`}
    >
      {message.text}
    </div>
  )
}
