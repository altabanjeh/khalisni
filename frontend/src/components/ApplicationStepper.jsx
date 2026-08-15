import { CheckCircle2 } from 'lucide-react'

function ApplicationStepper({ steps = [], currentIndex = 0 }) {
  return (
    <nav aria-label="Application steps" className="rounded-[2rem] border border-border bg-white p-4 shadow-soft">
      <ol className="grid gap-3 md:grid-cols-4">
        {steps.map((step, index) => {
          const isActive = index === currentIndex
          const isDone = index < currentIndex

          return (
            <li key={step} className={isActive ? 'rounded-[var(--radius)] bg-brand-600 p-4 text-white' : 'rounded-[var(--radius)] border border-border bg-slate-50 p-4 text-slate-600'}>
              <div className="flex items-center gap-3">
                <span className={isDone ? 'flex h-9 w-9 items-center justify-center rounded-full bg-green-50 text-green-700' : isActive ? 'flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-700' : 'flex h-9 w-9 items-center justify-center rounded-full bg-white text-slate-500'}>
                  {isDone ? <CheckCircle2 className="h-5 w-5" /> : index + 1}
                </span>
                <span className="text-sm font-extrabold">{step}</span>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

export default ApplicationStepper
