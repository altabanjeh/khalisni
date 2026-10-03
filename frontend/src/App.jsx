import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { HelpGuideProvider } from './context/HelpGuideContext'
import { LanguageProvider } from './context/LanguageContext'
import { ToastProvider } from './context/ToastContext'
import { ToastContainer } from './components/Toast'
import AppRoutes from './routes/AppRoutes'

function AuthenticatedApp() {
  const { user } = useAuth()
  return (
    <NotificationProvider user={user}>
      <AppRoutes />
      <ToastContainer />
    </NotificationProvider>
  )
}

function App() {
  return (
    <ToastProvider>
      <LanguageProvider>
        <AuthProvider>
          <HelpGuideProvider>
            <AuthenticatedApp />
          </HelpGuideProvider>
        </AuthProvider>
      </LanguageProvider>
    </ToastProvider>
  )
}

export default App
