import { Navigate, useParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth()
  const { orgSlug } = useParams()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // If profile is fully loaded, validate slug
  if (profile && orgSlug && profile.organization.slug !== orgSlug) {
    console.warn(`Unauthorized access attempt to org: ${orgSlug}. Redirecting to ${profile.organization.slug}`)
    return <Navigate to={`/${profile.organization.slug}/dashboard`} replace />
  }

  return <>{children}</>
}
