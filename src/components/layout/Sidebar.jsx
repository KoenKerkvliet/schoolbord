import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Sidebar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user, isAdmin, isSuperAdmin } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isActive = (path) => location.pathname === path

  const linkClass = (path) =>
    `block px-4 py-2 rounded-lg font-medium transition ${
      isActive(path)
        ? 'bg-blue-100 text-blue-600'
        : 'text-gray-700 hover:bg-gray-100'
    }`

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col h-screen">
      {/* Top Section */}
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-blue-600 mb-1">Het Schoolbord</h1>
        <p className="text-sm text-gray-600">{user?.email}</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        <Link
          to="/frontend"
          className="block px-4 py-2 rounded-lg font-medium transition bg-blue-500 text-white hover:bg-blue-600 mb-2"
        >
          Frontend
        </Link>

        <Link to="/dashboard" className={linkClass('/dashboard')}>
          Dashboard
        </Link>

        {(isAdmin || isSuperAdmin) && (
          <>
            <div className="pt-4 pb-1">
              <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
            </div>
            <Link to="/content" className={linkClass('/content')}>
              Content
            </Link>
            <Link to="/content-blocks" className={linkClass('/content-blocks')}>
              Contentblokken
            </Link>
            <Link to="/pages" className={linkClass('/pages')}>
              Pagina's
            </Link>
          </>
        )}
      </nav>

      {/* Bottom Section */}
      <div className="border-t border-gray-200 p-4 space-y-1">
        {isSuperAdmin && (
          <Link to="/beheer" className={linkClass('/beheer')}>
            Beheer
          </Link>
        )}
        <Link to="/profile" className={linkClass('/profile')}>
          Profiel
        </Link>
        <Link to="/settings" className={linkClass('/settings')}>
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
