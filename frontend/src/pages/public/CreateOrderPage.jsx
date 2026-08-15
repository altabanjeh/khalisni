import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { PublicLoading, PublicPageShell, PublicPanel } from '../../components/public/PublicPage'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { getDefaultDashboardPath } from '../../utils/authz'
import { normalizeRole } from '../../utils/format'

function buildCustomerOrderPath(serviceId) {
  const query = new URLSearchParams()
  if (serviceId) query.set('service', serviceId)
  const suffix = query.toString()
  return `/customer/orders/new${suffix ? `?${suffix}` : ''}`
}

function CreateOrderPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, loading } = useAuth()
  const { isArabic } = useLanguage()
  const targetPath = buildCustomerOrderPath(searchParams.get('service'))

  useEffect(() => {
    if (loading) return

    if (!user) {
      navigate(`/register?next=${encodeURIComponent(targetPath)}`, { replace: true })
      return
    }

    if (normalizeRole(user.role) === 'customer') {
      navigate(targetPath, { replace: true })
      return
    }

    navigate(getDefaultDashboardPath(user), { replace: true })
  }, [loading, navigate, targetPath, user])

  return (
    <PublicPageShell>
      <PublicPanel className="mx-auto max-w-xl text-center">
        <PublicLoading label={isArabic ? 'جار تحويلك إلى مسار الطلب الصحيح...' : 'Redirecting you to the correct order flow...'} />
        <p className="mt-4 text-sm font-semibold leading-7 text-white/50">
          {isArabic
            ? 'يجب إنشاء حساب عميل وتسجيل الدخول قبل إرسال أي طلب خدمة.'
            : 'You need a customer account and an active sign-in session before submitting a service request.'}
        </p>
      </PublicPanel>
    </PublicPageShell>
  )
}

export default CreateOrderPage
