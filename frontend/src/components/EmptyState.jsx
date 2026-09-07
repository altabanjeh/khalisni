import { useLanguage } from '../context/LanguageContext'

function EmptyState({ title, description, action, icon: Icon }) {
  const { t } = useLanguage()
  return (
    <div className="glass-panel flex flex-col items-center justify-center gap-4 px-6 py-12 text-center">
      {Icon ? (
        <span className="icon-chip">
          <Icon className="h-5 w-5" />
        </span>
      ) : null}
      <div className="rounded-full bg-brand-100 px-4 py-2 text-sm font-semibold text-brand-700">{t('common.noData', 'لا توجد بيانات')}</div>
      {title ? <h3 className="text-xl font-bold text-ink">{title}</h3> : null}
      {description ? <p className="max-w-xl text-sm text-slate-600">{description}</p> : null}
      {action}
    </div>
  )
}

export default EmptyState
