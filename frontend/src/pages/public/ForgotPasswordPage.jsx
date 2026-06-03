import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useSearchParams } from 'react-router-dom'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
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
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      email: searchParams.get('email') || '',
    },
  })

  async function onSubmit(values) {
    setError('')
    try {
      const response = await api.forgotPassword(values)
      setSuccessMessage(response?.detail || 'If this email is registered, a password reset link has been sent.')
    } catch (submitError) {
      setError(getDisplayError(submitError))
    }
  }

  return (
    <div className="mx-auto max-w-xl glass-panel p-6">
      <p className="text-sm font-bold text-brand-600">{isArabic ? 'استعادة كلمة المرور' : 'Forgot password'}</p>
      <h1 className="mt-2 text-3xl font-extrabold text-ink">{isArabic ? 'أرسل رابط إعادة التعيين' : 'Send a reset link'}</h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        {isArabic
          ? 'أدخل البريد الإلكتروني المرتبط بحساب العميل. إذا كان مسجلاً لدينا، سنرسل رابط إعادة تعيين صالح لمدة 30 دقيقة.'
          : 'Enter the email address linked to your customer account. If it is registered, we will send a reset link valid for 30 minutes.'}
      </p>

      {successMessage ? (
        <div className="mt-4 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{successMessage}</div>
      ) : null}

      <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="mb-2 block text-sm font-semibold">{isArabic ? 'البريد الإلكتروني' : 'Email address'}</label>
          <input
            autoComplete="email"
            className="field"
            type="email"
            {...register('email', { required: isArabic ? 'البريد الإلكتروني مطلوب' : 'Email is required' })}
          />
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button className="btn-primary w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? (isArabic ? 'جارٍ الإرسال...' : 'Sending...') : isArabic ? 'إرسال رابط إعادة التعيين' : 'Send reset link'}
        </button>
        <p className="text-center text-sm text-slate-600">
          <Link
            className="font-semibold text-brand-700 hover:text-brand-800"
            to={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login'}
          >
            {isArabic ? 'العودة إلى تسجيل الدخول' : 'Back to sign in'}
          </Link>
        </p>
      </form>
    </div>
  )
}

export default ForgotPasswordPage
