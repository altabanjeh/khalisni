import { Eye, FileText, ImagePlus, Palette } from 'lucide-react'
import { Link } from 'react-router-dom'
import PageHeader from '../../components/PageHeader'

const managementCards = [
  {
    to: '/admin/public-site/content',
    title: 'Homepage Content Editor',
    subtitle: 'تحرير محتوى الصفحة الرئيسية',
    description: 'عدّل العنوان الرئيسي، النصوص، الأزرار، صورة البطل، وبيانات التواصل.',
    icon: FileText,
  },
  {
    to: '/admin/public-site/advertisements',
    title: 'Advertisement Manager',
    subtitle: 'إدارة الإعلانات',
    description: 'أضف إعلانات وعروضاً وتنبيهات مهمة مع جدولة زمنية وتفعيل/تعطيل سريع.',
    icon: ImagePlus,
  },
  {
    to: '/admin/public-site/theme',
    title: 'Theme Settings',
    subtitle: 'إعدادات الألوان والهوية',
    description: 'تحكم في ألوان الواجهة العامة، الشعار، وأيقونة الموقع من شاشة واحدة.',
    icon: Palette,
  },
  {
    to: '/admin/public-site/preview',
    title: 'Preview Public Page',
    subtitle: 'معاينة الصفحة العامة',
    description: 'راجع الشكل العام للصفحة الرئيسية كما يراه الزائر قبل نشر أي تغييرات.',
    icon: Eye,
  },
]

function PublicSiteManagementPage() {
  return (
    <div className="page-section">
      <PageHeader
        title="Public Site Management"
        eyebrow="PUBLIC SITE"
        description="إدارة الصفحة العامة أصبحت منفصلة وواضحة: المحتوى، الإعلانات، الألوان، والمعاينة. كل شاشة مهيأة لمدير غير تقني."
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

