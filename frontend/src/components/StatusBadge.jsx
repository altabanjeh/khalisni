import clsx from 'clsx'
import { useLanguage } from '../context/LanguageContext'
import { getStatusLabel, statusMeta } from '../utils/format'

function StatusBadge({ status }) {
  const { language } = useLanguage()
  const meta = statusMeta[status] || { className: 'bg-gray-200 text-gray-700' }
  const Icon = meta.icon

  return (
    <span className={clsx('status-pill', meta.className)}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      <span>{getStatusLabel(status, language)}</span>
    </span>
  )
}

export default StatusBadge
