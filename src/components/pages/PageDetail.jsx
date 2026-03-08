import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { LAYOUTS } from './SectionLayoutPicker'

export default function PageDetail() {
  const { pageSlug } = useParams()
  const { organizationId, isSuperAdmin } = useAuth()
  const [page, setPage] = useState(null)
  const [sections, setSections] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadPage()
  }, [pageSlug, organizationId, isSuperAdmin])

  const loadPage = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('pages')
        .select('*')
        .eq('slug', pageSlug)
        .eq('is_published', true)

      if (!isSuperAdmin && organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query.single()
      if (error) throw error
      setPage(data)

      // Load sections for this page
      const { data: sectionsData } = await supabase
        .from('page_sections')
        .select('*')
        .eq('page_id', data.id)
        .order('position', { ascending: true })

      setSections(sectionsData || [])
      setError(null)
    } catch (err) {
      setError('Pagina niet gevonden')
    } finally {
      setLoading(false)
    }
  }

  const getLayoutConfig = (layoutId) => {
    return LAYOUTS.find((l) => l.id === layoutId) || LAYOUTS[0]
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Laden...</div>
      </div>
    )
  }

  if (error || !page) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Pagina niet gevonden</h1>
        <Link to="/frontend" className="text-blue-600 hover:underline">
          Terug naar homepage
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {sections.length > 0 ? (
            <div className="space-y-6">
              {sections.map((section) => {
                const layoutConfig = getLayoutConfig(section.layout)
                return (
                  <div
                    key={section.id}
                    className="grid gap-4"
                    style={{ gridTemplateColumns: `repeat(${layoutConfig.gridCols}, 1fr)` }}
                  >
                    {layoutConfig.columns.map((col, colIdx) => (
                      <div
                        key={colIdx}
                        className="bg-white rounded-lg shadow min-h-[120px] p-6"
                        style={{ gridColumn: `span ${col.span}` }}
                      >
                        {/* Placeholder - contentblokken komen hier later */}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8">
              {page.content ? (
                <div className="text-gray-700 whitespace-pre-wrap">{page.content}</div>
              ) : (
                <p className="text-gray-500 italic text-center">Geen inhoud</p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
