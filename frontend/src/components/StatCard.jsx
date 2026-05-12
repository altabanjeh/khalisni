function StatCard({ title, value, hint, icon: Icon, tone = 'primary' }) {
  const toneClass = {
    primary: 'bg-brand-50 text-brand-600',
    warning: 'bg-amber-50 text-amber-700',
    success: 'bg-green-50 text-green-700',
    danger: 'bg-red-50 text-red-700',
  }[tone]

  return (
    <div className="glass-panel p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500">{title}</p>
        {Icon ? (
          <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl ${toneClass}`}>
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
      </div>
      <p className="mt-4 text-3xl font-extrabold text-ink">{value}</p>
      {hint ? <p className="mt-2 text-xs text-slate-500">{hint}</p> : null}
    </div>
  )
}

export default StatCard
