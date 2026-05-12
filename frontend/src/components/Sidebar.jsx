import clsx from 'clsx'
import { X } from 'lucide-react'
import { NavLink } from 'react-router-dom'

function Sidebar({ title, links, isOpen, onClose }) {
  return (
    <>
      <div
        className={clsx(
          'fixed inset-0 z-40 bg-ink/30 transition lg:hidden',
          isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0',
        )}
        onClick={onClose}
      />
      <aside
        className={clsx(
          'fixed inset-y-4 right-4 z-50 w-[300px] max-w-[calc(100vw-2rem)] overflow-y-auto rounded-4xl border border-border bg-white p-5 shadow-panel transition lg:sticky lg:top-4 lg:z-auto lg:block lg:h-fit lg:w-auto lg:max-w-none lg:translate-x-0',
          isOpen ? 'translate-x-0' : 'translate-x-[120%] lg:translate-x-0',
        )}
      >
        <div className="flex items-start justify-between gap-4 lg:block">
          <div>
            <p className="text-sm font-semibold text-brand-600">بوابة العمل</p>
            <p className="mt-1 text-2xl font-extrabold text-ink">{title}</p>
          </div>
          <button className="btn-ghost p-2 lg:hidden" onClick={onClose} type="button">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 space-y-2">
          {links.map((link) => {
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
                {Icon ? <Icon className="h-4 w-4" /> : null}
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
