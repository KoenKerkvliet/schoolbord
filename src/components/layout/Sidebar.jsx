import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Top Section */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-blue-600 mb-1">Schoolbord</h1>
        <p className="text-sm text-gray-600">{user?.email}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        <Link
          to="/dashboard"
          className={`block px-4 py-2 rounded-lg font-medium transition ${
            isActive('/dashboard')
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Dashboard
        </Link>
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-gray-200 p-4 space-y-2">
        <Link
          to="/profile"
          className={`block px-4 py-2 rounded-lg font-medium transition ${
            isActive('/profile')
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Profiel
        </Link>

        <Link
          to="/settings"
          className={`block px-4 py-2 rounded-lg font-medium transition ${
            isActive('/settings')
              ? 'bg-blue-100 text-blue-600'
              : 'text-gray-700 hover:bg-gray-100'
          }`}
        >
          Instellingen
        </Link>

        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 text-left rounded-lg font-medium text-red-600 hover:bg-red-50 transition"
        >
          Uitloggen
        </button>
      </div>
    </div>
  )
}
