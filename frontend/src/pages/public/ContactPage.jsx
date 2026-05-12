import { useState } from 'react'
import { useForm } from 'react-hook-form'

function ContactPage() {
  const [submitted, setSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  return (
    <div className="glass-panel p-6">
      <p className="text-sm font-bold text-brand-700">تواصل معنا</p>
      <h1 className="mt-2 text-3xl font-extrabold text-ink">أرسل استفسارك</h1>
      <form
        className="mt-8 grid gap-4 md:grid-cols-2"
        onSubmit={handleSubmit(() => {
          setSubmitted(true)
        })}
      >
        <div>
          <label className="mb-2 block text-sm font-semibold">الاسم</label>
          <input className="field" {...register('name', { required: 'الاسم مطلوب' })} />
          {errors.name ? <p className="mt-2 text-sm text-danger">{errors.name.message}</p> : null}
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold">الهاتف</label>
          <input className="field" {...register('phone', { required: 'الهاتف مطلوب' })} />
          {errors.phone ? <p className="mt-2 text-sm text-danger">{errors.phone.message}</p> : null}
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold">البريد الإلكتروني</label>
          <input className="field" {...register('email')} />
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold">الرسالة</label>
          <textarea className="field min-h-32" {...register('message', { required: 'الرسالة مطلوبة' })} />
          {errors.message ? <p className="mt-2 text-sm text-danger">{errors.message.message}</p> : null}
        </div>
        <div className="md:col-span-2">
          <button className="btn-primary">إرسال</button>
        </div>
      </form>
      {submitted ? <p className="mt-4 text-sm text-success">تم تسجيل رسالتك وسيتواصل معك فريق الدعم قريباً.</p> : null}
    </div>
  )
}

export default ContactPage
