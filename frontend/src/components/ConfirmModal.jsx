function ConfirmModal({ open, title, description, onConfirm, onClose }) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-soft">
        <h3 className="text-xl font-bold text-ink">{title}</h3>
        <p className="mt-3 text-sm text-slate-600">{description}</p>
        <div className="mt-6 flex gap-3">
          <button className="btn-primary flex-1" onClick={onConfirm}>
            تأكيد
          </button>
          <button className="btn-secondary flex-1" onClick={onClose}>
            إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal
