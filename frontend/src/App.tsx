import { Routes, Route, Navigate } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Projects from './pages/Projects'
import Invoices from './pages/Invoices'
import Income from './pages/Income'
import Expenses from './pages/Expenses'
import { DashboardLayout } from './components/layout/DashboardLayout'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/suryasathi/dashboard" replace />} />
      
      <Route path="/:orgSlug" element={<DashboardLayout />}>
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="projects" element={<Projects />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="income" element={<Income />} />
        <Route path="expenses" element={<Expenses />} />
        <Route path="add" element={<div>Quick Add (Coming Soon)</div>} />
        <Route path="stats" element={<div>Statistics (Coming Soon)</div>} />
      </Route>

      {/* Fallback for invalid org structure */}
      <Route path="*" element={<Navigate to="/suryasathi/dashboard" replace />} />
    </Routes>
  )
}

export default App
