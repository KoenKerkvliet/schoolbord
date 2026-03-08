import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabaseClient'

export default function Pages() {
  const { user, userRole, organizationId, isSuperAdmin } = useAuth()
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [editingPage, setEditingPage] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [selectedOrgId, setSelectedOrgId] = useState(organizationId || '')
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    is_published: false,
  })

  useEffect(() => {
    if (isSuperAdmin) {
      fetchOrganizations()
    }
  }, [isSuperAdmin])

  useEffect(() => {
    if (!organizationId && !isSuperAdmin) return
    loadPages()
  }, [organizationId, isSuperAdmin, selectedOrgId])

  const fetchOrganizations = async () => {
    const { data } = await supabase.from('organizations').select('*').order('name')
    if (data) setOrganizations(data)
  }

  const loadPages = async () => {
    try {
      setLoading(true)
      let query = supabase.from('pages').select('*')

      if (isSuperAdmin && selectedOrgId) {
        query = query.eq('organization_id', selectedOrgId)
      } else if (!isSuperAdmin && organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      setPages(data || [])
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  const handleTitleChange = (e) => {
    const title = e.target.value
    setFormData({
      ...formData,
      title,
      slug: generateSlug(title),
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      setError('Titel is verplicht')
      return
    }

    if (!formData.slug.trim()) {
      setError('Slug is verplicht')
      return
    }

    const activeOrgId = isSuperAdmin ? selectedOrgId : organizationId
    if (!activeOrgId) {
      setError('Selecteer eerst een organisatie')
      return
    }

    try {
      setLoading(true)
      const pageData = {
        title: formData.title,
        slug: formData.slug,
        content: formData.content,
        is_published: formData.is_published,
        organization_id: activeOrgId,
        created_by: user.id,
      }

      if (editingPage) {
        const { error } = await supabase
          .from('pages')
          .update({
            title: formData.title,
            slug: formData.slug,
            content: formData.content,
            is_published: formData.is_published,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingPage.id)

        if (error) throw error
      } else {
        const { error } = await supabase.from('pages').insert([pageData])
        if (error) throw error
      }

      await loadPages()
      resetForm()
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEdit = (page) => {
    setEditingPage(page)
    setFormData({
      title: page.title,
      slug: page.slug,
      content: page.content || '',
      is_published: page.is_published,
    })
    setShowForm(true)
  }

  const handleDelete = async (pageId) => {
    if (!confirm('Weet je zeker dat je deze pagina wilt verwijderen?')) return

    try {
      setLoading(true)
      const { error } = await supabase.from('pages').delete().eq('id', pageId)
      if (error) throw error
      await loadPages()
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const togglePublish = async (page) => {
    try {
      const { error } = await supabase
        .from('pages')
        .update({ is_published: !page.is_published })
        .eq('id', page.id)

      if (error) throw error
      await loadPages()
    } catch (err) {
      setError(err.message)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      slug: '',
      content: '',
      is_published: false,
    })
    setEditingPage(null)
    setShowForm(false)
  }

  if (loading && pages.length === 0) {
    return <div className="p-8 text-gray-600">Laden...</div>
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Pagina's</h1>
            <p className="text-gray-600">Beheer je website pagina's</p>
          </div>
          {!showForm && (
            <button
              onClick={() => setShowForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Nieuwe pagina
            </button>
          )}
        </div>

        {isSuperAdmin && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Organisatie</label>
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Alle organisaties</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>
          </div>
        )}

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {showForm && (
          <div className="mb-8 bg-white rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold mb-4">
              {editingPage ? 'Pagina bewerken' : 'Nieuwe pagina'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Titel *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={handleTitleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Paginatitel"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL Slug *
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="pagina-slug"
                />
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="published"
                  checked={formData.is_published}
                  onChange={(e) =>
                    setFormData({ ...formData, is_published: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500"
                />
                <label htmlFor="published" className="text-sm font-medium text-gray-700">
                  Publiceren
                </label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50"
                >
                  {editingPage ? 'Opslaan' : 'Aanmaken'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium"
                >
                  Annuleren
                </button>
              </div>
            </form>
          </div>
        )}

        {pages.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-8 text-center text-gray-400">
            Geen pagina's nog. Maak je eerste pagina aan!
          </div>
        ) : (
          <div className="grid gap-4">
            {pages.map((page) => (
              <div
                key={page.id}
                className="bg-white rounded-lg shadow p-6 flex items-start justify-between"
              >
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    {page.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">
                    Slug: <code className="bg-gray-100 px-2 py-1 rounded">{page.slug}</code>
                  </p>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>
                      Status: <span className={page.is_published ? 'text-green-600 font-medium' : 'text-gray-400 font-medium'}>
                        {page.is_published ? '✓ Gepubliceerd' : '○ Concept'}
                      </span>
                    </span>
                    <span>
                      Aangemaakt: {new Date(page.created_at).toLocaleDateString('nl-NL')}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Link
                    to={`/pages/${page.id}/edit`}
                    className="px-3 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200 text-sm font-medium transition"
                  >
                    Secties
                  </Link>
                  <button
                    onClick={() => togglePublish(page)}
                    className={`px-3 py-1 rounded text-sm font-medium transition ${
                      page.is_published
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {page.is_published ? 'Unpublish' : 'Publiceren'}
                  </button>
                  <button
                    onClick={() => handleEdit(page)}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm font-medium transition"
                  >
                    Bewerk
                  </button>
                  <button
                    onClick={() => handleDelete(page.id)}
                    className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium transition"
                  >
                    Verwijder
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
