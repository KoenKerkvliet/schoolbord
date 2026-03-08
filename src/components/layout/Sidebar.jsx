import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function Sidebar({ open, onClose }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user, isAdmin, isSuperAdmin } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleLinkClick = () => {
    onClose?.()
  }

  const isActive = (path) => location.pathname === path

  const linkClass = (path) =>
    `flex items-center px-4 py-2.5 min-h-[44px] rounded-lg font-medium transition ${
      isActive(path)
        ? 'bg-blue-100 text-blue-600'
        : 'text-gray-700 hover:bg-gray-100'
    }`

  return (
    <>
      {/* Overlay - mobile only */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 flex flex-col
          transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:z-auto
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Close button - mobile only */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg text-gray-400 hover:text-gray-600 md:hidden"
          aria-label="Sluit menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Top Section */}
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-blue-600 mb-1">Het Schoolbord</h1>
          <p className="text-sm text-gray-600 truncate">{user?.email}</p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <Link
            to="/frontend"
            onClick={handleLinkClick}
            className="flex items-center px-4 py-2.5 min-h-[44px] rounded-lg font-medium transition bg-blue-500 text-white hover:bg-blue-600 mb-2"
          >
            Frontend
          </Link>

          <Link to="/dashboard" onClick={handleLinkClick} className={linkClass('/dashboard')}>
            Dashboard
          </Link>

          {(isAdmin || isSuperAdmin) && (
            <>
              <div className="pt-4 pb-1">
                <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Admin</p>
              </div>
              <Link to="/content" onClick={handleLinkClick} className={linkClass('/content')}>
                Content
              </Link>
              <Link to="/content-blocks" onClick={handleLinkClick} className={linkClass('/content-blocks')}>
                Contentblokken
              </Link>
              <Link to="/pages" onClick={handleLinkClick} className={linkClass('/pages')}>
                Pagina's
              </Link>
            </>
          )}
        </nav>

        {/* Bottom Section */}
        <div className="border-t border-gray-200 p-4 space-y-1">
          {isSuperAdmin && (
            <Link to="/beheer" onClick={handleLinkClick} className={linkClass('/beheer')}>
              Beheer
            </Link>
          )}
          <Link to="/profile" onClick={handleLinkClick} className={linkClass('/profile')}>
            Profiel
          </Link>
          <Link to="/settings" onClick={handleLinkClick} className={linkClass('/settings')}>
            Instellingen
          </Link>
          <button
            onClick={() => { handleLinkClick(); handleLogout() }}
            className="w-full flex items-center px-4 py-2.5 min-h-[44px] text-left rounded-lg font-medium text-red-600 hover:bg-red-50 transition"
          >
            Uitloggen
          </button>
        </div>
      </div>
    </>
  )
}
