import { useEffect, useState } from 'react'
import EmptyState from './EmptyState'
import Pagination from './Pagination'

function SkeletonRows({ columns, count = 5 }) {
  return Array.from({ length: count }).map((_, index) => (
    <tr key={index}>
      {columns.map((column) => (
        <td key={column.key} className="px-4 py-4">
          <div className="skeleton h-4 w-full" style={{ width: column.skeletonWidth || '80%' }} />
        </td>
      ))}
    </tr>
  ))
}

function DataTable({
  columns,
  rows,
  emptyTitle,
  emptyDescription,
  emptyAction,
  emptyIcon,
  toolbar,
  mobileCard,
  loading = false,
  pagination,
}) {
  const [isTableLayout, setIsTableLayout] = useState(() =>
    typeof window === 'undefined' || !window.matchMedia
      ? true
      : window.matchMedia('(min-width: 1024px)').matches,
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mediaQuery = window.matchMedia('(min-width: 1024px)')
    const update = (event) => setIsTableLayout(event.matches)
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  const isEmpty = !loading && !rows?.length
  const visibleRows = rows?.length || 0
  const mobileColumns = columns.filter((column) => column.hideOnMobile !== true)

  function renderDefaultMobileCard(row) {
    return (
      <div className="space-y-3">
        {mobileColumns.map((column) => (
          <div
            key={column.key}
            className="flex flex-col gap-1 rounded-2xl border border-brand-50 bg-brand-50/45 px-3 py-2.5"
          >
            <span className="text-xs font-bold text-brand-700">{column.label}</span>
            <div className="min-w-0 break-words text-sm text-slate-700">
              {column.render ? column.render(row) : row[column.key]}
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {toolbar ? (
        <div className="glass-panel flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="text-sm text-slate-500">
            {loading ? 'جارٍ تحميل البيانات...' : `عدد العناصر الظاهرة: ${visibleRows}`}
          </div>
          <div className="min-w-0 flex-1">{toolbar}</div>
        </div>
      ) : null}

      {isEmpty ? (
        <EmptyState
          action={emptyAction}
          description={emptyDescription}
          icon={emptyIcon}
          title={emptyTitle}
        />
      ) : (
        <>
          {!isTableLayout ? (
            <div className="grid gap-4">
              {loading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="table-card space-y-3">
                      <div className="skeleton h-4 w-3/4" />
                      <div className="skeleton h-4 w-1/2" />
                    </div>
                  ))
                : rows.map((row) => (
                    <div key={row.id} className="table-card">
                      {mobileCard ? mobileCard(row) : renderDefaultMobileCard(row)}
                    </div>
                  ))}
            </div>
          ) : null}

          {isTableLayout ? (
            <div className="overflow-hidden rounded-[var(--radius)] border border-border bg-white shadow-soft" role="region">
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
                    {loading ? (
                      <SkeletonRows columns={columns} />
                    ) : (
                      rows.map((row) => (
                        <tr key={row.id} className="transition hover:bg-brand-50/40">
                          {columns.map((column) => (
                            <td key={column.key} className="px-4 py-4 align-top text-slate-700">
                              {column.render ? column.render(row) : row[column.key]}
                            </td>
                          ))}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {pagination && !loading ? (
            <Pagination
              onChange={pagination.onChange}
              page={pagination.page}
              pageSize={pagination.pageSize}
              total={pagination.total}
            />
          ) : null}
        </>
      )}
    </div>
  )
}

export default DataTable
