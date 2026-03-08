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
      {/* Header — single row: logo | pages | dashboard+profile */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto w-full px-4 md:px-6 h-14 md:h-16 flex items-center">
          {/* Left — Logo */}
          <Link to="/frontend" className="text-lg md:text-xl font-bold text-blue-600 shrink-0">
            Het Schoolbord
          </Link>

          {/* Center — Page navigation */}
          <nav className="flex-1 flex justify-center overflow-x-auto mx-4">
            <div className="flex gap-4 md:gap-6 h-14 md:h-16">
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

          {/* Right — Profile icon with dropdown */}
          <div className="shrink-0">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 transition flex items-center justify-center"
                aria-label="Profiel"
              >
                <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
                  {!isViewer && (
                    <Link
                      to="/dashboard"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                    >
                      Dashboard
                    </Link>
                  )}
                  <Link
                    to="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className={`block px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 ${isViewer ? 'rounded-t-lg' : ''}`}
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
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  )
}
