import clsx from 'clsx'
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { normalizeRole } from '../utils/format'

function Sidebar({ title, links, isOpen, onClose }) {
  const { user } = useAuth()

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
        className={clsx(
          'fixed inset-y-3 left-3 right-3 z-50 overflow-y-auto rounded-[2rem] border border-border bg-white/95 p-5 shadow-panel backdrop-blur transition sm:left-auto sm:w-[340px] sm:max-w-[calc(100vw-1.5rem)] xl:sticky xl:top-4 xl:z-auto xl:block xl:h-[calc(100vh-2rem)] xl:w-auto xl:max-w-none xl:translate-x-0',
          isOpen ? 'translate-x-0' : 'translate-x-[120%] xl:translate-x-0',
        )}
      >
        <div className="flex items-start justify-between gap-4 xl:block">
          <div>
            <p className="text-sm font-semibold text-brand-600">بوابة العمل</p>
            <p className="mt-1 text-2xl font-extrabold text-ink">{title}</p>
          </div>
          <button aria-label="إغلاق القائمة" className="btn-ghost p-2 xl:hidden" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 rounded-3xl border border-brand-100 bg-brand-50/70 px-4 py-3 text-sm text-slate-600">
          تنقل سريع بين أهم الشاشات المرتبطة بدورك الحالي.
        </div>

        <nav className="mt-6 space-y-2">
          {visibleLinks.map((link) => {
            const Icon = link.icon

            return (
              <NavLink
                key={link.to}
                onClick={onClose}
                to={link.to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-semibold transition',
                    isActive ? 'bg-brand-600 text-white shadow-soft' : 'text-slate-600 hover:bg-brand-50 hover:text-ink',
                  )
                }
              >
                {Icon ? (
                  <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15">
                    <Icon className="h-4 w-4" />
                  </span>
                ) : null}
                <span>{link.label}</span>
              </NavLink>
            )
          })}
        </nav>
      </aside>
    </>
  )
}

export default Sidebar
