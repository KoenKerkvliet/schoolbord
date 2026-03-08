import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { LAYOUTS } from './SectionLayoutPicker'
import { getBlockType } from './blockTypes'

export default function PageDetail() {
  const { pageSlug } = useParams()
  const { organizationId, isSuperAdmin } = useAuth()
  const [page, setPage] = useState(null)
  const [sections, setSections] = useState([])
  const [columnBlocks, setColumnBlocks] = useState([])
  const [announcements, setAnnouncements] = useState({})
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

      // Load sections
      const { data: sectionsData } = await supabase
        .from('page_sections')
        .select('*')
        .eq('page_id', data.id)
        .order('position', { ascending: true })

      setSections(sectionsData || [])

      // Load column blocks with content_blocks data
      if (sectionsData && sectionsData.length > 0) {
        const sectionIds = sectionsData.map((s) => s.id)
        const { data: cbData } = await supabase
          .from('section_column_blocks')
          .select('*, content_blocks (*)')
          .in('section_id', sectionIds)
          .order('position', { ascending: true })

        setColumnBlocks(cbData || [])

        // Load announcements for mededelingen blocks
        const mededelingenBlockIds = (cbData || [])
          .filter((cb) => cb.content_blocks?.block_type === 'mededelingen')
          .map((cb) => cb.content_blocks.id)

        if (mededelingenBlockIds.length > 0) {
          const { data: annData } = await supabase
            .from('announcements')
            .select('*')
            .in('content_block_id', mededelingenBlockIds)
            .order('created_at', { ascending: false })

          // Group by content_block_id
          const grouped = {}
          for (const ann of annData || []) {
            if (!grouped[ann.content_block_id]) grouped[ann.content_block_id] = []
            grouped[ann.content_block_id].push(ann)
          }
          setAnnouncements(grouped)
        }
      } else {
        setColumnBlocks([])
      }

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

  const getColumnBlocks = (sectionId, colIdx) => {
    return columnBlocks.filter(
      (cb) => cb.section_id === sectionId && cb.column_index === colIdx
    )
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
        {sections.length > 0 ? (
          <div>
            {sections.map((section) => {
              const layoutConfig = getLayoutConfig(section.layout)
              const hasBlocks = layoutConfig.columns.some(
                (_, colIdx) => getColumnBlocks(section.id, colIdx).length > 0
              )

              // Check if this section has a full-width hero
              const firstColBlocks = getColumnBlocks(section.id, 0)
              const isFullWidthHero =
                section.layout === '1' &&
                firstColBlocks.length === 1 &&
                firstColBlocks[0].content_blocks?.block_type === 'hero'

              if (isFullWidthHero) {
                const block = firstColBlocks[0].content_blocks
                return (
                  <div key={section.id}>
                    <HeroRenderer settings={block.settings} fullWidth />
                  </div>
                )
              }

              return (
                <div
                  key={section.id}
                  className="max-w-7xl mx-auto px-6 py-4"
                >
                  <div
                    className="grid gap-4"
                    style={{ gridTemplateColumns: `repeat(${layoutConfig.gridCols}, 1fr)` }}
                  >
                    {layoutConfig.columns.map((col, colIdx) => {
                      const blocksInCol = getColumnBlocks(section.id, colIdx)
                      return (
                        <div
                          key={colIdx}
                          className="min-h-[60px]"
                          style={{ gridColumn: `span ${col.span}` }}
                        >
                          {blocksInCol.map((cb) => (
                            <BlockRenderer
                              key={cb.id}
                              block={cb.content_blocks}
                              announcements={announcements}
                            />
                          ))}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="bg-white rounded-lg shadow p-8">
              {page.content ? (
                <div className="text-gray-700 whitespace-pre-wrap">{page.content}</div>
              ) : (
                <p className="text-gray-500 italic text-center">Geen inhoud</p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// ============================================================
// Block Renderer - routes to the right renderer per type
// ============================================================
function BlockRenderer({ block, announcements }) {
  if (!block) return null

  switch (block.block_type) {
    case 'hero':
      return <HeroRenderer settings={block.settings} />
    case 'mededelingen':
      return (
        <MededelingenRenderer
          settings={block.settings}
          items={announcements[block.id] || []}
        />
      )
    case 'weer':
      return <GenericBlockRenderer title={block.settings?.title || 'Weer'} type="weer" />
    case 'nieuws':
      return <GenericBlockRenderer title={block.settings?.title || 'Nieuws'} type="nieuws" />
    case 'beschikbaarheid':
      return <GenericBlockRenderer title={block.settings?.title || 'Beschikbaarheid'} type="beschikbaarheid" />
    case 'aanwezigheid':
      return <GenericBlockRenderer title={block.settings?.title || 'Aanwezigheid'} type="aanwezigheid" />
    default:
      return null
  }
}

// ============================================================
// Hero Renderer
// ============================================================
function HeroRenderer({ settings, fullWidth }) {
  const s = settings || {}

  const alignClass =
    s.alignment === 'left'
      ? 'items-start text-left'
      : s.alignment === 'right'
        ? 'items-end text-right'
        : 'items-center text-center'

  const bgStyle =
    s.backgroundType === 'image' && s.backgroundImage
      ? {
          backgroundImage: `url(${s.backgroundImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }
      : { backgroundColor: s.backgroundColor || '#1e40af' }

  return (
    <div
      className={`flex flex-col justify-center px-8 ${alignClass} ${fullWidth ? '' : 'rounded-lg'}`}
      style={{ ...bgStyle, height: s.height || 400 }}
    >
      <div className={`${fullWidth ? 'max-w-7xl mx-auto w-full' : ''}`}>
        {s.title && (
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg">
            {s.title}
          </h1>
        )}
        {s.subtitle && (
          <p className="text-lg md:text-xl text-white/85 mb-6 drop-shadow">
            {s.subtitle}
          </p>
        )}
        {s.buttonText && (
          <a
            href={s.buttonLink || '#'}
            className="inline-block px-6 py-3 bg-white text-gray-900 rounded-lg font-semibold hover:bg-gray-100 transition shadow-lg"
          >
            {s.buttonText}
          </a>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Mededelingen Renderer
// ============================================================
function MededelingenRenderer({ settings, items }) {
  const s = settings || {}
  const maxItems = s.maxItems || 5
  const visibleItems = items.slice(0, maxItems)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{s.title || 'Mededelingen'}</h2>
      {visibleItems.length === 0 ? (
        <p className="text-gray-400 text-sm italic">Geen mededelingen.</p>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) => (
            <div key={item.id} className="border-l-4 border-blue-500 pl-4 py-2">
              <p className="text-gray-800">{item.message}</p>
              <p className="text-xs text-gray-400 mt-1">
                {new Date(item.created_at).toLocaleDateString('nl-NL', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Generic Block Renderer (weer, nieuws, beschikbaarheid, aanwezigheid)
// ============================================================
function GenericBlockRenderer({ title, type }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <p className="text-gray-400 text-sm italic">
        {type === 'weer' && 'Weerswidget wordt binnenkort toegevoegd.'}
        {type === 'nieuws' && 'Nieuwswidget wordt binnenkort toegevoegd.'}
        {type === 'beschikbaarheid' && 'Beschikbaarheidsoverzicht wordt binnenkort toegevoegd.'}
        {type === 'aanwezigheid' && 'Aanwezigheidsoverzicht wordt binnenkort toegevoegd.'}
      </p>
    </div>
  )
}
