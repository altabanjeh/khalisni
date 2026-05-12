import { useEffect, useState } from 'react'
import EmptyState from './EmptyState'

function DataTable({
  columns,
  rows,
  emptyTitle,
  emptyDescription,
  emptyAction,
  emptyIcon,
  toolbar,
  mobileCard,
}) {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === 'undefined' || !window.matchMedia ? true : window.matchMedia('(min-width: 768px)').matches,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined

    const mediaQuery = window.matchMedia('(min-width: 768px)')
    const updateViewport = (event) => setIsDesktop(event.matches)

    mediaQuery.addEventListener('change', updateViewport)

    return () => mediaQuery.removeEventListener('change', updateViewport)
  }, [])

  if (!rows?.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} icon={emptyIcon} />
  }

  return (
    <div className="space-y-4">
      {toolbar ? <div className="glass-panel p-4">{toolbar}</div> : null}

      {mobileCard && !isDesktop ? (
        <div className="grid gap-4">
          {rows.map((row) => (
            <div key={row.id} className="table-card">
              {mobileCard(row)}
            </div>
          ))}
        </div>
      ) : null}

      {!mobileCard || isDesktop ? (
        <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-white shadow-soft">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border text-sm">
              <thead className="bg-brand-50">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className="px-4 py-3 text-right font-bold text-ink">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {rows.map((row) => (
                  <tr key={row.id} className="transition hover:bg-brand-50/40">
                    {columns.map((column) => (
                      <td key={column.key} className="px-4 py-4 align-top text-slate-700">
                        {column.render ? column.render(row) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default DataTable
