import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { getDefaultDashboardPath } from '../../utils/authz'

function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [error, setError] = useState('')
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm({
    defaultValues: {
      email: 'admin@khalisni.local',
      password: 'Admin@123',
    },
  })

  async function onSubmit(values) {
    try {
      const user = await login(values)
      navigate(getDefaultDashboardPath(user))
    } catch {
      setError('تعذر تسجيل الدخول. تأكد من تشغيل الخلفية أو استخدم حسابات البيئة التجريبية.')
    }
  }

  return (
    <div className="mx-auto max-w-xl glass-panel p-6">
      <p className="text-sm font-bold text-brand-600">تسجيل الدخول</p>
      <h1 className="mt-2 text-3xl font-extrabold text-ink">الدخول إلى بوابات النظام</h1>
      <p className="mt-4 text-sm leading-7 text-slate-600">
        الحسابات التجريبية: `admin@khalisni.local` و `customer@khalisni.local` و `employee@khalisni.local` و
        `provider@khalisni.local`
      </p>
      <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <div>
          <label className="mb-2 block text-sm font-semibold">البريد الإلكتروني</label>
          <input className="field" {...register('email')} />
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold">كلمة المرور</label>
          <input className="field" type="password" {...register('password')} />
        </div>
        {error ? <p className="text-sm text-danger">{error}</p> : null}
        <button className="btn-primary w-full" disabled={isSubmitting}>
          {isSubmitting ? 'جاري الدخول...' : 'دخول'}
        </button>
      </form>
    </div>
  )
}

export default LoginPage

