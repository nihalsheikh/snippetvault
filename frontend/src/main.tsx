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

// The pre-first-paint loader in index.html has served its purpose — React owns the
// screen now. Removed on the next frame rather than synchronously, so the handoff
// happens once the browser has actually painted the app and it doesn't read as a
// flicker. `display: none` keeps the frame from ever being invisible if this throws.
requestAnimationFrame(() => {
  document.getElementById('boot-loader')?.remove()
})