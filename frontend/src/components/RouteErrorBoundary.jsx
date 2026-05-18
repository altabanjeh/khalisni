import { RefreshCcw, TriangleAlert } from 'lucide-react'
import { Component } from 'react'

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error) {
    console.error('Route render failed:', error)
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children
    }

    return (
      <div className="container-shell py-10">
        <div className="glass-panel mx-auto max-w-2xl p-8 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-3xl bg-red-50 text-danger">
            <TriangleAlert className="h-7 w-7" />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold text-ink">تعذر تحميل هذه الصفحة</h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            حدث خطأ أثناء فتح الشاشة الحالية. أعد تحميل الصفحة، وإذا استمرت المشكلة افتحها من القائمة مرة أخرى.
          </p>
          <div className="mt-6 flex justify-center">
            <button className="btn-primary" onClick={() => window.location.reload()} type="button">
              <RefreshCcw className="h-4 w-4" />
              إعادة التحميل
            </button>
          </div>
        </div>
      </div>
    )
  }
}

export default RouteErrorBoundary
