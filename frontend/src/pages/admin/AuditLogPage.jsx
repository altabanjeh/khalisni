import { ClipboardList, Search } from 'lucide-react'
import { useState } from 'react'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../utils/format'

const PAGE_SIZE = 25

function AuditLogPage() {
  const { language, isArabic } = useLanguage()
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

  const columns = [
    { key: 'user_name', label: isArabic ? 'المستخدم' : 'User' },
    { key: 'user_role', label: isArabic ? 'الدور' : 'Role' },
    { key: 'action', label: isArabic ? 'الإجراء' : 'Action' },
    { key: 'entity_type', label: isArabic ? 'نوع الكيان' : 'Entity type' },
    { key: 'entity_id', label: isArabic ? 'المعرّف' : 'Entity ID' },
    { key: 'source', label: isArabic ? 'المصدر' : 'Source' },
    { key: 'status', label: isArabic ? 'الحالة' : 'Result' },
    { key: 'ip_address', label: 'IP' },
    { key: 'created_at', label: isArabic ? 'التوقيت' : 'Time', render: (row) => formatDateTime(row.created_at, language) },
  ]

  const toolbar = (
    <div className="relative">
      <Search className="pointer-events-none absolute inset-inline-start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <input
        aria-label={isArabic ? 'بحث في سجل التدقيق' : 'Search the audit log'}
        className="field ps-9 text-sm"
        onChange={(e) => { setSearch(e.target.value); setPage(1) }}
        placeholder={isArabic ? 'بحث بالمستخدم أو الإجراء أو نوع الكيان...' : 'Search by user, action, entity type…'}
        value={search}
      />
    </div>
  )

  return (
    <div className="space-y-6">
      <PageHeader
        description={isArabic ? 'سجل شامل لكل العمليات الحساسة والإجراءات داخل النظام.' : 'A complete record of every sensitive operation and action in the system.'}
        eyebrow={isArabic ? 'سجل التدقيق' : 'Audit log'}
        icon={ClipboardList}
        title={isArabic ? 'سجل الأحداث' : 'Activity log'}
      />
      <DataTable
        columns={columns}
        emptyDescription={isArabic ? 'ستظهر جميع العمليات الحساسة هنا.' : 'Every sensitive operation will appear here.'}
        emptyTitle={isArabic ? 'لا يوجد سجل تدقيق' : 'No audit entries'}
        loading={loading}
        pagination={{ page, pageSize: PAGE_SIZE, total, onChange: setPage }}
        rows={paginated}
        toolbar={toolbar}
      />
    </div>
  )
}

export default AuditLogPage
