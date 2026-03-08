import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { useState, useEffect } from 'react'

export default function Frontend() {
  const { user, logout, isViewer, organizationId, isSuperAdmin } = useAuth()
  const navigate = useNavigate()
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadPages()
  }, [organizationId, isSuperAdmin])

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
        // Viewer without organization can't see pages
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
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex flex-col">
          {/* Top bar */}
          <div className="max-w-7xl mx-auto w-full px-6 h-16 flex items-center justify-between">
            {/* Logo */}
            <Link to="/frontend" className="text-xl font-bold text-blue-600">
              Het Schoolbord
            </Link>

            {/* Right side */}
            <div className="flex items-center gap-4">
            {/* Dashboard button - not for viewers */}
            {!isViewer && (
              <Link
                to="/dashboard"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
              >
                Dashboard
              </Link>
            )}

            {/* Profile dropdown */}
            <div className="relative group">
              <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {user?.user_metadata?.full_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || '?'}
                </div>
                <span className="text-sm text-gray-700 hidden sm:block">
                  {user?.user_metadata?.full_name || user?.email}
                </span>
              </button>

              {/* Dropdown */}
              <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <Link
                  to="/profile"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-t-lg"
                >
                  Profiel
                </Link>
                <Link
                  to="/settings"
                  className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                >
                  Instellingen
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-b-lg"
                >
                  Uitloggen
                </button>
              </div>
            </div>
          </div>

          {/* Page Navigation */}
          {pages.length > 0 && (
            <nav className="max-w-7xl mx-auto w-full px-6 border-t border-gray-100">
              <div className="flex gap-6 h-12">
                {pages.map((page) => (
                  <Link
                    key={page.id}
                    to={`/frontend/${page.slug}`}
                    className="text-sm font-medium text-gray-600 hover:text-gray-900 border-b-2 border-transparent hover:border-blue-600 transition flex items-center"
                  >
                    {page.title}
                  </Link>
                ))}
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* White Canvas */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto p-6">
          <div className="bg-white rounded-lg shadow min-h-[calc(100vh-8rem)]">
            {/* Empty canvas - content comes later */}
          </div>
        </div>
      </main>
    </div>
  )
}
