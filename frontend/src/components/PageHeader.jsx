function PageHeader({ icon: Icon, eyebrow, title, description, badge, actions }) {
  return (
    <header className="glass-panel flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-start lg:justify-between">
      <div className="flex items-start gap-4">
        {Icon ? (
          <span className="icon-chip">
            <Icon className="h-5 w-5" />
          </span>
        ) : null}
        <div className="min-w-0">
          {eyebrow ? <p className="text-sm font-semibold text-brand-600">{eyebrow}</p> : null}
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="break-words text-2xl font-extrabold text-ink md:text-3xl">{title}</h1>
            {badge ? <div className="rounded-full bg-brand-50 px-3 py-1">{badge}</div> : null}
          </div>
          {description ? <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex w-full flex-wrap items-center gap-3 self-start lg:w-auto lg:self-center">{actions}</div> : null}
    </header>
  )
}

export default PageHeader
