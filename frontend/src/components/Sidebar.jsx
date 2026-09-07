import clsx from 'clsx'
import { X } from 'lucide-react'
import { useEffect, useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useLanguage } from '../context/LanguageContext'
import { normalizeRole } from '../utils/format'
import { KhalsniAppIcon, KhalsniLogo } from './brand/KhalsniLogo'

function Sidebar({ title, links, isOpen, onClose }) {
  const { user } = useAuth()
  const { t } = useLanguage()

  useEffect(() => {
    if (!isOpen) return undefined

    function handleEscape(event) {
      if (event.key === 'Escape') onClose?.()
    }

    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  const currentRole = normalizeRole(user?.role)
  const visibleLinks = links.filter((link) => {
    if (!Array.isArray(link.roles) || !link.roles.length) return true
    return link.roles.map(normalizeRole).includes(currentRole)
  })

  // Preserve declared order; collect links under their group heading. Links
  // without a group render first in an unlabelled block.
  const groups = useMemo(() => {
    const order = []
    const byGroup = new Map()
    for (const link of visibleLinks) {
      const key = link.group || ''
      if (!byGroup.has(key)) {
        byGroup.set(key, [])
        order.push(key)
      }
      byGroup.get(key).push(link)
    }
    return order.map((key) => ({ key, items: byGroup.get(key) }))
  }, [visibleLinks])

  const linkClass = ({ isActive }) =>
    clsx(
      'group/navlink relative flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2.5 text-sm font-semibold transition',
      'before:absolute before:inset-inline-start-0 before:top-1/2 before:h-5 before:w-[3px] before:-translate-y-1/2 before:rounded-full before:transition',
      isActive
        ? 'bg-[var(--kh-soft-blue)] text-[var(--kh-navy)] before:bg-[var(--kh-primary)]'
        : 'text-[var(--kh-text-secondary)] before:bg-transparent hover:bg-[var(--kh-surface-muted)] hover:text-[var(--kh-navy)]',
    )

  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-ink/35 backdrop-blur-sm transition xl:hidden',
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      <aside
        aria-label={title}
        className={clsx(
          'fixed inset-y-3 left-3 right-3 z-50 flex flex-col overflow-y-auto rounded-[1.5rem] border border-border bg-card p-4 shadow-panel transition',
          'sm:left-auto sm:w-[320px] sm:max-w-[calc(100vw-1.5rem)]',
          'xl:sticky xl:inset-y-auto xl:left-auto xl:right-auto xl:top-4 xl:z-auto xl:h-[calc(100vh-2rem)] xl:w-auto xl:max-w-none xl:translate-x-0',
          isOpen ? 'translate-x-0' : 'translate-x-[120%] xl:translate-x-0',
        )}
      >
        <div className="mb-4 flex items-center justify-between gap-2 border-b border-border pb-4">
          <span className="flex items-center gap-2.5">
            <KhalsniAppIcon size="sm" to="/" />
            <KhalsniLogo size="sm" to="/" />
          </span>
          <button
            aria-label={t('sidebar.closeMenu', 'إغلاق القائمة')}
            className="btn-ghost min-h-9 min-w-9 p-1.5 xl:hidden"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-[0.7rem] font-bold uppercase tracking-wide text-brand-600">
            {t('sidebar.workPortal', 'بوابة العمل')}
          </p>
          <p className="mt-0.5 text-lg font-extrabold text-ink">{title}</p>
        </div>

        <nav className="flex-1 space-y-4">
          {groups.map((group) => (
            <div key={group.key || 'ungrouped'}>
              {group.key ? (
                <p className="mb-1.5 px-3 text-[0.68rem] font-bold uppercase tracking-wide text-[var(--kh-text-muted)]">
                  {group.key}
                </p>
              ) : null}
              <div className="space-y-0.5">
                {group.items.map((link) => {
                  const Icon = link.icon
                  return (
                    <NavLink key={link.to} className={linkClass} onClick={onClose} to={link.to}>
                      {Icon ? (
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--kh-surface-muted)] text-[var(--kh-text-secondary)] transition group-hover/navlink:text-[var(--kh-navy)]">
                          <Icon className="h-4 w-4" />
                        </span>
                      ) : null}
                      <span className="min-w-0 truncate">{link.label}</span>
                    </NavLink>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  )
}

export default Sidebar
