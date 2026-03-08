import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { useAuth } from '../../context/AuthContext'

export default function PageDetail() {
  const { pageSlug } = useParams()
  const { organizationId, isSuperAdmin } = useAuth()
  const [page, setPage] = useState(null)
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
      setError(null)
    } catch (err) {
      setError('Pagina niet gevonden')
    } finally {
      setLoading(false)
    }
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
        <div className="max-w-3xl mx-auto px-6 py-12">
          <div className="bg-white rounded-lg shadow p-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-6">{page.title}</h1>
            <div className="prose prose-sm max-w-none">
              {page.content ? (
                <div className="text-gray-700 whitespace-pre-wrap">{page.content}</div>
              ) : (
                <p className="text-gray-500 italic">Geen inhoud</p>
              )}
            </div>
            <div className="mt-8 pt-6 border-t border-gray-200">
              <Link to="/frontend" className="text-blue-600 hover:underline">
                ← Terug
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
