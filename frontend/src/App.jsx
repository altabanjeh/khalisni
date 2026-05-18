import { AuthProvider } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import { ToastProvider } from './context/ToastContext'
import { ToastContainer } from './components/Toast'
import AppRoutes from './routes/AppRoutes'

function App() {
  return (
    <ToastProvider>
      <LanguageProvider>
        <AuthProvider>
          <AppRoutes />
          <ToastContainer />
        </AuthProvider>
      </LanguageProvider>
    </ToastProvider>
  )
}

export default App
