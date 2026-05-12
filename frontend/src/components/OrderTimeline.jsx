import { CheckCircle2 } from 'lucide-react'
import StatusBadge from './StatusBadge'
import { formatDateTime } from '../utils/format'

function OrderTimeline({ items = [] }) {
  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div key={item.id || index} className="relative rounded-3xl border border-border bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="icon-chip h-10 w-10 rounded-xl">
                <CheckCircle2 className="h-4 w-4" />
              </span>
              <StatusBadge status={item.new_status || item.status} />
            </div>
            <span className="text-xs text-slate-500">{formatDateTime(item.created_at)}</span>
          </div>
          <p className="mt-3 text-sm leading-7 text-slate-600">{item.note || 'لا توجد ملاحظات إضافية.'}</p>
        </div>
      ))}
    </div>
  )
}

export default OrderTimeline
