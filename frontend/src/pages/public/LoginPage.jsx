import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { getDisplayError } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'
import { getDefaultDashboardPath } from '../../utils/authz'

function getSafeNextPath(value) {
  return value && value.startsWith('/') ? value : ''
}

function LoginPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { login } = useAuth()
  const { isArabic } = useLanguage()
  const [error, setError] = useState('')
  const nextPath = getSafeNextPath(searchParams.get('next'))
  const registered = searchParams.get('registered') === '1'
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      email: searchParams.get('email') || '',
      password: '',
    },
  })

  async function onSubmit(values) {
    setError('')
    try {
      const user = await login(values)
      navigate(nextPath || getDefaultDashboardPath(user), { replace: true })
    } catch (loginError) {
      setError(getDisplayError(loginError))
    }
  }

  return (
    <div className="mx-auto max-w-xl glass-panel p-6">
      <p className="text-sm font-bold text-brand-600">{isArabic ? 'تسجيل الدخول' : 'Sign in'}</p>
      <h1 className="mt-2 text-3xl font-extrabold text-ink">{isArabic ? 'الدخول إلى بوابات النظام' : 'Access the platform portals'}</h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        {isArabic
          ? 'استخدم بيانات الدخول التي تم تزويدك بها، أو أنشئ حساب عميل جديد إذا كنت تبدأ الطلب لأول مرة.'
          : 'Use the credentials provided to you, or create a customer account if this is your first request.'}
      </p>
      {registered ? (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
          {isArabic
            ? 'تم إنشاء الحساب بنجاح. سجل الدخول الآن لإكمال طلب الخدمة.'
            : 'Your account was created successfully. Sign in now to continue your service request.'}
        </div>
      ) : null}
      <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="mb-2 block text-sm font-semibold">{isArabic ? 'البريد الإلكتروني' : 'Email'}</label>
          <input autoComplete="email" className="field" {...register('email')} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold">{isArabic ? 'كلمة المرور' : 'Password'}</label>
          <input autoComplete="current-password" className="field" type="password" {...register('password')} />
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? (isArabic ? 'جارٍ تسجيل الدخول...' : 'Signing in...') : isArabic ? 'دخول' : 'Sign in'}
        </button>
        <p className="text-center text-sm text-slate-600">
          {isArabic ? 'لا تملك حسابًا؟' : "Don't have an account?"}{' '}
          <Link
            className="font-semibold text-brand-700 hover:text-brand-800"
            to={nextPath ? `/register?next=${encodeURIComponent(nextPath)}` : '/register'}
          >
            {isArabic ? 'أنشئ حساب عميل' : 'Create a customer account'}
          </Link>
        </p>
      </form>
    </div>
  )
}

export default LoginPage
