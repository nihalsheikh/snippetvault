import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ErrorBoundary } from './pages/ErrorPage'
import { AuthProvider } from './hooks/useAuth'
import './styles/theme.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Outermost so a throw during render surfaces as the 500 page rather
        than a blank document. */}
    <ErrorBoundary>
      <BrowserRouter>
        {/* Inside the router so the provider could redirect if it needed to —
            for now it only listens for the session-lost event. */}
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)