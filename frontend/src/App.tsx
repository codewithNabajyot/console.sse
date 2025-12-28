import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Invoices from './pages/Invoices'
import Income from './pages/Income'
import Expenses from './pages/Expenses'
import Customers from './pages/Customers'
import Vendors from './pages/Vendors'
import BankAccounts from './pages/BankAccounts'
import { DashboardLayout } from './components/layout/DashboardLayout'

import { useAuth } from './contexts/AuthContext'

function App() {
  const { profile, loading } = useAuth()

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />

      {/* Protected routes with org slug */}
      <Route
        path="/:orgSlug"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="income" element={<Income />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="customers" element={<Customers />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="bank-accounts" element={<BankAccounts />} />
      </Route>

      {/* Root redirect to default org or user org */}
      <Route 
        path="/" 
        element={
          loading ? (
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-muted-foreground animate-pulse">Restoring session...</p>
              </div>
            </div>
          ) : profile ? (
            <Navigate to={`/${profile.organization.slug}/dashboard`} replace />
          ) : (
            // If not loading, and no profile, but we HAVE a user, we should wait for profile
            // This case is handled by loading staying true in AuthContext until profile is fetched
            <Navigate to="/login" replace />
          )
        } 
      />
      
      {/* Catch-all redirect to root */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function AppWithProvider() {
  return (
    <AuthProvider>
      <App />
    </AuthProvider>
  )
}

export default AppWithProvider
