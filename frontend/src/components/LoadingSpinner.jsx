function LoadingSpinner({ label = 'جاري التحميل...' }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-3xl border border-brand-100 bg-white/70 p-8">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-brand-200 border-t-ink" />
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  )
}

export default LoadingSpinner
