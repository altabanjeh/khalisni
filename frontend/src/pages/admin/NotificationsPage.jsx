import { Bell } from 'lucide-react'
import { useState } from 'react'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../utils/format'

const PAGE_SIZE = 20

function NotificationsPage() {
  const { language, isArabic } = useLanguage()
  const { data: notifications = [], loading } = useAsyncData(() => api.getNotifications(), [], [])
  const [page, setPage] = useState(1)

  const total = notifications.length
  const paginated = notifications.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const columns = [
    { key: 'title', label: isArabic ? 'العنوان' : 'Title' },
    { key: 'recipient_name', label: isArabic ? 'المستخدم' : 'Recipient' },
    { key: 'order_number', label: isArabic ? 'رقم الطلب' : 'Request' },
    { key: 'status', label: isArabic ? 'الحالة' : 'Status' },
    { key: 'created_at', label: isArabic ? 'الوقت' : 'Time', render: (row) => formatDateTime(row.created_at, language) },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        description={isArabic ? 'سجل الإشعارات المرسلة أو الفاشلة، مرتبطة بالمستخدم والطلب عند الحاجة.' : 'A log of sent and failed notifications, linked to the recipient and request where relevant.'}
        eyebrow={isArabic ? 'الإشعارات' : 'Notifications'}
        icon={Bell}
        title={isArabic ? 'مركز إشعارات الإدارة' : 'Admin notification centre'}
      />
      <DataTable
        columns={columns}
        emptyDescription={isArabic ? 'سيظهر سجل الإشعارات المرسلة والفاشلة هنا.' : 'The log of sent and failed notifications will appear here.'}
        emptyTitle={isArabic ? 'لا توجد إشعارات' : 'No notifications'}
        loading={loading}
        pagination={{ page, pageSize: PAGE_SIZE, total, onChange: setPage }}
        rows={paginated}
      />
    </div>
  )
}

export default NotificationsPage
