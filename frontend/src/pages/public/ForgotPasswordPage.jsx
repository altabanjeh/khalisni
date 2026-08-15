import { KeyRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import {
  PublicButton,
  PublicHero,
  PublicInput,
  PublicPageShell,
  PublicPanel,
} from '../../components/public/PublicPage'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import { useLanguage } from '../../context/LanguageContext'

function getSafeNextPath(value) {
  return value && value.startsWith('/') ? value : ''
}

function ForgotPasswordPage() {
  const [searchParams] = useSearchParams()
  const { isArabic } = useLanguage()
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const nextPath = getSafeNextPath(searchParams.get('next'))
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      email: searchParams.get('email') || '',
    },
  })

  async function onSubmit(values) {
    setError('')
    setSuccessMessage('')
    try {
      const response = await api.forgotPassword(values)
      setSuccessMessage(response?.detail || (isArabic ? 'إذا كان البريد مسجلا، سيتم إرسال رابط إعادة التعيين.' : 'If this email is registered, a password reset link has been sent.'))
    } catch (submitError) {
      setError(getDisplayError(submitError))
    }
  }

  return (
    <PublicPageShell>
      <PublicHero
        eyebrow={isArabic ? 'استعادة كلمة المرور' : 'Forgot password'}
        icon={KeyRound}
        title={isArabic ? 'أرسل رابط إعادة التعيين' : 'Send a reset link'}
        description={isArabic ? 'أدخل البريد الإلكتروني المرتبط بحساب العميل. إذا كان مسجلا لدينا، سنرسل رابط إعادة تعيين صالحا لمدة محددة.' : 'Enter the email address linked to your customer account. If it is registered, we will send a reset link.'}
      />

      <PublicPanel className="mx-auto max-w-xl">
        {successMessage ? (
          <div className="mb-4 rounded-lg border border-green-300/25 bg-green-500/15 px-4 py-3 text-sm font-semibold text-green-100">{successMessage}</div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="forgot-email" className="mb-2 block text-sm font-bold text-white/80">{isArabic ? 'البريد الإلكتروني' : 'Email address'}</label>
            <PublicInput
              id="forgot-email"
              autoComplete="email"
              type="email"
              {...register('email', { required: isArabic ? 'البريد الإلكتروني مطلوب' : 'Email is required' })}
            />
            {errors.email ? <p className="mt-2 text-sm font-semibold text-red-200">{errors.email.message}</p> : null}
          </div>
          {error ? <p className="text-sm font-semibold text-red-200">{error}</p> : null}
          <PublicButton className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? (isArabic ? 'جار الإرسال...' : 'Sending...') : isArabic ? 'إرسال رابط إعادة التعيين' : 'Send reset link'}
          </PublicButton>
          <p className="text-center text-sm font-semibold text-white/50">
            <Link
              className="font-extrabold text-[var(--khalsni-public-primary)] hover:text-[var(--khalsni-public-primary-hover)]"
              to={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login'}
            >
              {isArabic ? 'العودة إلى تسجيل الدخول' : 'Back to sign in'}
            </Link>
          </p>
        </form>
      </PublicPanel>
    </PublicPageShell>
  )
}

export default ForgotPasswordPage
