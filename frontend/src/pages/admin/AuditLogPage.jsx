import DataTable from '../../components/DataTable'
import LoadingSpinner from '../../components/LoadingSpinner'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../utils/format'

function AuditLogPage() {
  const { data: logs = [], loading } = useAsyncData(() => api.getAuditLogs(), [], [])

  if (loading) return <LoadingSpinner />

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

  return (
    <DataTable
      columns={columns}
      rows={logs}
      emptyTitle="لا يوجد سجل تدقيق"
      emptyDescription="ستظهر جميع العمليات الحساسة هنا."
    />
  )
}

export default AuditLogPage
