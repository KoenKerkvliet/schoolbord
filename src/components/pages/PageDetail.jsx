import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import { LAYOUTS, GRID_COLS_RESPONSIVE, COL_SPAN_RESPONSIVE } from './SectionLayoutPicker'
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
      if (error) {
        console.error('PageDetail: page query error:', error)
        throw error
      }
      console.log('PageDetail: page loaded:', data?.title, data?.id)
      setPage(data)

      // Load sections
      const { data: sectionsData } = await supabase
        .from('page_sections')
        .select('*')
        .eq('page_id', data.id)
        .order('position', { ascending: true })

      console.log('PageDetail: sections loaded:', sectionsData?.length || 0)
      setSections(sectionsData || [])

      // Load column blocks and content blocks separately (more reliable than FK join)
      if (sectionsData && sectionsData.length > 0) {
        const sectionIds = sectionsData.map((s) => s.id)

        const { data: cbData, error: cbError } = await supabase
          .from('section_column_blocks')
          .select('*')
          .in('section_id', sectionIds)
          .order('position', { ascending: true })

        if (cbError) console.error('PageDetail: column blocks error:', cbError)
        console.log('PageDetail: column blocks loaded:', cbData?.length || 0)

        const cbRows = cbData || []

        if (cbRows.length > 0) {
          // Load the actual content blocks separately
          const blockIds = [...new Set(cbRows.map((cb) => cb.content_block_id))]
          const { data: blocksData, error: blocksError } = await supabase
            .from('content_blocks')
            .select('*')
            .in('id', blockIds)

          if (blocksError) console.error('PageDetail: content blocks error:', blocksError)
          console.log('PageDetail: content blocks loaded:', blocksData?.length || 0)

          // Merge content_blocks into column block rows
          const blocksMap = {}
          for (const b of blocksData || []) {
            blocksMap[b.id] = b
          }
          const merged = cbRows.map((cb) => ({
            ...cb,
            content_blocks: blocksMap[cb.content_block_id] || null,
          }))
          setColumnBlocks(merged)

          // Load announcements for mededelingen blocks
          const mededelingenBlockIds = merged
            .filter((cb) => cb.content_blocks?.block_type === 'mededelingen')
            .map((cb) => cb.content_blocks.id)

          if (mededelingenBlockIds.length > 0) {
            const now = new Date().toISOString()
            const { data: annData } = await supabase
              .from('announcements')
              .select('*')
              .in('content_block_id', mededelingenBlockIds)
              .lte('publish_at', now)
              .or(`expires_at.is.null,expires_at.gte.${now}`)
              .order('publish_at', { ascending: false })

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
      <div className="flex items-center justify-center py-20">
        <div className="text-gray-600">Laden...</div>
      </div>
    )
  }

  if (error || !page) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">Pagina niet gevonden</h1>
        <Link to="/frontend" className="text-blue-600 hover:underline">
          Terug naar homepage
        </Link>
      </div>
    )
  }

  return (
    <div>
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
                    <HeroRenderer settings={parseSettings(block.settings)} fullWidth />
                  </div>
                )
              }

              return (
                <div
                  key={section.id}
                  className="max-w-7xl mx-auto px-4 md:px-6 py-4"
                >
                  <div
                    className={`grid gap-4 grid-cols-1 ${GRID_COLS_RESPONSIVE[layoutConfig.gridCols] || ''}`}
                  >
                    {layoutConfig.columns.map((col, colIdx) => {
                      const blocksInCol = getColumnBlocks(section.id, colIdx)
                      return (
                        <div
                          key={colIdx}
                          className={`min-h-[60px] ${COL_SPAN_RESPONSIVE[col.span] || ''}`}
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
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
            <div className="bg-white rounded-lg shadow p-4 md:p-8">
              {page.content ? (
                <div className="text-gray-700 whitespace-pre-wrap">{page.content}</div>
              ) : (
                <p className="text-gray-500 italic text-center">Geen inhoud</p>
              )}
            </div>
          </div>
        )}
    </div>
  )
}

// ============================================================
// Block Renderer - routes to the right renderer per type
// ============================================================
function parseSettings(settings) {
  if (!settings) return {}
  if (typeof settings === 'string') {
    try { return JSON.parse(settings) } catch { return {} }
  }
  return settings
}

function BlockRenderer({ block, announcements }) {
  if (!block) return null

  const parsedBlock = { ...block, settings: parseSettings(block.settings) }

  switch (parsedBlock.block_type) {
    case 'hero':
      return <HeroRenderer settings={parsedBlock.settings} />
    case 'mededelingen':
      return (
        <MededelingenRenderer
          settings={parsedBlock.settings}
          items={announcements[parsedBlock.id] || []}
        />
      )
    case 'weer':
      return <GenericBlockRenderer title={parsedBlock.settings?.title || 'Weer'} type="weer" />
    case 'nieuws':
      return <GenericBlockRenderer title={parsedBlock.settings?.title || 'Nieuws'} type="nieuws" />
    case 'beschikbaarheid':
      return <GenericBlockRenderer title={parsedBlock.settings?.title || 'Beschikbaarheid'} type="beschikbaarheid" />
    case 'aanwezigheid':
      return <GenericBlockRenderer title={parsedBlock.settings?.title || 'Aanwezigheid'} type="aanwezigheid" />
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
      className={`flex flex-col justify-center px-4 md:px-8 ${alignClass} ${fullWidth ? '' : 'rounded-lg'}`}
      style={{ ...bgStyle, height: `clamp(200px, 50vw, ${s.height || 400}px)` }}
    >
      <div className={`${fullWidth ? 'max-w-7xl mx-auto w-full' : ''}`}>
        {s.title && (
          <h1 className="text-2xl md:text-5xl font-bold text-white mb-3 drop-shadow-lg">
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
    <div className="bg-white rounded-lg shadow p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">{s.title || 'Mededelingen'}</h2>
      {visibleItems.length === 0 ? (
        <p className="text-gray-400 text-sm italic">Geen mededelingen.</p>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) => (
            <div key={item.id} className="border-l-4 border-blue-500 pl-4 py-2">
              {item.title && (
                <h3 className="font-semibold text-gray-900 mb-1">{item.title}</h3>
              )}
              <div
                className="text-gray-800 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: item.message }}
              />
              <p className="text-xs text-gray-400 mt-1">
                {new Date(item.publish_at || item.created_at).toLocaleDateString('nl-NL', {
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
    <div className="bg-white rounded-lg shadow p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <p className="text-gray-400 text-sm italic">
        {type === 'weer' && 'Weerswidget wordt binnenkort toegevoegd.'}
        {type === 'nieuws' && 'Nieuwswidget wordt binnenkort toegevoegd.'}
        {type === 'beschikbaarheid' && 'Beschikbaarheidsoverzicht wordt binnenkort toegevoegd.'}
        {type === 'aanwezigheid' && 'Aanwezigheidsoverzicht wordt binnenkort toegevoegd.'}
      </p>
    </div>
  )
}
