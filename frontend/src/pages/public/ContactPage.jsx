import { Mail, MessageCircle, Phone } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { getDisplayError } from '../../api/client'
import { api } from '../../api/services'
import {
  PublicButton,
  PublicCard,
  PublicHero,
  PublicInput,
  PublicPageShell,
  PublicPanel,
  PublicTextarea,
} from '../../components/public/PublicPage'
import { useLanguage } from '../../context/LanguageContext'

function ContactPage() {
  const { isArabic } = useLanguage()
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm()

  async function onSubmit(values) {
    setSubmitted(false)
    setSubmitError('')
    try {
      await api.createContactInquiry(values)
      reset()
      setSubmitted(true)
    } catch (error) {
      setSubmitError(getDisplayError(error))
    }
  }

  function fieldError(name) {
    return errors[name] ? <p className="mt-2 text-sm font-semibold text-danger">{errors[name].message}</p> : null
  }

  function requirement(required) {
    return <span className="ms-2 text-xs font-semibold text-slate-600">{required ? (isArabic ? '(مطلوب)' : '(Required)') : (isArabic ? '(اختياري)' : '(Optional)')}</span>
  }

  return (
    <PublicPageShell>
      <PublicHero
        eyebrow={isArabic ? 'تواصل معنا' : 'Contact us'}
        icon={MessageCircle}
        title={isArabic ? 'أرسل استفسارك' : 'Send your inquiry'}
        description={isArabic ? 'فريق خلصني جاهز لمساعدتك في اختيار الخدمة، متابعة الطلب، أو توضيح المتطلبات.' : 'The Khalsni team can help you choose a service, follow up on a request, or clarify requirements.'}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <PublicPanel>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={handleSubmit(onSubmit)}
          >
            <div>
              <label htmlFor="contact-name" className="mb-2 block text-sm font-bold text-ink">{isArabic ? 'الاسم' : 'Name'}{requirement(true)}</label>
              <PublicInput aria-required="true" id="contact-name" {...register('name', { required: isArabic ? 'الاسم مطلوب' : 'Name is required' })} />
              {fieldError('name')}
            </div>
            <div>
              <label htmlFor="contact-phone" className="mb-2 block text-sm font-bold text-ink">{isArabic ? 'الهاتف' : 'Phone'}{requirement(true)}</label>
              <PublicInput aria-required="true" id="contact-phone" {...register('phone', { required: isArabic ? 'الهاتف مطلوب' : 'Phone is required' })} />
              {fieldError('phone')}
            </div>
            <div className="md:col-span-2">
              <label htmlFor="contact-email" className="mb-2 block text-sm font-bold text-ink">{isArabic ? 'البريد الإلكتروني' : 'Email'}{requirement(false)}</label>
              <PublicInput aria-required="false" id="contact-email" type="email" {...register('email')} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="contact-message" className="mb-2 block text-sm font-bold text-ink">{isArabic ? 'الرسالة' : 'Message'}{requirement(true)}</label>
              <PublicTextarea aria-required="true" id="contact-message" {...register('message', { required: isArabic ? 'الرسالة مطلوبة' : 'Message is required' })} />
              {fieldError('message')}
            </div>
            <div className="md:col-span-2">
              <PublicButton disabled={isSubmitting} type="submit">{isSubmitting ? (isArabic ? 'جار الإرسال...' : 'Sending...') : (isArabic ? 'إرسال' : 'Send')}</PublicButton>
            </div>
          </form>
          {submitError ? <p className="mt-4 text-sm font-semibold text-danger" role="alert">{submitError}</p> : null}
          {submitted ? (
            <p className="mt-4 rounded-[var(--radius-lg)] border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">
              {isArabic ? 'تم تسجيل رسالتك وسيتمكن فريق الدعم من مراجعتها.' : 'Your message was recorded for the support team to review.'}
            </p>
          ) : null}
        </PublicPanel>

        <div className="space-y-4">
          <PublicCard>
            <Phone className="h-7 w-7 text-[var(--khalsni-public-primary)]" />
            <p className="mt-3 text-lg font-extrabold text-ink">{isArabic ? 'الدعم المباشر' : 'Direct support'}</p>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">{isArabic ? 'استخدم زر الدعم العائم أو صفحة التتبع عند وجود طلب قائم.' : 'Use the floating support action or the tracking page for an existing request.'}</p>
          </PublicCard>
          <PublicCard>
            <Mail className="h-7 w-7 text-[var(--khalsni-public-primary)]" />
            <p className="mt-3 text-lg font-extrabold text-ink">{isArabic ? 'استفسارات الخدمات' : 'Service inquiries'}</p>
            <p className="mt-2 text-sm font-semibold leading-7 text-slate-600">{isArabic ? 'اذكر الخدمة المطلوبة وأي تفاصيل تساعدنا على توجيهك بسرعة.' : 'Mention the service and any details that help us route your inquiry quickly.'}</p>
          </PublicCard>
        </div>
      </div>
    </PublicPageShell>
  )
}

export default ContactPage
