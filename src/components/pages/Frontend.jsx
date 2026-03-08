import { Link, useNavigate, useLocation, Outlet } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { useState, useEffect, useRef } from 'react'

export default function Frontend() {
  const { user, logout, isViewer, organizationId, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    loadPages()
  }, [organizationId, isSuperAdmin])

  // Auto-redirect to first page when on /frontend index
  useEffect(() => {
    if (!loading && pages.length > 0 && location.pathname === '/frontend') {
      navigate(`/frontend/${pages[0].slug}`, { replace: true })
    }
  }, [loading, pages, location.pathname, navigate])

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [dropdownOpen])

  const loadPages = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('pages')
        .select('*')
        .eq('is_published', true)
        .order('created_at', { ascending: true })

      if (!isSuperAdmin && organizationId) {
        query = query.eq('organization_id', organizationId)
      } else if (!isSuperAdmin && !organizationId) {
        setPages([])
        return
      }

      const { data } = await query
      setPages(data || [])
    } catch (err) {
      console.error('Error loading pages:', err)
      setPages([])
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    setDropdownOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex flex-col">
          {/* Top bar */}
          <div className="max-w-7xl mx-auto w-full px-4 md:px-6 h-14 md:h-16 flex items-center justify-between">
            {/* Logo */}
            <Link to="/frontend" className="text-lg md:text-xl font-bold text-blue-600">
              Het Schoolbord
            </Link>

            {/* Right side */}
            <div className="flex items-center gap-2 md:gap-4">
              {/* Dashboard button - not for viewers */}
              {!isViewer && (
                <Link
                  to="/dashboard"
                  className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                >
                  Dashboard
                </Link>
              )}

              {/* Profile dropdown - click-based for touch support */}
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 px-2 md:px-3 py-2 rounded-lg hover:bg-gray-100 transition"
                >
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium shrink-0">
                    {user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                  </div>
                  <span className="text-sm text-gray-700 hidden sm:block">
                    {user?.user_metadata?.full_name || user?.email}
                  </span>
                </button>

                {/* Dropdown */}
                {dropdownOpen && (
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                    <Link
                      to="/settings"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                    >
                      Instellingen
                    </Link>
                    <button
                      onClick={handleLogout}
                      className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 rounded-b-lg cursor-pointer"
                    >
                      Uitloggen
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Page Navigation - scrollable on mobile */}
          {pages.length > 0 && (
            <nav className="max-w-7xl mx-auto w-full px-4 md:px-6 border-t border-gray-100">
              <div className="flex gap-4 md:gap-6 h-12 overflow-x-auto">
                {pages.map((page) => {
                  const isActive = location.pathname === `/frontend/${page.slug}`
                  return (
                    <Link
                      key={page.id}
                      to={`/frontend/${page.slug}`}
                      className={`text-sm font-medium border-b-2 transition flex items-center whitespace-nowrap ${
                        isActive
                          ? 'text-blue-600 border-blue-600'
                          : 'text-gray-600 hover:text-gray-900 border-transparent hover:border-blue-600'
                      }`}
                    >
                      {page.title}
                    </Link>
                  )
                })}
              </div>
            </nav>
          )}
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
