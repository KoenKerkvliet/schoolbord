import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import LoginPage from './components/auth/LoginPage'
import SignupPage from './components/auth/SignupPage'
import DashboardLayout from './components/layout/DashboardLayout'
import Dashboard from './components/pages/Dashboard'
import Profile from './components/pages/Profile'
import Settings from './components/pages/Settings'
import Content from './components/pages/Content'
import ContentBlocks from './components/pages/ContentBlocks'
import Pages from './components/pages/Pages'
import Frontend from './components/pages/Frontend'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/frontend" element={<Frontend />} />
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/content" element={<Content />} />
              <Route path="/content-blocks" element={<ContentBlocks />} />
              <Route path="/pages" element={<Pages />} />
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
