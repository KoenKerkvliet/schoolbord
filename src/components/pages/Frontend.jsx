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
  const [newCounts, setNewCounts] = useState({})
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

  // Load notification counts when pages are available or when navigating
  useEffect(() => {
    if (pages.length > 0) loadNewCounts()
  }, [pages, location.pathname])

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

  const loadNewCounts = async () => {
    try {
      const pageIds = pages.map((p) => p.id)

      // Load all sections for all pages
      const { data: sections } = await supabase
        .from('page_sections')
        .select('id, page_id')
        .in('page_id', pageIds)

      if (!sections?.length) { setNewCounts({}); return }

      const sectionIds = sections.map((s) => s.id)

      // Load column blocks
      const { data: colBlocks } = await supabase
        .from('section_column_blocks')
        .select('section_id, content_block_id')
        .in('section_id', sectionIds)

      if (!colBlocks?.length) { setNewCounts({}); return }

      const blockIds = [...new Set(colBlocks.map((cb) => cb.content_block_id))]

      // Load only mededelingen content blocks
      const { data: blocks } = await supabase
        .from('content_blocks')
        .select('id')
        .in('id', blockIds)
        .eq('block_type', 'mededelingen')

      if (!blocks?.length) { setNewCounts({}); return }

      const medBlockIds = blocks.map((b) => b.id)

      // Load announcements
      const now = new Date().toISOString()
      const { data: annData } = await supabase
        .from('announcements')
        .select('id, content_block_id, created_at')
        .in('content_block_id', medBlockIds)
        .lte('publish_at', now)
        .or(`expires_at.is.null,expires_at.gte.${now}`)

      if (!annData?.length) { setNewCounts({}); return }

      // Build mapping: content_block_id → page_id
      const sectionToPage = {}
      for (const s of sections) sectionToPage[s.id] = s.page_id

      const blockToPage = {}
      for (const cb of colBlocks) {
        if (sectionToPage[cb.section_id]) {
          blockToPage[cb.content_block_id] = sectionToPage[cb.section_id]
        }
      }

      // Count new announcements per page using localStorage timestamps
      const counts = {}
      for (const ann of annData) {
        const blockId = ann.content_block_id
        const pageId = blockToPage[blockId]
        if (!pageId) continue

        const storageKey = `mededelingen_seen_${blockId}`
        const lastSeen = localStorage.getItem(storageKey)

        if (!lastSeen || new Date(ann.created_at) > new Date(lastSeen)) {
          counts[pageId] = (counts[pageId] || 0) + 1
        }
      }

      setNewCounts(counts)
    } catch (err) {
      console.error('Error loading notification counts:', err)
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
                    className={`text-sm font-medium border-b-2 transition flex items-center whitespace-nowrap relative ${
                      isActive
                        ? 'text-blue-600 border-blue-600'
                        : 'text-gray-600 hover:text-gray-900 border-transparent hover:border-blue-600'
                    }`}
                  >
                    {page.title}
                    {newCounts[page.id] > 0 && (
                      <span className="ml-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1 leading-none">
                        {newCounts[page.id]}
                      </span>
                    )}
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
