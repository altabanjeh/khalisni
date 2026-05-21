import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

function DashboardLayout({ title, links }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="container-shell py-3 sm:py-4 lg:py-6">
      <div className="grid items-start gap-4 lg:gap-6 xl:grid-cols-[290px_minmax(0,1fr)]">
        <Sidebar
          isOpen={mobileSidebarOpen}
          links={links}
          onClose={() => setMobileSidebarOpen(false)}
          title={title}
        />
        <div className="min-w-0 space-y-4 lg:space-y-6">
          <Topbar onMenuClick={() => setMobileSidebarOpen(true)} title={title} />
          <div className="min-w-0 space-y-4 lg:space-y-6">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardLayout
