import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
import { useLanguage } from '../../context/LanguageContext'

function ResetPasswordPage() {
  const navigate = useNavigate()
  const { token = '' } = useParams()
  const { isArabic } = useLanguage()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      new_password: '',
      confirm_new_password: '',
    },
  })

  async function onSubmit(values) {
    setError('')
    try {
      await api.resetPassword(token, values)
      navigate('/login?reset=1', { replace: true })
    } catch (submitError) {
      const fieldErrors = submitError?.fieldErrors || {}
      let hasFieldErrors = false

      Object.entries(fieldErrors).forEach(([fieldName, messages]) => {
        if (!messages?.length) return
        hasFieldErrors = true
        setFieldError(fieldName, { type: 'server', message: messages[0] })
      })

      if (!hasFieldErrors) {
        setError(getDisplayError(submitError))
      }
    }
  }

  return (
    <div className="mx-auto max-w-xl glass-panel p-6">
      <p className="text-sm font-bold text-brand-600">{isArabic ? 'تعيين كلمة مرور جديدة' : 'Reset password'}</p>
      <h1 className="mt-2 text-3xl font-extrabold text-ink">{isArabic ? 'اختر كلمة مرور جديدة' : 'Choose a new password'}</h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        {isArabic
          ? 'أدخل كلمة المرور الجديدة مرتين. سيتم استخدام الرابط مرة واحدة فقط وينتهي خلال 30 دقيقة.'
          : 'Enter your new password twice. The reset link can only be used once and expires after 30 minutes.'}
      </p>

      <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="mb-2 block text-sm font-semibold">{isArabic ? 'كلمة المرور الجديدة' : 'New password'}</label>
          <input
            autoComplete="new-password"
            className="field"
            type="password"
            {...register('new_password', {
              required: isArabic ? 'كلمة المرور الجديدة مطلوبة' : 'New password is required',
            })}
          />
          {errors.new_password ? <p className="mt-2 text-sm text-danger">{errors.new_password.message}</p> : null}
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold">{isArabic ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password'}</label>
          <input
            autoComplete="new-password"
            className="field"
            type="password"
            {...register('confirm_new_password', {
              required: isArabic ? 'تأكيد كلمة المرور مطلوب' : 'Password confirmation is required',
            })}
          />
          {errors.confirm_new_password ? <p className="mt-2 text-sm text-danger">{errors.confirm_new_password.message}</p> : null}
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button className="btn-primary w-full" disabled={isSubmitting} type="submit">
          {isSubmitting ? (isArabic ? 'جارٍ إعادة التعيين...' : 'Resetting...') : isArabic ? 'إعادة تعيين كلمة المرور' : 'Reset password'}
        </button>
        <p className="text-center text-sm text-slate-600">
          <Link className="font-semibold text-brand-700 hover:text-brand-800" to="/login">
            {isArabic ? 'العودة إلى تسجيل الدخول' : 'Back to sign in'}
          </Link>
        </p>
      </form>
    </div>
  )
}

export default ResetPasswordPage
