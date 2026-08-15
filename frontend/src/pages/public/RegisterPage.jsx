import { UserPlus } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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

function RegisterPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { isArabic } = useLanguage()
  const [error, setError] = useState('')
  const nextPath = getSafeNextPath(searchParams.get('next'))
  const {
    register,
    handleSubmit,
    setError: setFieldError,
    formState: { errors, isSubmitting },
  } = useForm({
    defaultValues: {
      full_name: '',
      phone: '',
      email: '',
      national_id: '',
      password: '',
    },
  })

  async function onSubmit(values) {
    setError('')
    try {
      const createdUser = await api.register(values)
      const loginParams = new URLSearchParams()
      loginParams.set('registered', '1')
      if (nextPath) loginParams.set('next', nextPath)
      if (createdUser?.email) loginParams.set('email', createdUser.email)
      navigate(`/login?${loginParams.toString()}`, { replace: true })
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
        eyebrow={isArabic ? 'إنشاء حساب عميل' : 'Create a customer account'}
        icon={UserPlus}
        title={isArabic ? 'أنشئ حسابك قبل طلب الخدمة' : 'Create your account before requesting a service'}
        description={isArabic ? 'بعد إنشاء الحساب ستتمكن من إرسال الطلبات ورفع المستندات ومتابعة الحالة من بوابة العميل.' : 'After creating an account, you can submit requests, upload documents, and track progress from the customer portal.'}
      />

      <PublicPanel className="mx-auto max-w-4xl">
        <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <div className="md:col-span-2">
            <label htmlFor="reg-full-name" className="mb-2 block text-sm font-bold text-white/80">{isArabic ? 'الاسم الكامل' : 'Full name'}</label>
            <PublicInput id="reg-full-name" {...register('full_name', { required: isArabic ? 'الاسم الكامل مطلوب' : 'Full name is required' })} />
            {fieldError('full_name')}
          </div>

          <div>
            <label htmlFor="reg-phone" className="mb-2 block text-sm font-bold text-white/80">{isArabic ? 'رقم الهاتف' : 'Phone number'}</label>
            <PublicInput id="reg-phone" {...register('phone', { required: isArabic ? 'رقم الهاتف مطلوب' : 'Phone number is required' })} />
            {fieldError('phone')}
          </div>

          <div>
            <label htmlFor="reg-email" className="mb-2 block text-sm font-bold text-white/80">{isArabic ? 'البريد الإلكتروني' : 'Email'}</label>
            <PublicInput id="reg-email" type="email" {...register('email', { required: isArabic ? 'البريد الإلكتروني مطلوب' : 'Email is required' })} />
            {fieldError('email')}
          </div>

          <div>
            <label htmlFor="reg-national-id" className="mb-2 block text-sm font-bold text-white/80">{isArabic ? 'الرقم الوطني' : 'National ID'}</label>
            <PublicInput id="reg-national-id" {...register('national_id')} />
            {fieldError('national_id')}
          </div>

          <div>
            <label htmlFor="reg-password" className="mb-2 block text-sm font-bold text-white/80">{isArabic ? 'كلمة المرور' : 'Password'}</label>
            <PublicInput
              id="reg-password"
              type="password"
              {...register('password', {
                required: isArabic ? 'كلمة المرور مطلوبة' : 'Password is required',
                minLength: {
                  value: 8,
                  message: isArabic ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters',
                },
              })}
            />
            {fieldError('password')}
          </div>

          {error ? <p className="text-sm font-semibold text-red-200 md:col-span-2">{error}</p> : null}

          <div className="md:col-span-2 space-y-3">
            <PublicButton className="w-full" disabled={isSubmitting} type="submit">
              {isSubmitting ? (isArabic ? 'جار إنشاء الحساب...' : 'Creating account...') : isArabic ? 'إنشاء الحساب' : 'Create account'}
            </PublicButton>
            <p className="text-center text-sm font-semibold text-white/50">
              {isArabic ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
              <Link
                className="font-extrabold text-[var(--khalsni-public-primary)] hover:text-[var(--khalsni-public-primary-hover)]"
                to={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login'}
              >
                {isArabic ? 'سجل الدخول' : 'Sign in'}
              </Link>
            </p>
          </div>
        </form>
      </PublicPanel>
    </PublicPageShell>
  )
}

export default RegisterPage
