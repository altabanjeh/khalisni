import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useLanguage } from '../../context/LanguageContext'

function ContactPage() {
  const { isArabic } = useLanguage()
  const [submitted, setSubmitted] = useState(false)
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  return (
    <div className="glass-panel p-6">
      <p className="text-sm font-bold text-brand-700">{isArabic ? 'تواصل معنا' : 'Contact us'}</p>
      <h1 className="mt-2 text-3xl font-extrabold text-ink">{isArabic ? 'أرسل استفسارك' : 'Send your inquiry'}</h1>
      <form
        className="mt-8 grid gap-4 md:grid-cols-2"
        onSubmit={handleSubmit(() => {
          setSubmitted(true)
        })}
      >
        <div>
          <label className="mb-2 block text-sm font-semibold">{isArabic ? 'الاسم' : 'Name'}</label>
          <input className="field" {...register('name', { required: isArabic ? 'الاسم مطلوب' : 'Name is required' })} />
          {errors.name ? <p className="mt-2 text-sm text-danger">{errors.name.message}</p> : null}
        </div>
        <div>
          <label className="mb-2 block text-sm font-semibold">{isArabic ? 'الهاتف' : 'Phone'}</label>
          <input className="field" {...register('phone', { required: isArabic ? 'الهاتف مطلوب' : 'Phone is required' })} />
          {errors.phone ? <p className="mt-2 text-sm text-danger">{errors.phone.message}</p> : null}
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold">{isArabic ? 'البريد الإلكتروني' : 'Email'}</label>
          <input className="field" {...register('email')} />
        </div>
        <div className="md:col-span-2">
          <label className="mb-2 block text-sm font-semibold">{isArabic ? 'الرسالة' : 'Message'}</label>
          <textarea className="field min-h-32" {...register('message', { required: isArabic ? 'الرسالة مطلوبة' : 'Message is required' })} />
          {errors.message ? <p className="mt-2 text-sm text-danger">{errors.message.message}</p> : null}
        </div>
        <div className="md:col-span-2">
          <button className="btn-primary">{isArabic ? 'إرسال' : 'Send'}</button>
        </div>
      </form>
      {submitted ? (
        <p className="mt-4 text-sm text-success">
          {isArabic
            ? 'تم تسجيل رسالتك وسيتواصل معك فريق الدعم قريباً.'
            : 'Your message has been recorded and the support team will contact you soon.'}
        </p>
      ) : null}
    </div>
  )
}

export default ContactPage
