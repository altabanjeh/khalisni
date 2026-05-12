import { Bell } from 'lucide-react'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../utils/format'

function NotificationsPage() {
  const { data: notifications = [], loading } = useAsyncData(() => api.getNotifications(), [], [])

  if (loading) {
    return <div className="glass-panel p-6 text-sm text-slate-500">جاري تحميل الإشعارات...</div>
  }

  const columns = [
    { key: 'title', label: 'العنوان' },
    { key: 'recipient_name', label: 'المستخدم' },
    { key: 'order_number', label: 'رقم الطلب' },
    { key: 'status', label: 'الحالة' },
    { key: 'created_at', label: 'الوقت', render: (row) => formatDateTime(row.created_at) },
  ]

  return (
    <div className="page-section">
      <PageHeader
        description="سجل الإشعارات المرسلة أو الفاشلة، مع ربطها بالمستخدم والطلب عند الحاجة."
        eyebrow="الإشعارات"
        icon={Bell}
        title="مركز إشعارات الإدارة"
      />

      <DataTable
        columns={columns}
        emptyDescription="سيظهر سجل الإشعارات المرسلة والفاشلة هنا."
        emptyTitle="لا توجد إشعارات"
        rows={notifications}
      />
    </div>
  )
}

export default NotificationsPage
