import { Megaphone, MessageCircleMore, Phone, Search, ShieldCheck } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import LoadingSpinner from '../LoadingSpinner'
import ServiceCard from '../ServiceCard'
import { isExternalUrl } from '../../utils/publicSiteDefaults'

function ActionLink({ className, label, to }) {
  if (!to || !label) return null
  if (isExternalUrl(to)) {
    return (
      <a className={className} href={to} rel="noreferrer" target="_blank">
        {label}
      </a>
    )
  }
  return (
    <Link className={className} to={to}>
      {label}
    </Link>
  )
}

function AdvertisementCard({ advertisement, compact = false }) {
  const backgroundColor = advertisement.background_color || 'rgba(255,255,255,0.92)'
  const textColor = advertisement.text_color || 'var(--public-text-color)'

  return (
    <article
      className={`overflow-hidden rounded-[2rem] border border-border shadow-soft ${compact ? 'p-5' : 'p-6'}`}
      style={{ backgroundColor, color: textColor }}
    >
      <div className={`${advertisement.image_url ? 'grid gap-5 lg:grid-cols-[1fr_220px]' : 'space-y-4'}`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.2em] opacity-70">{advertisement.advertisement_type.replace(/_/g, ' ')}</p>
          <h3 className="mt-3 text-2xl font-extrabold">{advertisement.title_ar || advertisement.title_en}</h3>
          <p className="mt-3 text-sm leading-7 opacity-90">
            {advertisement.description_ar || advertisement.description_en}
          </p>
          {advertisement.button_url && (advertisement.button_text_ar || advertisement.button_text_en) ? (
            <div className="mt-5">
              <ActionLink
                className="inline-flex items-center justify-center rounded-2xl border border-black/10 bg-white/80 px-5 py-3 text-sm font-semibold text-ink transition hover:bg-white"
                label={advertisement.button_text_ar || advertisement.button_text_en}
                to={advertisement.button_url}
              />
            </div>
          ) : null}
        </div>
        {advertisement.image_url ? (
          <img
            alt={advertisement.title_ar || advertisement.title_en}
            className="h-full max-h-56 w-full rounded-[1.5rem] object-cover"
            src={advertisement.image_url}
          />
        ) : null}
      </div>
    </article>
  )
}

function PublicHomepageTemplate({
  advertisements,
  content,
  featuredServices,
  loadingServices,
  previewMode = false,
}) {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  const bannerAdvertisements = advertisements.slice(0, 3)

  return (
    <div className="space-y-8">
      <section className="public-hero-section relative overflow-hidden rounded-[2rem] px-6 py-16 text-white shadow-soft">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_bottom_left,_rgba(255,255,255,0.12),_transparent_28%)]" />
        <div className="relative grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
          <div>
            <p className="inline-flex rounded-full bg-white/10 px-4 py-2 text-sm font-bold text-white/90">
              منصة أردنية قابلة للتحديث من لوحة الإدارة
            </p>
            <h1 className="mt-6 text-4xl font-extrabold leading-tight md:text-5xl">{content.hero_title_ar || content.hero_title_en}</h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-white/85">
              {content.hero_subtitle_ar || content.hero_subtitle_en}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ActionLink className="public-primary-button" label={content.primary_button_text} to={content.primary_button_url} />
              <ActionLink className="public-secondary-button" label={content.secondary_button_text} to={content.secondary_button_url} />
            </div>
          </div>

          <div className="glass-panel bg-white/12 p-6 text-white backdrop-blur">
            {content.hero_image_url ? (
              <img
                alt={content.hero_title_ar || content.hero_title_en}
                className="mb-5 h-56 w-full rounded-[1.5rem] object-cover"
                src={content.hero_image_url}
              />
            ) : null}
            <p className="text-sm font-bold text-white/90">ابحث عن الخدمة المناسبة</p>
            <div className="mt-4 flex gap-3">
              <input
                className="field bg-white/90 text-ink"
                placeholder="اكتب اسم الخدمة أو الجهة"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button className="public-primary-button shrink-0" onClick={() => navigate(`/services?search=${encodeURIComponent(search)}`)} type="button">
                <Search className="h-4 w-4" />
                بحث
              </button>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                'اختر الخدمة',
                'ارفع الوثائق',
                'تابع الطلب',
                previewMode ? 'راجع الصفحة قبل النشر' : 'استلم النتيجة',
              ].map((item, index) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/10 p-4 text-sm">
                  <span className="mb-2 block text-white/75">0{index + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {bannerAdvertisements.length ? (
        <section className="grid gap-4 lg:grid-cols-3">
          {bannerAdvertisements.map((advertisement) => (
            <AdvertisementCard key={advertisement.id || advertisement.advertisement_id} advertisement={advertisement} compact />
          ))}
        </section>
      ) : null}

      <section className="grid gap-6 md:grid-cols-3">
        {[
          { title: 'سريع وواضح', text: 'إدارة محتوى الصفحة الرئيسية لا تحتاج لأي تدخل تقني بعد الإعداد.' },
          { title: 'وثائقك محمية', text: 'ملفات العملاء تبقى ضمن النظام الحالي بصلاحيات الوصول الموجودة بدون أي كسر للمنطق.' },
          { title: 'تشغيل احترافي', text: 'التنبيهات والإعلانات تظهر تلقائياً فقط إذا كانت فعالة وضمن التاريخ المحدد.' },
        ].map((item) => (
          <div key={item.title} className="glass-panel p-6">
            <h3 className="text-xl font-bold text-ink">{item.title}</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">{item.text}</p>
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <div className="glass-panel p-6">
          <div className="flex items-center gap-3">
            <span className="icon-chip">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-brand-700">كيف تعمل المنصة</p>
              <h2 className="section-title text-2xl">خطوات واضحة للعميل والإدارة</h2>
            </div>
          </div>
          <p className="mt-5 text-sm leading-8 text-slate-600">{content.how_it_works_text}</p>
        </div>
        <div className="glass-panel p-6">
          <div className="flex items-center gap-3">
            <span className="icon-chip">
              <Phone className="h-5 w-5" />
            </span>
            <div>
              <p className="text-sm font-bold text-brand-700">تواصل معنا</p>
              <h2 className="section-title text-2xl">قنوات الدعم العامة</h2>
            </div>
          </div>
          <div className="mt-5 space-y-4 text-sm text-slate-600">
            <div className="rounded-2xl border border-border bg-brand-50/60 p-4">
              <p className="font-bold text-ink">الهاتف</p>
              <p className="mt-1">{content.contact_phone}</p>
            </div>
            <div className="rounded-2xl border border-border bg-brand-50/60 p-4">
              <p className="font-bold text-ink">واتساب</p>
              <p className="mt-1">{content.whatsapp_number}</p>
            </div>
            <div className="rounded-2xl border border-border bg-brand-50/60 p-4">
              <p className="font-bold text-ink">البريد الإلكتروني</p>
              <p className="mt-1">{content.email}</p>
            </div>
            <div className="rounded-2xl border border-border bg-brand-50/60 p-4">
              <p className="font-bold text-ink">العنوان</p>
              <p className="mt-1">{content.office_address}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-brand-700">الإعلانات والتنبيهات</p>
            <h2 className="section-title">محتوى ترويجي وتحديثات عامة قابلة للإدارة</h2>
          </div>
          <span className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">
            {advertisements.length} إعلان نشط
          </span>
        </div>
        {advertisements.length ? (
          <div className="grid gap-5">
            {advertisements.map((advertisement) => (
              <AdvertisementCard key={advertisement.id || advertisement.advertisement_id} advertisement={advertisement} />
            ))}
          </div>
        ) : (
          <div className="glass-panel p-6 text-sm text-slate-500">لا توجد إعلانات نشطة حالياً.</div>
        )}
      </section>

      <section className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-brand-700">الخدمات المميزة</p>
            <h2 className="section-title">ابدأ من أكثر الخدمات طلباً</h2>
          </div>
          {!previewMode ? (
            <Link className="btn-secondary" to="/services">
              كل الخدمات
            </Link>
          ) : (
            <span className="rounded-full bg-brand-50 px-4 py-2 text-sm font-semibold text-brand-700">وضع المعاينة</span>
          )}
        </div>
        {loadingServices ? (
          <LoadingSpinner />
        ) : (
          <div className="grid gap-6 lg:grid-cols-3">
            {featuredServices.map((service) => (
              <ServiceCard key={service.id} service={service} />
            ))}
          </div>
        )}
      </section>

      <section className="glass-panel p-6">
        <div className="flex items-center gap-3">
          <span className="icon-chip">
            <Megaphone className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-brand-700">معلومة تشغيلية</p>
            <h2 className="text-xl font-bold text-ink">هذا المحتوى يُدار بالكامل من لوحة الإدارة</h2>
          </div>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-brand-50/60 p-4 text-sm text-slate-600">
            يمكن للإدارة تعديل النصوص، الألوان، الشعار، صورة البطل، والإعلانات بدون تغيير الكود.
          </div>
          <div className="rounded-2xl border border-border bg-brand-50/60 p-4 text-sm text-slate-600">
            الإعلانات المهمة تظهر تلقائياً كتنبيه عاجل عندما تكون فعّالة وضمن الفترة الزمنية المحددة.
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
          <MessageCircleMore className="h-4 w-4" />
          {previewMode ? 'هذه معاينة داخل لوحة الإدارة.' : 'يمكن ربط هذه البيانات مع حملات أو تنبيهات تشغيلية لاحقاً.'}
        </div>
      </section>
    </div>
  )
}

export default PublicHomepageTemplate

