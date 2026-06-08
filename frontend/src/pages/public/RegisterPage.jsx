import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../../api/services'
import { getDisplayError } from '../../api/client'
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
      if (nextPath) {
        loginParams.set('next', nextPath)
      }
      if (createdUser?.email) {
        loginParams.set('email', createdUser.email)
      }
      navigate(`/login?${loginParams.toString()}`, { replace: true })
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
    <div className="mx-auto max-w-2xl glass-panel p-6">
      <p className="text-sm font-bold text-brand-600">{isArabic ? 'إنشاء حساب عميل' : 'Create a customer account'}</p>
      <h1 className="mt-2 text-3xl font-extrabold text-ink">{isArabic ? 'أنشئ حسابك قبل طلب الخدمة' : 'Create your account before requesting a service'}</h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        {isArabic
          ? 'يجب إنشاء حساب عميل أولاً، ثم تسجيل الدخول، وبعدها يمكنك إرسال الطلب ومتابعته من لوحة العميل.'
          : 'Create a customer account first, then sign in to submit and track your request from the customer dashboard.'}
      </p>

      <form className="mt-8 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
        <div className="md:col-span-2">
          <label htmlFor="reg-full-name" className="mb-2 block text-sm font-semibold">{isArabic ? 'الاسم الكامل' : 'Full name'}</label>
          <input id="reg-full-name" className="field" {...register('full_name', { required: isArabic ? 'الاسم الكامل مطلوب' : 'Full name is required' })} />
          {errors.full_name ? <p className="mt-2 text-sm text-danger">{errors.full_name.message}</p> : null}
        </div>

        <div>
          <label htmlFor="reg-phone" className="mb-2 block text-sm font-semibold">{isArabic ? 'رقم الهاتف' : 'Phone number'}</label>
          <input id="reg-phone" className="field" {...register('phone', { required: isArabic ? 'رقم الهاتف مطلوب' : 'Phone number is required' })} />
          {errors.phone ? <p className="mt-2 text-sm text-danger">{errors.phone.message}</p> : null}
        </div>

        <div>
          <label htmlFor="reg-email" className="mb-2 block text-sm font-semibold">{isArabic ? 'البريد الإلكتروني' : 'Email'}</label>
          <input id="reg-email" className="field" type="email" {...register('email', { required: isArabic ? 'البريد الإلكتروني مطلوب' : 'Email is required' })} />
          {errors.email ? <p className="mt-2 text-sm text-danger">{errors.email.message}</p> : null}
        </div>

        <div>
          <label htmlFor="reg-national-id" className="mb-2 block text-sm font-semibold">{isArabic ? 'الرقم الوطني' : 'National ID'}</label>
          <input id="reg-national-id" className="field" {...register('national_id')} />
          {errors.national_id ? <p className="mt-2 text-sm text-danger">{errors.national_id.message}</p> : null}
        </div>

        <div>
          <label htmlFor="reg-password" className="mb-2 block text-sm font-semibold">{isArabic ? 'كلمة المرور' : 'Password'}</label>
          <input
            id="reg-password"
            className="field"
            type="password"
            {...register('password', {
              required: isArabic ? 'كلمة المرور مطلوبة' : 'Password is required',
              minLength: {
                value: 8,
                message: isArabic ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' : 'Password must be at least 8 characters',
              },
            })}
          />
          {errors.password ? <p className="mt-2 text-sm text-danger">{errors.password.message}</p> : null}
        </div>

        {error ? <p className="md:col-span-2 text-sm text-danger">{error}</p> : null}

        <div className="md:col-span-2 space-y-3">
          <button className="btn-primary w-full" disabled={isSubmitting} type="submit">
            {isSubmitting ? (isArabic ? 'جارٍ إنشاء الحساب...' : 'Creating account...') : isArabic ? 'إنشاء الحساب' : 'Create account'}
          </button>
          <p className="text-center text-sm text-slate-600">
            {isArabic ? 'لديك حساب بالفعل؟' : 'Already have an account?'}{' '}
            <Link
              className="font-semibold text-brand-700 hover:text-brand-800"
              to={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : '/login'}
            >
              {isArabic ? 'سجل الدخول' : 'Sign in'}
            </Link>
          </p>
        </div>
      </form>
    </div>
  )
}

export default RegisterPage
