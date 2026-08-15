import { LogIn, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  PublicButton,
  PublicCard,
  PublicHero,
  PublicInput,
  PublicPageShell,
  PublicPanel,
} from '../../components/public/PublicPage'
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
  const passwordResetComplete = searchParams.get('reset') === '1'
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      email: searchParams.get('email') || '',
      password: '',
      remember: false,
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
    <PublicPageShell>
      <PublicHero
        eyebrow={isArabic ? 'تسجيل الدخول' : 'Sign in'}
        icon={LogIn}
        title={isArabic ? 'الدخول إلى بوابات خالصني' : 'Access the Khalsni portals'}
        description={isArabic ? 'استخدم بيانات الدخول للمتابعة إلى حسابك، أو أنشئ حساب عميل جديد قبل طلب الخدمة.' : 'Use your credentials to continue, or create a customer account before requesting a service.'}
      />

      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <PublicPanel>
          {registered ? (
            <div className="mb-4 rounded-lg border border-green-300/25 bg-green-500/15 px-4 py-3 text-sm font-semibold text-green-100">
              {isArabic ? 'تم إنشاء الحساب بنجاح. سجل الدخول الآن لإكمال طلب الخدمة.' : 'Your account was created successfully. Sign in now to continue your service request.'}
            </div>
          ) : null}
          {passwordResetComplete ? (
            <div className="mb-4 rounded-lg border border-green-300/25 bg-green-500/15 px-4 py-3 text-sm font-semibold text-green-100">
              {isArabic ? 'تم تعيين كلمة المرور. يمكنك تسجيل الدخول الآن.' : 'Your password has been reset. You can now log in.'}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label htmlFor="login-email" className="mb-2 block text-sm font-bold text-white/80">{isArabic ? 'البريد الإلكتروني' : 'Email'}</label>
              <PublicInput id="login-email" autoComplete="email" type="email" {...register('email')} />
            </div>
            <div>
              <label htmlFor="login-password" className="mb-2 block text-sm font-bold text-white/80">{isArabic ? 'كلمة المرور' : 'Password'}</label>
              <PublicInput id="login-password" autoComplete="current-password" type="password" {...register('password')} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="flex items-center gap-3 text-sm font-semibold text-white/60" htmlFor="login-remember">
                <input id="login-remember" className="h-4 w-4 rounded border-white/20 accent-[var(--khalsni-public-primary)]" type="checkbox" {...register('remember')} />
                <span>{isArabic ? 'الإبقاء على تسجيل الدخول' : 'Remember me on this device'}</span>
              </label>
              <Link
                className="text-sm font-bold text-[var(--khalsni-public-primary)] hover:text-[var(--khalsni-public-primary-hover)]"
                to={nextPath ? `/forgot-password?next=${encodeURIComponent(nextPath)}` : '/forgot-password'}
              >
                {isArabic ? 'نسيت كلمة المرور؟' : 'Forgot your password?'}
              </Link>
            </div>
            {error ? <p className="text-sm font-semibold text-red-200">{error}</p> : null}
            <PublicButton className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? (isArabic ? 'جار تسجيل الدخول...' : 'Signing in...') : isArabic ? 'دخول' : 'Sign in'}
            </PublicButton>
          </form>
        </PublicPanel>

        <PublicCard className="flex flex-col justify-between">
          <div>
            <ShieldCheck className="h-8 w-8 text-[var(--khalsni-public-primary)]" />
            <h2 className="mt-4 text-xl font-extrabold text-white">{isArabic ? 'ليس لديك حساب؟' : "Don't have an account?"}</h2>
            <p className="mt-3 text-sm font-semibold leading-7 text-white/50">
              {isArabic ? 'أنشئ حساب عميل لتقديم الطلبات ومتابعتها من لوحة واحدة.' : 'Create a customer account to submit and track requests from one place.'}
            </p>
          </div>
          <Link
            className="mt-6 inline-flex h-11 items-center justify-center rounded-md border border-white/25 bg-white/10 px-5 text-sm font-extrabold text-white transition hover:bg-white/15"
            to={nextPath ? `/register?next=${encodeURIComponent(nextPath)}` : '/register'}
          >
            {isArabic ? 'إنشاء حساب عميل' : 'Create a customer account'}
          </Link>
        </PublicCard>
      </div>
    </PublicPageShell>
  )
}

export default LoginPage
