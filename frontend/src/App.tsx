import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import Projects from './pages/projects/Projects'
import ProjectForm from './pages/projects/ProjectForm'
import Invoices from './pages/Invoices'
import InvoiceForm from './pages/invoices/InvoiceForm'
import IncomeList from './pages/income/IncomeList'
import IncomeForm from './pages/income/IncomeForm'
import ExpenseList from './pages/expenses/ExpenseList'
import ExpenseForm from './pages/expenses/ExpenseForm'
import Customers from './pages/customers/Customers'
import CustomerForm from './pages/customers/CustomerForm'
import Vendors from './pages/vendors/Vendors'
import VendorForm from './pages/vendors/VendorForm'
import BankAccounts from './pages/bank-accounts/BankAccounts'
import BankAccountForm from './pages/bank-accounts/BankAccountForm'
import { Layout } from './components/Layout'

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
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="projects/new" element={<ProjectForm />} />
        <Route path="projects/:id/edit" element={<ProjectForm />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="invoices/new" element={<InvoiceForm />} />
        <Route path="invoices/:id/edit" element={<InvoiceForm />} />
        <Route path="income" element={<IncomeList />} />
        <Route path="income/new" element={<IncomeForm />} />
        <Route path="income/:id/edit" element={<IncomeForm />} />
        <Route path="expenses" element={<ExpenseList />} />
        <Route path="expenses/new" element={<ExpenseForm />} />
        <Route path="expenses/:id/edit" element={<ExpenseForm />} />
        <Route path="customers" element={<Customers />} />
        <Route path="customers/new" element={<CustomerForm />} />
        <Route path="customers/:id/edit" element={<CustomerForm />} />

        <Route path="vendors" element={<Vendors />} />
        <Route path="vendors/new" element={<VendorForm />} />
        <Route path="vendors/:id/edit" element={<VendorForm />} />

        <Route path="bank-accounts" element={<BankAccounts />} />
        <Route path="bank-accounts/new" element={<BankAccountForm />} />
        <Route path="bank-accounts/:id/edit" element={<BankAccountForm />} />
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
