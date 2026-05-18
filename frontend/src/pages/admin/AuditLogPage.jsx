import { ClipboardList, Search } from 'lucide-react'
import { useState } from 'react'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../utils/format'

const PAGE_SIZE = 25

function AuditLogPage() {
  const { data: logs = [], loading } = useAsyncData(() => api.getAuditLogs(), [], [])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  const filtered = logs.filter((l) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return (
      l.user_name?.toLowerCase().includes(q) ||
      l.action?.toLowerCase().includes(q) ||
      l.entity_type?.toLowerCase().includes(q) ||
      l.ip_address?.toLowerCase().includes(q)
    )
  })

  const total = filtered.length
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function handleSearch(e) {
    setSearch(e.target.value)
    setPage(1)
  }

  const columns = [
    { key: 'user_name', label: 'المستخدم' },
    { key: 'user_role', label: 'الدور' },
    { key: 'action', label: 'الإجراء' },
    { key: 'entity_type', label: 'نوع الكيان' },
    { key: 'entity_id', label: 'المعرّف' },
    { key: 'source', label: 'المصدر' },
    { key: 'status', label: 'الحالة' },
    { key: 'ip_address', label: 'IP' },
    { key: 'created_at', label: 'التوقيت', render: (row) => formatDateTime(row.created_at) },
  ]

  const toolbar = (
    <div className="relative">
      <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        className="field pr-9 text-sm"
        placeholder="بحث بالمستخدم، الإجراء، نوع الكيان..."
        value={search}
        onChange={handleSearch}
      />
    </div>
  )

  return (
    <div className="page-section">
      <PageHeader
        description="سجل شامل لجميع العمليات الحساسة والإجراءات المتخذة داخل النظام."
        eyebrow="سجل التدقيق"
        icon={ClipboardList}
        title="سجل الأحداث"
      />
      <DataTable
        columns={columns}
        emptyTitle="لا يوجد سجل تدقيق"
        emptyDescription="ستظهر جميع العمليات الحساسة هنا."
        loading={loading}
        toolbar={toolbar}
        pagination={{ page, pageSize: PAGE_SIZE, total, onChange: setPage }}
        rows={paginated}
      />
    </div>
  )
}

export default AuditLogPage
