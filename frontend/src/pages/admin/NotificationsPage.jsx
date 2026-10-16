import { Bell } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import DataTable from '../../components/DataTable'
import PageHeader from '../../components/PageHeader'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'
import { useAsyncData } from '../../hooks/useAsyncData'
import { formatDateTime } from '../../utils/format'

const EMPTY_PAGE = { results: [], count: 0, hasNext: false, hasPrevious: false }

function NotificationsPage() {
  const { language, isArabic } = useLanguage()
  // The log pages on the server so every notification is reachable.
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const { data: pageData, loading, error, reload } = useAsyncData(() => api.getNotificationsPage({ page }), [page], EMPTY_PAGE)
  const notifications = useMemo(() => pageData?.results || [], [pageData])
  const total = pageData?.count || 0
  useEffect(() => {
    // A full page that has a successor tells the server's page size.
    if (pageData?.hasNext && pageData.results.length) setPageSize(pageData.results.length)
  }, [pageData])
  useEffect(() => {
    // The last row of the last page went away: go back to a page that exists.
    if (error?.response?.status === 404 && page > 1) setPage((current) => Math.max(1, current - 1))
  }, [error, page])

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
        ariaLabel={isArabic ? 'جدول الإشعارات' : 'Notifications table'}
        error={error?.response?.status === 404 ? null : error}
        loading={loading}
        onRetry={reload}
        pagination={{ page, pageSize, total, onChange: setPage }}
        rows={notifications}
      />
    </div>
  )
}

export default NotificationsPage
