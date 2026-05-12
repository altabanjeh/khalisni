import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from '../components/Sidebar'
import Topbar from '../components/Topbar'

function DashboardLayout({ title, links }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  return (
    <div className="container-shell py-6">
      <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <Sidebar
          isOpen={mobileSidebarOpen}
          links={links}
          onClose={() => setMobileSidebarOpen(false)}
          title={title}
        />
        <div className="space-y-6">
          <Topbar onMenuClick={() => setMobileSidebarOpen(true)} title={title} />
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default DashboardLayout
