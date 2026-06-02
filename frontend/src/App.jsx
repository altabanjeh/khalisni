import { AuthProvider } from './context/AuthContext'
import { HelpGuideProvider } from './context/HelpGuideContext'
import { LanguageProvider } from './context/LanguageContext'
import { ToastProvider } from './context/ToastContext'
import { ToastContainer } from './components/Toast'
import AppRoutes from './routes/AppRoutes'

function App() {
  return (
    <ToastProvider>
      <LanguageProvider>
        <AuthProvider>
          <HelpGuideProvider>
            <AppRoutes />
            <ToastContainer />
          </HelpGuideProvider>
        </AuthProvider>
      </LanguageProvider>
    </ToastProvider>
  )
}

export default App
