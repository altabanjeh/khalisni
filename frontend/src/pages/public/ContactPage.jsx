import { Mail, MessageCircle, Phone } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm()

  function fieldError(name) {
    return errors[name] ? <p className="mt-2 text-sm font-semibold text-red-200">{errors[name].message}</p> : null
  }

  return (
    <PublicPageShell>
      <PublicHero
        eyebrow={isArabic ? 'تواصل معنا' : 'Contact us'}
        icon={MessageCircle}
        title={isArabic ? 'أرسل استفسارك' : 'Send your inquiry'}
        description={isArabic ? 'فريق خالصني جاهز لمساعدتك في اختيار الخدمة، متابعة الطلب، أو توضيح المتطلبات.' : 'The Khalsni team can help you choose a service, follow up on a request, or clarify requirements.'}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <PublicPanel>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={handleSubmit(() => {
              setSubmitted(true)
            })}
          >
            <div>
              <label htmlFor="contact-name" className="mb-2 block text-sm font-bold text-white/80">{isArabic ? 'الاسم' : 'Name'}</label>
              <PublicInput id="contact-name" {...register('name', { required: isArabic ? 'الاسم مطلوب' : 'Name is required' })} />
              {fieldError('name')}
            </div>
            <div>
              <label htmlFor="contact-phone" className="mb-2 block text-sm font-bold text-white/80">{isArabic ? 'الهاتف' : 'Phone'}</label>
              <PublicInput id="contact-phone" {...register('phone', { required: isArabic ? 'الهاتف مطلوب' : 'Phone is required' })} />
              {fieldError('phone')}
            </div>
            <div className="md:col-span-2">
              <label htmlFor="contact-email" className="mb-2 block text-sm font-bold text-white/80">{isArabic ? 'البريد الإلكتروني' : 'Email'}</label>
              <PublicInput id="contact-email" type="email" {...register('email')} />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="contact-message" className="mb-2 block text-sm font-bold text-white/80">{isArabic ? 'الرسالة' : 'Message'}</label>
              <PublicTextarea id="contact-message" {...register('message', { required: isArabic ? 'الرسالة مطلوبة' : 'Message is required' })} />
              {fieldError('message')}
            </div>
            <div className="md:col-span-2">
              <PublicButton type="submit">{isArabic ? 'إرسال' : 'Send'}</PublicButton>
            </div>
          </form>
          {submitted ? (
            <p className="mt-4 rounded-lg border border-green-300/25 bg-green-500/15 px-4 py-3 text-sm font-semibold text-green-100">
              {isArabic ? 'تم تسجيل رسالتك وسيتواصل معك فريق الدعم قريبا.' : 'Your message has been recorded and the support team will contact you soon.'}
            </p>
          ) : null}
        </PublicPanel>

        <div className="space-y-4">
          <PublicCard>
            <Phone className="h-7 w-7 text-[var(--khalsni-public-primary)]" />
            <p className="mt-3 text-lg font-extrabold text-white">{isArabic ? 'الدعم المباشر' : 'Direct support'}</p>
            <p className="mt-2 text-sm font-semibold leading-7 text-white/60">{isArabic ? 'استخدم زر الدعم العائم أو صفحة التتبع عند وجود طلب قائم.' : 'Use the floating support action or the tracking page for an existing request.'}</p>
          </PublicCard>
          <PublicCard>
            <Mail className="h-7 w-7 text-[var(--khalsni-public-primary)]" />
            <p className="mt-3 text-lg font-extrabold text-white">{isArabic ? 'استفسارات الخدمات' : 'Service inquiries'}</p>
            <p className="mt-2 text-sm font-semibold leading-7 text-white/60">{isArabic ? 'اذكر الخدمة المطلوبة وأي تفاصيل تساعدنا على توجيهك بسرعة.' : 'Mention the service and any details that help us route your inquiry quickly.'}</p>
          </PublicCard>
        </div>
      </div>
    </PublicPageShell>
  )
}

export default ContactPage
