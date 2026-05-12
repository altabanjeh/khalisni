function FileUploader({ label, register, name, error, multiple = false, registration, accept, hint }) {
  const inputRegistration = registration || (typeof register === 'function' && name ? register(name) : {})

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-ink">{label}</label>
      <div className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/60 p-4">
        <input className="field border-dashed bg-white" type="file" accept={accept} multiple={multiple} {...inputRegistration} />
        <p className="mt-3 text-xs text-slate-500">{hint || 'الملفات المسموحة: PDF, JPG, JPEG, PNG, DOC, DOCX | الحد الأقصى: 10 MB'}</p>
      </div>
      {error ? <p className="text-sm text-danger">{error.message}</p> : null}
    </div>
  )
}

export default FileUploader
