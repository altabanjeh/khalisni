import { UserRound } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import PageHeader from '../../components/PageHeader'
import { AUTH_STORAGE_MODE_LOCAL, getDisplayError, getStoredAuthMode, storeAuthTokens } from '../../api/client'
import { api } from '../../api/services'
import { useAuth } from '../../context/AuthContext'
import { useLanguage } from '../../context/LanguageContext'

function Field({ id, label, hint, error, children }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-bold text-ink" htmlFor={id}>
        {label}
      </label>
      {children}
      {hint && !error ? <p className="mt-1 text-xs font-semibold text-slate-500">{hint}</p> : null}
      {error ? <p className="mt-1 text-xs font-semibold text-danger">{error}</p> : null}
    </div>
  )
}

function ProfilePage() {
  const { user, setUser } = useAuth()
  const { isArabic } = useLanguage()
  const [status, setStatus] = useState({ saved: false, error: '' })
  const {
    register,
    handleSubmit,
    watch,
    setError,
    resetField,
    formState: { isSubmitting, errors },
  } = useForm({
    defaultValues: {
      full_name: user?.full_name,
      phone: user?.phone,
      email: user?.email,
      national_id: user?.national_id,
    },
  })

  // Email is the sign-in name and the phone number protects public tracking,
  // so the server asks for the current password before changing either.
  const watched = watch(['email', 'phone'])
  const identityChanged = (watched[0] ?? '') !== (user?.email ?? '') || (watched[1] ?? '') !== (user?.phone ?? '')

  async function onSubmit(values) {
    setStatus({ saved: false, error: '' })
    const payload = { ...values }
    if (!identityChanged) delete payload.current_password
    try {
      const { tokens, ...updated } = await api.updateProfile(payload)
      if (tokens?.access && tokens?.refresh) {
        // Other sessions were signed out; this one continues with new tokens.
        storeAuthTokens(tokens, { persistent: getStoredAuthMode() === AUTH_STORAGE_MODE_LOCAL })
      }
      setUser((current) => ({ ...current, ...updated }))
      resetField('current_password')
      setStatus({ saved: true, error: '' })
    } catch (error) {
      const passwordError = error?.apiError?.fieldErrors?.current_password?.[0]
      if (passwordError) setError('current_password', { type: 'server', message: passwordError })
      setStatus({ saved: false, error: passwordError ? '' : getDisplayError(error) })
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        description={isArabic ? 'تحديث معلومات الحساب المستخدمة في الطلبات والإشعارات.' : 'Update the account details used across your requests and notifications.'}
        eyebrow={isArabic ? 'الملف الشخصي' : 'Profile'}
        icon={UserRound}
        title={isArabic ? 'بيانات الحساب' : 'Account details'}
      />

      <section className="rounded-[var(--radius-xl)] border border-border bg-card p-5 shadow-soft sm:p-6">
        <h2 className="text-base font-extrabold text-ink">{isArabic ? 'المعلومات الشخصية' : 'Personal information'}</h2>
        <p className="mt-1 text-sm font-semibold text-slate-600">
          {isArabic ? 'تُستخدم هذه البيانات للتواصل ومتابعة الطلبات.' : 'These details are used for contact and request follow-up.'}
        </p>

        <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <Field id="profile-name" label={isArabic ? 'الاسم الكامل' : 'Full name'}>
            <input className="field" id="profile-name" {...register('full_name')} />
          </Field>
          <Field id="profile-phone" label={isArabic ? 'رقم الهاتف' : 'Phone number'}>
            <input className="field" id="profile-phone" inputMode="tel" {...register('phone')} />
          </Field>
          <Field id="profile-email" label={isArabic ? 'البريد الإلكتروني' : 'Email address'}>
            <input className="field" id="profile-email" type="email" {...register('email')} />
          </Field>
          <Field
            id="profile-national-id"
            label={isArabic ? 'الرقم الوطني' : 'National ID'}
            hint={isArabic ? 'يظهر في الطلبات الرسمية.' : 'Appears on official requests.'}
          >
            <input className="field" id="profile-national-id" {...register('national_id')} />
          </Field>

          {identityChanged ? (
            <div className="md:col-span-2">
              <Field
                error={errors.current_password?.message}
                hint={isArabic ? 'مطلوبة لتغيير البريد الإلكتروني أو رقم الهاتف. سيتم تسجيل الخروج من الأجهزة الأخرى عند تغيير البريد.' : 'Required to change your email or phone number. Changing the email signs out your other devices.'}
                id="profile-current-password"
                label={isArabic ? 'كلمة المرور الحالية' : 'Current password'}
              >
                <input
                  autoComplete="current-password"
                  className="field"
                  id="profile-current-password"
                  type="password"
                  {...register('current_password', { required: isArabic ? 'أدخل كلمة المرور الحالية' : 'Enter your current password' })}
                />
              </Field>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-3 md:col-span-2">
            <button className="btn-primary" disabled={isSubmitting} type="submit">
              {isSubmitting ? (isArabic ? 'جارٍ الحفظ...' : 'Saving...') : isArabic ? 'حفظ التعديلات' : 'Save changes'}
            </button>
            {status.saved ? (
              <p className="text-sm font-semibold text-success">{isArabic ? 'تم تحديث البيانات.' : 'Your details were updated.'}</p>
            ) : null}
            {status.error ? <p className="text-sm font-semibold text-danger">{status.error}</p> : null}
          </div>
        </form>
      </section>
    </div>
  )
}

export default ProfilePage
