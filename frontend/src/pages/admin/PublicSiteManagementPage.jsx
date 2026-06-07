import { Eye, FileText, ImagePlus, MessageSquareMore, Palette } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'
import { useLanguage } from '../../context/LanguageContext'

function PublicSiteManagementPage() {
  const { isArabic } = useLanguage()

  const managementCards = [
    {
      to: '/admin/public-site/content',
      title: isArabic ? 'محرر محتوى الصفحة الرئيسية' : 'Homepage Content Editor',
      subtitle: isArabic ? 'تحرير محتوى الصفحة الرئيسية' : 'Edit homepage content',
      description: isArabic
        ? 'عدّل العنوان الرئيسي، النصوص، الأزرار، صورة البطل، وبيانات التواصل.'
        : 'Update the hero title, copy, buttons, hero image, and contact details.',
      icon: FileText,
    },
    {
      to: '/admin/public-site/advertisements',
      title: isArabic ? 'إدارة الإعلانات' : 'Advertisement Manager',
      subtitle: isArabic ? 'إدارة الإعلانات والتنبيهات' : 'Manage promotions and alerts',
      description: isArabic
        ? 'أضف إعلانات وعروضاً وتنبيهات مهمة مع جدولة زمنية وتفعيل سريع.'
        : 'Create announcements, offers, and alerts with scheduling and quick activation.',
      icon: ImagePlus,
    },
    {
      to: '/admin/public-site/theme',
      title: isArabic ? 'إعدادات المظهر' : 'Theme Settings',
      subtitle: isArabic ? 'الألوان والهوية' : 'Colors and branding',
      description: isArabic
        ? 'تحكم في ألوان الواجهة العامة، الشعار، وأيقونة الموقع من شاشة واحدة.'
        : 'Control public-site colors, branding, logo, and favicon from one screen.',
      icon: Palette,
    },
    {
      to: '/admin/public-site/preview',
      title: isArabic ? 'معاينة الموقع العام' : 'Preview Public Page',
      subtitle: isArabic ? 'عرض الصفحة كما يراها الزائر' : 'Review the public page',
      description: isArabic
        ? 'راجع الشكل العام للواجهة الرئيسية قبل نشر أي تغييرات.'
        : 'Check the public homepage before publishing visual or content updates.',
      icon: Eye,
    },
    {
      to: '/admin/missing-service-requests',
      title: isArabic ? 'طلبات الخدمات غير الموجودة' : 'Missing Service Requests',
      subtitle: isArabic ? 'متابعة الطلبات الجديدة' : 'Handle new service requests',
      description: isArabic
        ? 'راجع الرسائل القادمة من الواجهة العامة واربطها بخدمة موجودة أو تابعها مع فريق الدعم.'
        : 'Review requests from the public site and link them to an existing service or support flow.',
      icon: MessageSquareMore,
    },
  ]

  return (
    <div className="page-section">
      <PageHeader
        title={isArabic ? 'إدارة الموقع العام' : 'Public Site Management'}
        eyebrow={isArabic ? 'الموقع العام' : 'PUBLIC SITE'}
        description={
          isArabic
            ? 'إدارة الصفحة العامة أصبحت منفصلة وواضحة: المحتوى، الإعلانات، الألوان، والمعاينة.'
            : 'Manage public content, advertisements, branding, and preview flows from one clear entry point.'
        }
      />

      <section className="grid gap-6 md:grid-cols-2">
        {managementCards.map((card) => {
          const Icon = card.icon
          return (
            <Link key={card.to} className="glass-panel group p-6 transition hover:-translate-y-1 hover:shadow-panel" to={card.to}>
              <div className="flex items-start gap-4">
                <span className="icon-chip transition group-hover:bg-brand-600 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-brand-600">{card.title}</p>
                  <h2 className="mt-1 text-xl font-extrabold text-ink">{card.subtitle}</h2>
                  <p className="mt-3 text-sm leading-7 text-slate-600">{card.description}</p>
                </div>
              </div>
            </Link>
          )
        })}
      </section>
    </div>
  )
}

export default PublicSiteManagementPage
