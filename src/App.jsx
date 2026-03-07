import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import LoginPage from './components/auth/LoginPage'
import SignupPage from './components/auth/SignupPage'
import DashboardLayout from './components/layout/DashboardLayout'
import Dashboard from './components/pages/Dashboard'
import Profile from './components/pages/Profile'
import Settings from './components/pages/Settings'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  )
}

export default App
