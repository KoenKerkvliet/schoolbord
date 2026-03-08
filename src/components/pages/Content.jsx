import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import LinkExtension from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'

// ============================================================
// Reusable Rich Text Editor (TipTap) — expanded toolbar
// ============================================================
function RichTextEditor({ content, onChange, placeholder }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Underline,
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { class: 'text-blue-600 underline' },
      }),
      Placeholder.configure({
        placeholder: placeholder || 'Schrijf hier...',
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none focus:outline-none min-h-[200px] px-4 py-3',
      },
    },
  })

  // Sync external content changes
  useEffect(() => {
    if (editor && content !== undefined && editor.getHTML() !== content) {
      editor.commands.setContent(content || '')
    }
  }, [content, editor])

  if (!editor) return null

  const addLink = () => {
    const url = prompt('URL invoeren:')
    if (url) {
      editor.chain().focus().setLink({ href: url }).run()
    }
  }

  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-gray-50 border-b border-gray-200">
        {/* Text formatting */}
        <ToolbarButton
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          label="B"
          className="font-bold"
          title="Vet"
        />
        <ToolbarButton
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          label="I"
          className="italic"
          title="Cursief"
        />
        <ToolbarButton
          active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          label="U"
          className="underline"
          title="Onderstrepen"
        />
        <ToolbarButton
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          label="S"
          className="line-through"
          title="Doorhalen"
        />

        <ToolbarDivider />

        {/* Headings */}
        <ToolbarButton
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          label="H2"
          title="Koptekst 2"
        />
        <ToolbarButton
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          label="H3"
          title="Koptekst 3"
        />

        <ToolbarDivider />

        {/* Lists */}
        <ToolbarButton
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Opsomming"
          label="•&nbsp;Lijst"
        />
        <ToolbarButton
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Genummerde lijst"
          label="1.&nbsp;Lijst"
        />

        <ToolbarDivider />

        {/* Block elements */}
        <ToolbarButton
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Citaat"
          label="&ldquo;&nbsp;&rdquo;"
        />
        <ToolbarButton
          active={editor.isActive('link')}
          onClick={() => {
            if (editor.isActive('link')) {
              editor.chain().focus().unsetLink().run()
            } else {
              addLink()
            }
          }}
          title="Link invoegen"
          label="🔗"
        />
        <ToolbarButton
          active={false}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontale lijn"
          label="—"
        />

        <ToolbarDivider />

        {/* Undo / Redo */}
        <ToolbarButton
          active={false}
          onClick={() => editor.chain().focus().undo().run()}
          title="Ongedaan maken"
          label="↩"
        />
        <ToolbarButton
          active={false}
          onClick={() => editor.chain().focus().redo().run()}
          title="Opnieuw"
          label="↪"
        />
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}

function ToolbarButton({ active, onClick, label, className = '', title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`px-2 py-1.5 rounded text-sm transition cursor-pointer ${className} ${
        active ? 'bg-blue-100 text-blue-700' : 'text-gray-600 hover:bg-gray-200'
      }`}
      dangerouslySetInnerHTML={{ __html: label }}
    />
  )
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-gray-300 mx-1" />
}

// ============================================================
// Helpers
// ============================================================
const todayString = () => new Date().toISOString().split('T')[0]

const stripHtml = (html) => {
  if (!html) return ''
  const tmp = document.createElement('div')
  tmp.innerHTML = html
  return tmp.textContent || tmp.innerText || ''
}

const getAnnouncementStatus = (announcement) => {
  const now = new Date()
  const publishAt = new Date(announcement.publish_at || announcement.created_at)
  const expiresAt = announcement.expires_at ? new Date(announcement.expires_at) : null

  if (publishAt > now) return { label: 'Gepland', color: 'bg-yellow-100 text-yellow-700' }
  if (expiresAt && expiresAt < now) return { label: 'Verlopen', color: 'bg-gray-100 text-gray-600' }
  return { label: 'Actief', color: 'bg-green-100 text-green-700' }
}

// ============================================================
// Main Content Page — only shows mededelingen blocks
// ============================================================
export default function Content() {
  const { user, organizationId, isSuperAdmin } = useAuth()
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [organizations, setOrganizations] = useState([])
  const [selectedOrgId, setSelectedOrgId] = useState(organizationId || '')

  useEffect(() => {
    if (isSuperAdmin) {
      supabase
        .from('organizations')
        .select('*')
        .order('name')
        .then(({ data }) => setOrganizations(data || []))
    }
  }, [isSuperAdmin])

  useEffect(() => {
    loadBlocks()
  }, [selectedOrgId, organizationId, isSuperAdmin])

  const loadBlocks = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('content_blocks')
        .select('*')
        .eq('block_type', 'mededelingen')

      if (isSuperAdmin && selectedOrgId) {
        query = query.eq('organization_id', selectedOrgId)
      } else if (!isSuperAdmin && organizationId) {
        query = query.eq('organization_id', organizationId)
      } else if (!isSuperAdmin && !organizationId) {
        setBlocks([])
        setLoading(false)
        return
      }

      const { data, error } = await query.order('created_at', { ascending: true })
      if (error) throw error
      setBlocks(
        (data || []).map((b) => ({
          ...b,
          settings: typeof b.settings === 'string' ? JSON.parse(b.settings) : b.settings || {},
        }))
      )
    } catch (err) {
      console.error('Fout bij laden content blocks:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl">
        <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">Content</h1>
        <p className="text-gray-600 mb-6 md:mb-8">Beheer de mededelingen voor je organisatie.</p>

        {/* Super admin org selector */}
        {isSuperAdmin && (
          <div className="mb-6">
            <select
              value={selectedOrgId}
              onChange={(e) => setSelectedOrgId(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            >
              <option value="">Selecteer organisatie...</option>
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {loading ? (
          <div className="text-gray-400 text-center py-12">Laden...</div>
        ) : blocks.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-6 md:p-8 text-center">
            <p className="text-gray-500 mb-4">Geen mededelingen-blokken gevonden.</p>
            <Link
              to="/content-blocks"
              className="text-blue-600 hover:underline font-medium"
            >
              Maak eerst een Mededelingen-blok aan bij Contentblokken
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {blocks.map((block) => (
              <div key={block.id} className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 md:px-6 py-4 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                      Mededelingen
                    </span>
                    <span className="font-semibold text-gray-900">{block.name}</span>
                  </div>
                </div>
                <div className="px-4 md:px-6 py-5">
                  <MededelingenContentEditor block={block} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Mededelingen Content Editor
// ============================================================
function MededelingenContentEditor({ block }) {
  const { user } = useAuth()
  const [announcements, setAnnouncements] = useState([])
  const [loading, setLoading] = useState(true)

  // New announcement form
  const [newTitle, setNewTitle] = useState('')
  const [newMessage, setNewMessage] = useState('')
  const [publishAt, setPublishAt] = useState(todayString())
  const [expiresAt, setExpiresAt] = useState('')
  const [isUrgent, setIsUrgent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Editing state
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editMessage, setEditMessage] = useState('')
  const [editPublishAt, setEditPublishAt] = useState('')
  const [editExpiresAt, setEditExpiresAt] = useState('')
  const [editIsUrgent, setEditIsUrgent] = useState(false)

  useEffect(() => {
    loadAnnouncements()
  }, [block.id])

  const loadAnnouncements = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('content_block_id', block.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setAnnouncements(data || [])
    } catch (err) {
      console.error('Fout bij laden mededelingen:', err)
    } finally {
      setLoading(false)
    }
  }

  const addAnnouncement = async (e) => {
    e.preventDefault()
    if (!newTitle.trim() || !newMessage.trim()) return

    try {
      setSubmitting(true)
      const { error } = await supabase.from('announcements').insert({
        content_block_id: block.id,
        title: newTitle.trim(),
        message: newMessage.trim(),
        publish_at: new Date(publishAt).toISOString(),
        expires_at: expiresAt ? new Date(expiresAt + 'T23:59:59').toISOString() : null,
        is_urgent: isUrgent,
        created_by: user.id,
        author_name: user.user_metadata?.full_name || user.email,
      })

      if (error) throw error
      setNewTitle('')
      setNewMessage('')
      setPublishAt(todayString())
      setExpiresAt('')
      setIsUrgent(false)
      await loadAnnouncements()
    } catch (err) {
      console.error('Fout bij toevoegen bericht:', err)
    } finally {
      setSubmitting(false)
    }
  }

  const startEdit = (ann) => {
    setEditingId(ann.id)
    setEditTitle(ann.title || '')
    setEditMessage(ann.message || '')
    setEditPublishAt(ann.publish_at ? new Date(ann.publish_at).toISOString().split('T')[0] : todayString())
    setEditExpiresAt(ann.expires_at ? new Date(ann.expires_at).toISOString().split('T')[0] : '')
    setEditIsUrgent(ann.is_urgent || false)
  }

  const saveEdit = async () => {
    if (!editTitle.trim() || !editMessage.trim()) return

    try {
      const { error } = await supabase
        .from('announcements')
        .update({
          title: editTitle.trim(),
          message: editMessage.trim(),
          publish_at: new Date(editPublishAt).toISOString(),
          expires_at: editExpiresAt ? new Date(editExpiresAt + 'T23:59:59').toISOString() : null,
          is_urgent: editIsUrgent,
        })
        .eq('id', editingId)

      if (error) throw error
      setEditingId(null)
      await loadAnnouncements()
    } catch (err) {
      console.error('Fout bij bewerken bericht:', err)
    }
  }

  const deleteAnnouncement = async (id) => {
    if (!confirm('Weet je zeker dat je dit bericht wilt verwijderen?')) return

    try {
      const { error } = await supabase.from('announcements').delete().eq('id', id)
      if (error) throw error
      await loadAnnouncements()
    } catch (err) {
      console.error('Fout bij verwijderen bericht:', err)
    }
  }

  return (
    <div className="space-y-6">
      {/* New announcement form */}
      <div className="bg-gray-50 rounded-lg p-4 md:p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Nieuw bericht</h3>
        <form onSubmit={addAnnouncement} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Titel van het bericht..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bericht</label>
            <RichTextEditor
              content={newMessage}
              onChange={setNewMessage}
              placeholder="Schrijf je bericht..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Publiceren op</label>
              <input
                type="date"
                value={publishAt}
                onChange={(e) => setPublishAt(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Online t/m <span className="text-gray-400 font-normal">(optioneel)</span>
              </label>
              <input
                type="date"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                min={publishAt}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          {/* Urgent toggle */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={isUrgent}
              onChange={(e) => setIsUrgent(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
            />
            <span className="text-sm text-gray-700">
              <span className="font-medium">❗ Belangrijk bericht</span>
              <span className="text-gray-400 ml-1">— wordt gemarkeerd met een uitroepteken</span>
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting || !newTitle.trim() || !newMessage.trim()}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Publiceren...' : 'Publiceer'}
          </button>
        </form>
      </div>

      {/* Existing announcements */}
      <div>
        <h3 className="font-semibold text-gray-800 mb-3">
          Berichten {announcements.length > 0 && `(${announcements.length})`}
        </h3>

        {loading ? (
          <p className="text-sm text-gray-400">Laden...</p>
        ) : announcements.length === 0 ? (
          <p className="text-sm text-gray-400 italic">Nog geen berichten geplaatst.</p>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann) => {
              const status = getAnnouncementStatus(ann)

              if (editingId === ann.id) {
                return (
                  <div key={ann.id} className="bg-gray-50 rounded-lg p-4 space-y-3 border border-blue-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Bericht</label>
                      <RichTextEditor
                        content={editMessage}
                        onChange={setEditMessage}
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Publiceren op</label>
                        <input
                          type="date"
                          value={editPublishAt}
                          onChange={(e) => setEditPublishAt(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Online t/m</label>
                        <input
                          type="date"
                          value={editExpiresAt}
                          onChange={(e) => setEditExpiresAt(e.target.value)}
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={editIsUrgent}
                        onChange={(e) => setEditIsUrgent(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                      <span className="text-sm text-gray-700 font-medium">❗ Belangrijk bericht</span>
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium cursor-pointer"
                      >
                        Opslaan
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition font-medium cursor-pointer"
                      >
                        Annuleer
                      </button>
                    </div>
                  </div>
                )
              }

              return (
                <div key={ann.id} className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 p-4 bg-gray-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {ann.is_urgent && <span className="text-red-500" title="Belangrijk">❗</span>}
                      <span className="font-medium text-gray-900">{ann.title || '(Geen titel)'}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                        {status.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 truncate">
                      {stripHtml(ann.message).slice(0, 120) || '(Leeg bericht)'}
                    </p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5">
                      <span className="text-xs text-gray-400">
                        Publicatie: {new Date(ann.publish_at || ann.created_at).toLocaleDateString('nl-NL', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                      {ann.expires_at && (
                        <span className="text-xs text-gray-400">
                          Verloopt: {new Date(ann.expires_at).toLocaleDateString('nl-NL', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                      {ann.author_name && (
                        <span className="text-xs text-gray-400">Door: {ann.author_name}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => startEdit(ann)}
                      className="px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition font-medium cursor-pointer"
                    >
                      Bewerk
                    </button>
                    <button
                      onClick={() => deleteAnnouncement(ann.id)}
                      className="px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition font-medium cursor-pointer"
                    >
                      Verwijder
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
