import { Bell } from 'lucide-react'
import { useState } from 'react'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import { api } from '../../api/services'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../utils/format'

const PAGE_SIZE = 20

function NotificationsPage() {
  const { data: notifications = [], loading } = useAsyncData(() => api.getNotifications(), [], [])
  const [page, setPage] = useState(1)

  const total = notifications.length
  const paginated = notifications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
        loading={loading}
        pagination={{ page, pageSize: PAGE_SIZE, total, onChange: setPage }}
        rows={paginated}
      />
    </div>
  )
}

export default NotificationsPage
