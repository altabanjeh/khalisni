import clsx from 'clsx'
import { statusMeta } from '../utils/format'

function StatusBadge({ status }) {
  const meta = statusMeta[status] || { label: status, className: 'bg-gray-200 text-gray-700' }
  const Icon = meta.icon

  return (
    <span className={clsx('status-pill', meta.className)}>
      {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
      <span>{meta.label}</span>
    </span>
  )
}

export default StatusBadge
