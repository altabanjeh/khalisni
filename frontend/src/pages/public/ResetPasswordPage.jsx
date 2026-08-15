import { LockKeyhole } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router-dom'
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

      if (!hasFieldErrors) setError(getDisplayError(submitError))
    }
  }

  function fieldError(name) {
    return errors[name] ? <p className="mt-2 text-sm font-semibold text-red-200">{errors[name].message}</p> : null
  }

  return (
    <PublicPageShell>
      <PublicHero
        eyebrow={isArabic ? 'تعيين كلمة مرور جديدة' : 'Reset password'}
        icon={LockKeyhole}
        title={isArabic ? 'اختر كلمة مرور جديدة' : 'Choose a new password'}
        description={isArabic ? 'أدخل كلمة المرور الجديدة مرتين. سيتم استخدام الرابط مرة واحدة فقط وينتهي بعد المدة المحددة.' : 'Enter your new password twice. The reset link can only be used once and expires after the configured window.'}
      />

      <PublicPanel className="mx-auto max-w-xl">
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label htmlFor="reset-new-password" className="mb-2 block text-sm font-bold text-white/80">{isArabic ? 'كلمة المرور الجديدة' : 'New password'}</label>
            <PublicInput
              id="reset-new-password"
              autoComplete="new-password"
              type="password"
              {...register('new_password', {
                required: isArabic ? 'كلمة المرور الجديدة مطلوبة' : 'New password is required',
              })}
            />
            {fieldError('new_password')}
          </div>
          <div>
            <label htmlFor="reset-confirm-password" className="mb-2 block text-sm font-bold text-white/80">{isArabic ? 'تأكيد كلمة المرور الجديدة' : 'Confirm new password'}</label>
            <PublicInput
              id="reset-confirm-password"
              autoComplete="new-password"
              type="password"
              {...register('confirm_new_password', {
                required: isArabic ? 'تأكيد كلمة المرور مطلوب' : 'Password confirmation is required',
              })}
            />
            {fieldError('confirm_new_password')}
          </div>
          {error ? <p className="text-sm font-semibold text-red-200">{error}</p> : null}
          <PublicButton className="w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? (isArabic ? 'جار إعادة التعيين...' : 'Resetting...') : isArabic ? 'إعادة تعيين كلمة المرور' : 'Reset password'}
          </PublicButton>
          <p className="text-center text-sm font-semibold text-white/50">
            <Link className="font-extrabold text-[var(--khalsni-public-primary)] hover:text-[var(--khalsni-public-primary-hover)]" to="/login">
              {isArabic ? 'العودة إلى تسجيل الدخول' : 'Back to sign in'}
            </Link>
          </p>
        </form>
      </PublicPanel>
    </PublicPageShell>
  )
}

export default ResetPasswordPage
