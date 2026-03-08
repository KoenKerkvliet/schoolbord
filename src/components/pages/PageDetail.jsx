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
                  className="max-w-7xl mx-auto px-4 md:px-6 py-8"
                >
                  <div
                    className={`grid gap-8 grid-cols-1 ${GRID_COLS_RESPONSIVE[layoutConfig.gridCols] || ''}`}
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

  // Hero renders without a section wrapper
  if (parsedBlock.block_type === 'hero') {
    return <HeroRenderer settings={parsedBlock.settings} />
  }

  let content
  switch (parsedBlock.block_type) {
    case 'mededelingen':
      content = (
        <MededelingenRenderer
          settings={parsedBlock.settings}
          items={announcements[parsedBlock.id] || []}
          blockId={parsedBlock.id}
        />
      )
      break
    case 'weer':
      content = <WeerRenderer settings={parsedBlock.settings} />
      break
    case 'nieuws':
      content = <GenericBlockRenderer title={parsedBlock.settings?.title || 'Nieuws'} type="nieuws" />
      break
    case 'beschikbaarheid':
      content = <GenericBlockRenderer title={parsedBlock.settings?.title || 'Beschikbaarheid'} type="beschikbaarheid" />
      break
    case 'aanwezigheid':
      content = <GenericBlockRenderer title={parsedBlock.settings?.title || 'Aanwezigheid'} type="aanwezigheid" />
      break
    default:
      return null
  }

  // Wrap all non-hero blocks in a section container
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {content}
    </div>
  )
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
      : s.backgroundType === 'gradient'
        ? {
            background: `linear-gradient(${s.gradientDirection || 'to bottom'}, ${s.gradientColor1 || '#1e40af'}, ${s.gradientColor2 || '#7c3aed'})`,
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
function MededelingenRenderer({ settings, items, blockId }) {
  const s = settings || {}
  const maxItems = s.maxItems || 5
  const visibleItems = items.slice(0, maxItems)

  // Track last-seen timestamp in localStorage
  const storageKey = `mededelingen_seen_${blockId}`
  const [lastSeen] = useState(() => {
    const stored = localStorage.getItem(storageKey)
    return stored ? new Date(stored) : null
  })

  // Update lastSeen after 2s so badges disappear on next visit
  useEffect(() => {
    if (!blockId || visibleItems.length === 0) return
    const timer = setTimeout(() => {
      localStorage.setItem(storageKey, new Date().toISOString())
    }, 2000)
    return () => clearTimeout(timer)
  }, [storageKey, blockId, visibleItems.length])

  const isNew = (item) => {
    if (!lastSeen) return true
    return new Date(item.created_at) > lastSeen
  }

  const newCount = visibleItems.filter(isNew).length

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('nl-NL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })

  return (
    <div className="p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
        {s.title || 'Mededelingen'}
        {newCount > 0 && (
          <span className="ml-2 text-sm font-medium text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full align-middle">
            {newCount} nieuw
          </span>
        )}
      </h2>
      {visibleItems.length === 0 ? (
        <p className="text-gray-400 text-sm italic">Geen mededelingen.</p>
      ) : (
        <div className="space-y-3">
          {visibleItems.map((item) => (
            <div
              key={item.id}
              className={`border rounded-xl bg-white p-4 md:p-5 ${
                item.is_urgent ? 'border-red-200 bg-red-50/30' : 'border-gray-200'
              }`}
            >
              {/* Header: title + badges */}
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  {item.is_urgent && (
                    <span className="text-red-500 text-lg leading-none shrink-0" title="Belangrijk">❗</span>
                  )}
                  {item.title && (
                    <h3 className="font-semibold text-gray-900 leading-snug">{item.title}</h3>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {isNew(item) && (
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                      Nieuw
                    </span>
                  )}
                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-full">
                    {item.author_name || 'Onbekend'}
                  </span>
                  <span className="text-xs font-medium text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                    {formatDate(item.publish_at || item.created_at)}
                  </span>
                </div>
              </div>

              {/* Body */}
              <div
                className="text-gray-700 prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: item.message }}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================
// Weer Renderer (Open-Meteo Weather Widget)
// ============================================================
const WMO_CODES = {
  0: { desc: 'Helder', icon: '☀️' },
  1: { desc: 'Overwegend helder', icon: '🌤️' },
  2: { desc: 'Gedeeltelijk bewolkt', icon: '⛅' },
  3: { desc: 'Bewolkt', icon: '☁️' },
  45: { desc: 'Mist', icon: '🌫️' },
  48: { desc: 'Rijpmist', icon: '🌫️' },
  51: { desc: 'Lichte motregen', icon: '🌦️' },
  53: { desc: 'Motregen', icon: '🌦️' },
  55: { desc: 'Dichte motregen', icon: '🌧️' },
  61: { desc: 'Lichte regen', icon: '🌦️' },
  63: { desc: 'Regen', icon: '🌧️' },
  65: { desc: 'Zware regen', icon: '🌧️' },
  66: { desc: 'Lichte ijzel', icon: '🌨️' },
  67: { desc: 'Zware ijzel', icon: '🌨️' },
  71: { desc: 'Lichte sneeuw', icon: '🌨️' },
  73: { desc: 'Sneeuw', icon: '❄️' },
  75: { desc: 'Zware sneeuw', icon: '❄️' },
  77: { desc: 'Sneeuwkorrels', icon: '❄️' },
  80: { desc: 'Lichte buien', icon: '🌦️' },
  81: { desc: 'Buien', icon: '🌧️' },
  82: { desc: 'Zware buien', icon: '🌧️' },
  85: { desc: 'Lichte sneeuwbuien', icon: '🌨️' },
  86: { desc: 'Zware sneeuwbuien', icon: '🌨️' },
  95: { desc: 'Onweer', icon: '⛈️' },
  96: { desc: 'Onweer met hagel', icon: '⛈️' },
  99: { desc: 'Onweer met zware hagel', icon: '⛈️' },
}

function getWeatherInfo(code) {
  return WMO_CODES[code] || { desc: 'Onbekend', icon: '❓' }
}

function WeerRenderer({ settings }) {
  const s = settings || {}
  const location = s.location || ''

  const [weather, setWeather] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!location.trim()) return

    let cancelled = false
    const fetchWeather = async () => {
      setLoading(true)
      setError(null)
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location.trim())}&count=1&language=nl`
        )
        const geoData = await geoRes.json()
        if (!geoData.results?.length) throw new Error(`Locatie "${location}" niet gevonden`)

        const { latitude, longitude, name: cityName } = geoData.results[0]
        const weatherRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=Europe/Amsterdam&forecast_days=5`
        )
        const data = await weatherRes.json()
        if (!cancelled) setWeather({ ...data, cityName })
      } catch (err) {
        if (!cancelled) setError(err.message || 'Kon weerdata niet ophalen')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchWeather()
    return () => { cancelled = true }
  }, [location])

  if (!location.trim()) {
    return (
      <div className="p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Weer</h2>
        <p className="text-gray-400 text-sm italic">Geen locatie ingesteld.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Weer</h2>
        <p className="text-gray-500 text-sm">Weerdata laden...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 md:p-6">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-2">Weer</h2>
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    )
  }

  if (!weather) return null

  const cur = weather.current
  const daily = weather.daily
  const curInfo = getWeatherInfo(cur.weather_code)

  const dayName = (dateStr, i) => {
    if (i === 0) return 'Vandaag'
    if (i === 1) return 'Morgen'
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('nl-NL', { weekday: 'short' })
  }

  return (
    <div>
      {/* Current weather */}
      <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-4 md:p-6 text-white">
        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-lg md:text-xl font-bold">{weather.cityName}</h2>
            <p className="text-white/80 text-sm">{curInfo.desc}</p>
          </div>
          <span className="text-3xl md:text-4xl">{curInfo.icon}</span>
        </div>
        <div className="text-3xl md:text-4xl font-bold mb-3">
          {Math.round(cur.temperature_2m)}°C
        </div>
        <div className="flex gap-4 text-sm text-white/80">
          <span>💨 {Math.round(cur.wind_speed_10m)} km/u</span>
          <span>💧 {cur.relative_humidity_2m}%</span>
        </div>
      </div>

      {/* 5-day forecast */}
      <div className="p-4 md:p-5">
        <div className="grid grid-cols-5 gap-2 text-center">
          {daily.time.map((date, i) => {
            const dayInfo = getWeatherInfo(daily.weather_code[i])
            return (
              <div key={date} className="py-2">
                <div className="text-xs font-medium text-gray-500 mb-1">{dayName(date, i)}</div>
                <div className="text-xl mb-1">{dayInfo.icon}</div>
                <div className="text-sm font-semibold text-gray-900">
                  {Math.round(daily.temperature_2m_max[i])}°
                </div>
                <div className="text-xs text-gray-400">
                  {Math.round(daily.temperature_2m_min[i])}°
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ============================================================
// Generic Block Renderer (nieuws, beschikbaarheid, aanwezigheid)
// ============================================================
function GenericBlockRenderer({ title, type }) {
  return (
    <div className="p-4 md:p-6">
      <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">{title}</h2>
      <p className="text-gray-400 text-sm italic">
        {type === 'nieuws' && 'Nieuwswidget wordt binnenkort toegevoegd.'}
        {type === 'beschikbaarheid' && 'Beschikbaarheidsoverzicht wordt binnenkort toegevoegd.'}
        {type === 'aanwezigheid' && 'Aanwezigheidsoverzicht wordt binnenkort toegevoegd.'}
      </p>
    </div>
  )
}
