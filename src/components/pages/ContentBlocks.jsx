import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { supabase } from '../../services/supabaseClient'
import { BLOCK_TYPES, getBlockType } from './blockTypes'

export default function ContentBlocks() {
  const { user, organizationId, isSuperAdmin } = useAuth()
  const [blocks, setBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [organizations, setOrganizations] = useState([])
  const [selectedOrgId, setSelectedOrgId] = useState(organizationId || '')

  // UI state
  const [showTypePicker, setShowTypePicker] = useState(false)
  const [editingBlock, setEditingBlock] = useState(null)

  useEffect(() => {
    if (isSuperAdmin) fetchOrganizations()
  }, [isSuperAdmin])

  useEffect(() => {
    if (!organizationId && !isSuperAdmin) return
    loadBlocks()
  }, [organizationId, isSuperAdmin, selectedOrgId])

  const fetchOrganizations = async () => {
    const { data } = await supabase.from('organizations').select('*').order('name')
    if (data) setOrganizations(data)
  }

  const loadBlocks = async () => {
    try {
      setLoading(true)
      let query = supabase.from('content_blocks').select('*')

      if (isSuperAdmin && selectedOrgId) {
        query = query.eq('organization_id', selectedOrgId)
      } else if (!isSuperAdmin && organizationId) {
        query = query.eq('organization_id', organizationId)
      }

      const { data, error } = await query.order('created_at', { ascending: false })
      if (error) throw error
      setBlocks(data || [])
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createBlock = async (blockType) => {
    const activeOrgId = isSuperAdmin ? selectedOrgId : organizationId
    if (!activeOrgId) {
      setError('Selecteer eerst een organisatie')
      return
    }

    const typeDef = getBlockType(blockType)

    try {
      const { data, error } = await supabase
        .from('content_blocks')
        .insert({
          organization_id: activeOrgId,
          block_type: blockType,
          name: `Nieuw ${typeDef.label} blok`,
          settings: typeDef.defaultSettings,
          created_by: user.id,
        })
        .select()
        .single()

      if (error) throw error
      setShowTypePicker(false)
      setEditingBlock(data)
      await loadBlocks()
    } catch (err) {
      setError(err.message)
    }
  }

  const updateBlock = async (blockId, updates) => {
    try {
      const { error } = await supabase
        .from('content_blocks')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', blockId)

      if (error) throw error
      await loadBlocks()

      if (editingBlock?.id === blockId) {
        setEditingBlock((prev) => ({ ...prev, ...updates }))
      }
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteBlock = async (blockId) => {
    if (!confirm('Weet je zeker dat je dit contentblok wilt verwijderen?')) return

    try {
      const { error } = await supabase.from('content_blocks').delete().eq('id', blockId)
      if (error) throw error
      if (editingBlock?.id === blockId) setEditingBlock(null)
      await loadBlocks()
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading && blocks.length === 0) {
    return <div className="p-4 md:p-8 text-gray-600">Laden...</div>
  }

  return (
    <div className="p-4 md:p-8">
      <div className="max-w-5xl">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold text-gray-900 mb-2">Contentblokken</h1>
            <p className="text-gray-600">Beheer herbruikbare contentblokken.</p>
          </div>
          {!showTypePicker && !editingBlock && (
            <button
              onClick={() => setShowTypePicker(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium"
            >
              Nieuw contentblok
            </button>
          )}
        </div>

        {isSuperAdmin && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Organisatie</label>
            <select
              value={selectedOrgId}
              onChange={(e) => {
                setSelectedOrgId(e.target.value)
                setEditingBlock(null)
                setShowTypePicker(false)
              }}
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

        {/* Type Picker */}
        {showTypePicker && (
          <div className="mb-6 md:mb-8 bg-white rounded-lg shadow p-4 md:p-6">
            <h2 className="text-xl md:text-2xl font-bold mb-2">Kies een type</h2>
            <p className="text-gray-500 text-sm mb-4 md:mb-6">Selecteer het raamwerk voor je nieuwe contentblok.</p>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {BLOCK_TYPES.map((type) => (
                <button
                  key={type.id}
                  onClick={() => createBlock(type.id)}
                  className="group p-5 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
                >
                  <h3 className="font-semibold text-gray-900 group-hover:text-blue-700 mb-1">
                    {type.label}
                  </h3>
                  <p className="text-xs text-gray-500 group-hover:text-blue-600">
                    {type.description}
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowTypePicker(false)}
              className="mt-4 text-sm text-gray-500 hover:text-gray-700"
            >
              Annuleren
            </button>
          </div>
        )}

        {/* Editing Panel */}
        {editingBlock && (
          <div className="mb-6 md:mb-8 bg-white rounded-lg shadow p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-6">
              <div>
                <h2 className="text-xl md:text-2xl font-bold">
                  {getBlockType(editingBlock.block_type).label} bewerken
                </h2>
                <p className="text-sm text-gray-500">
                  Type: {getBlockType(editingBlock.block_type).label}
                </p>
              </div>
              <button
                onClick={() => setEditingBlock(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Sluiten
              </button>
            </div>

            {/* Block Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Naam</label>
              <input
                type="text"
                value={editingBlock.name}
                onChange={(e) => {
                  const name = e.target.value
                  setEditingBlock((prev) => ({ ...prev, name }))
                }}
                onBlur={() => updateBlock(editingBlock.id, { name: editingBlock.name })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Type-specific settings */}
            <BlockSettings
              block={editingBlock}
              onUpdate={(settings) => {
                setEditingBlock((prev) => ({ ...prev, settings }))
                updateBlock(editingBlock.id, { settings })
              }}
            />
          </div>
        )}

        {/* Block List */}
        {blocks.length === 0 && !showTypePicker ? (
          <div className="bg-white rounded-lg shadow p-6 md:p-8 text-center text-gray-400">
            Geen contentblokken. Maak je eerste contentblok aan!
          </div>
        ) : (
          <div className="grid gap-4">
            {blocks.map((block) => {
              const typeDef = getBlockType(block.block_type)
              const isEditing = editingBlock?.id === block.id

              return (
                <div
                  key={block.id}
                  className={`bg-white rounded-lg shadow p-4 md:p-5 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 ${
                    isEditing ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1">
                      <h3 className="text-base md:text-lg font-semibold text-gray-900">{block.name}</h3>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs font-medium">
                        {typeDef.label}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">
                      Aangemaakt: {new Date(block.created_at).toLocaleDateString('nl-NL')}
                    </p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingBlock(isEditing ? null : block)}
                      className={`px-3 py-2 rounded text-sm font-medium transition ${
                        isEditing
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      {isEditing ? 'Bewerken...' : 'Bewerk'}
                    </button>
                    <button
                      onClick={() => deleteBlock(block.id)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium transition"
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

// ============================================================
// Block Settings - routes to the right editor per type
// ============================================================
function BlockSettings({ block, onUpdate }) {
  switch (block.block_type) {
    case 'hero':
      return <HeroSettings settings={block.settings} onUpdate={onUpdate} />
    case 'mededelingen':
      return <MededelingenSettings settings={block.settings} onUpdate={onUpdate} />
    default:
      return <GenericSettings settings={block.settings} onUpdate={onUpdate} />
  }
}

// ============================================================
// Hero Settings
// ============================================================
function HeroSettings({ settings, onUpdate }) {
  const [local, setLocal] = useState(settings)

  useEffect(() => {
    setLocal(settings)
  }, [settings])

  const update = (key, value) => {
    const updated = { ...local, [key]: value }
    setLocal(updated)
    onUpdate(updated)
  }

  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-gray-800 border-b pb-2">Hero instellingen</h3>

      {/* Height */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Hoogte (px)
        </label>
        <input
          type="number"
          value={local.height || 400}
          onChange={(e) => update('height', parseInt(e.target.value) || 400)}
          min={100}
          max={1000}
          className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Background Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Achtergrond</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="bgType"
              checked={local.backgroundType === 'color'}
              onChange={() => update('backgroundType', 'color')}
              className="text-blue-600"
            />
            <span className="text-sm text-gray-700">Kleur</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="bgType"
              checked={local.backgroundType === 'image'}
              onChange={() => update('backgroundType', 'image')}
              className="text-blue-600"
            />
            <span className="text-sm text-gray-700">Afbeelding</span>
          </label>
        </div>
      </div>

      {local.backgroundType === 'color' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Achtergrondkleur</label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={local.backgroundColor || '#1e40af'}
              onChange={(e) => update('backgroundColor', e.target.value)}
              className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
            />
            <input
              type="text"
              value={local.backgroundColor || '#1e40af'}
              onChange={(e) => update('backgroundColor', e.target.value)}
              className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Afbeelding URL</label>
          <input
            type="url"
            value={local.backgroundImage || ''}
            onChange={(e) => update('backgroundImage', e.target.value)}
            placeholder="https://voorbeeld.nl/afbeelding.jpg"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      )}

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
        <input
          type="text"
          value={local.title || ''}
          onChange={(e) => update('title', e.target.value)}
          placeholder="Welkom op onze school"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Subtitle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Onderschrift</label>
        <input
          type="text"
          value={local.subtitle || ''}
          onChange={(e) => update('subtitle', e.target.value)}
          placeholder="Samen leren, samen groeien"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Button */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Knop tekst</label>
          <input
            type="text"
            value={local.buttonText || ''}
            onChange={(e) => update('buttonText', e.target.value)}
            placeholder="Meer informatie"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Knop link</label>
          <input
            type="text"
            value={local.buttonLink || ''}
            onChange={(e) => update('buttonLink', e.target.value)}
            placeholder="/over-ons"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {/* Alignment */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Uitlijning</label>
        <div className="flex gap-2">
          {['left', 'center', 'right'].map((align) => (
            <button
              key={align}
              onClick={() => update('alignment', align)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                local.alignment === align
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {align === 'left' ? 'Links' : align === 'center' ? 'Midden' : 'Rechts'}
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Voorbeeld</label>
        <HeroPreview settings={local} />
      </div>
    </div>
  )
}

function HeroPreview({ settings }) {
  const alignClass =
    settings.alignment === 'left'
      ? 'items-start text-left'
      : settings.alignment === 'right'
        ? 'items-end text-right'
        : 'items-center text-center'

  const bgStyle =
    settings.backgroundType === 'image' && settings.backgroundImage
      ? {
          backgroundImage: `url(${settings.backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : { backgroundColor: settings.backgroundColor || '#1e40af' }

  return (
    <div
      className={`rounded-lg flex flex-col justify-center px-4 md:px-8 ${alignClass}`}
      style={{ ...bgStyle, height: Math.min(settings.height || 400, 300) }}
    >
      {settings.title && (
        <h2 className="text-2xl font-bold text-white mb-1 drop-shadow">{settings.title}</h2>
      )}
      {settings.subtitle && (
        <p className="text-sm text-white/80 mb-3 drop-shadow">{settings.subtitle}</p>
      )}
      {settings.buttonText && (
        <span className="inline-block px-4 py-1.5 bg-white text-gray-900 rounded-lg text-sm font-medium">
          {settings.buttonText}
        </span>
      )}
      {!settings.title && !settings.subtitle && (
        <span className="text-white/50 text-sm">Hero voorbeeld</span>
      )}
    </div>
  )
}

// ============================================================
// Mededelingen Settings
// ============================================================
function MededelingenSettings({ settings, onUpdate }) {
  const [local, setLocal] = useState(settings)

  useEffect(() => {
    setLocal(settings)
  }, [settings])

  const update = (key, value) => {
    const updated = { ...local, [key]: value }
    setLocal(updated)
    onUpdate(updated)
  }

  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-gray-800 border-b pb-2">Mededelingen instellingen</h3>

      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
        <input
          type="text"
          value={local.title || 'Mededelingen'}
          onChange={(e) => update('title', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      {/* Max items */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Max. aantal berichten weergegeven
        </label>
        <input
          type="number"
          value={local.maxItems || 5}
          onChange={(e) => update('maxItems', parseInt(e.target.value) || 5)}
          min={1}
          max={50}
          className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      </div>

      <p className="text-sm text-gray-500 italic">
        Berichten beheren doe je via de <a href="#/content" className="text-blue-600 hover:underline">Content</a> pagina.
      </p>
    </div>
  )
}

// ============================================================
// Generic Settings (weer, nieuws, beschikbaarheid, aanwezigheid)
// ============================================================
function GenericSettings({ settings, onUpdate }) {
  const [local, setLocal] = useState(settings)

  useEffect(() => {
    setLocal(settings)
  }, [settings])

  const update = (key, value) => {
    const updated = { ...local, [key]: value }
    setLocal(updated)
    onUpdate(updated)
  }

  return (
    <div className="space-y-5">
      <h3 className="font-semibold text-gray-800 border-b pb-2">Instellingen</h3>

      {local.title !== undefined && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Titel</label>
          <input
            type="text"
            value={local.title || ''}
            onChange={(e) => update('title', e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      )}

      {local.location !== undefined && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Locatie</label>
          <input
            type="text"
            value={local.location || ''}
            onChange={(e) => update('location', e.target.value)}
            placeholder="bijv. Amsterdam"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      )}

      {local.maxItems !== undefined && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Max. aantal items
          </label>
          <input
            type="number"
            value={local.maxItems || 5}
            onChange={(e) => update('maxItems', parseInt(e.target.value) || 5)}
            min={1}
            max={50}
            className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      )}

      <p className="text-sm text-gray-400 italic">
        Verdere instellingen voor dit bloktype worden binnenkort toegevoegd.
      </p>
    </div>
  )
}
