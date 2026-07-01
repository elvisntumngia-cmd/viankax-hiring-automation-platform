import { Navigate, useLocation } from 'react-router-dom'
import useAuth from '../hooks/useAuth'

function ProtectedRoute({ children }) {
  const location = useLocation()
  const { isAuthenticated, status } = useAuth()

  if (status === 'loading') {
    return (
      <section className="rounded-lg border border-white/[0.10] bg-[#0B111C] p-6 text-white">
        <h1 className="text-xl font-semibold">Checking access</h1>
        <p className="mt-2 text-sm text-zinc-400">Verifying your HR dashboard session.</p>
      </section>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

export default ProtectedRoute
