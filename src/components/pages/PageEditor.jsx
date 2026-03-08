import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../../services/supabaseClient'
import { useAuth } from '../../context/AuthContext'
import SectionLayoutPicker, { LAYOUTS } from './SectionLayoutPicker'
import { getBlockType } from './blockTypes'

export default function PageEditor() {
  const { pageId } = useParams()
  const { organizationId, isSuperAdmin } = useAuth()
  const [page, setPage] = useState(null)
  const [sections, setSections] = useState([])
  const [columnBlocks, setColumnBlocks] = useState([])
  const [availableBlocks, setAvailableBlocks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [addingAtPosition, setAddingAtPosition] = useState(null)
  // Track which column is picking a block: "sectionId-colIdx"
  const [pickingBlock, setPickingBlock] = useState(null)

  useEffect(() => {
    loadPage()
    loadSections()
  }, [pageId])

  const loadPage = async () => {
    const { data, error } = await supabase
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .single()
    if (error) {
      setError('Pagina niet gevonden')
    } else {
      setPage(data)
      loadAvailableBlocks(data.organization_id)
    }
  }

  const loadAvailableBlocks = async (orgId) => {
    const { data } = await supabase
      .from('content_blocks')
      .select('*')
      .eq('organization_id', orgId)
      .order('name')
    setAvailableBlocks(data || [])
  }

  const loadSections = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('page_sections')
        .select('*')
        .eq('page_id', pageId)
        .order('position', { ascending: true })

      if (error) throw error
      setSections(data || [])

      // Load column blocks and content blocks separately
      if (data && data.length > 0) {
        const sectionIds = data.map((s) => s.id)
        const { data: cbData } = await supabase
          .from('section_column_blocks')
          .select('*')
          .in('section_id', sectionIds)
          .order('position', { ascending: true })

        const cbRows = cbData || []
        if (cbRows.length > 0) {
          const blockIds = [...new Set(cbRows.map((cb) => cb.content_block_id))]
          const { data: blocksData } = await supabase
            .from('content_blocks')
            .select('*')
            .in('id', blockIds)

          const blocksMap = {}
          for (const b of blocksData || []) {
            blocksMap[b.id] = b
          }
          setColumnBlocks(cbRows.map((cb) => ({
            ...cb,
            content_blocks: blocksMap[cb.content_block_id] || null,
          })))
        } else {
          setColumnBlocks([])
        }
      } else {
        setColumnBlocks([])
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const addSection = async (layout, atPosition) => {
    try {
      const toUpdate = sections.filter((s) => s.position >= atPosition)
      for (const section of toUpdate) {
        await supabase
          .from('page_sections')
          .update({ position: section.position + 1 })
          .eq('id', section.id)
      }

      const { error } = await supabase.from('page_sections').insert({
        page_id: pageId,
        layout,
        position: atPosition,
      })

      if (error) throw error
      setAddingAtPosition(null)
      await loadSections()
    } catch (err) {
      setError(err.message)
    }
  }

  const deleteSection = async (sectionId) => {
    if (!confirm('Weet je zeker dat je deze sectie wilt verwijderen?')) return

    try {
      const { error } = await supabase
        .from('page_sections')
        .delete()
        .eq('id', sectionId)

      if (error) throw error

      const remaining = sections
        .filter((s) => s.id !== sectionId)
        .sort((a, b) => a.position - b.position)

      for (let i = 0; i < remaining.length; i++) {
        if (remaining[i].position !== i) {
          await supabase
            .from('page_sections')
            .update({ position: i })
            .eq('id', remaining[i].id)
        }
      }

      await loadSections()
    } catch (err) {
      setError(err.message)
    }
  }

  const changeLayout = async (sectionId, newLayout) => {
    try {
      const { error } = await supabase
        .from('page_sections')
        .update({ layout: newLayout })
        .eq('id', sectionId)

      if (error) throw error
      await loadSections()
    } catch (err) {
      setError(err.message)
    }
  }

  const moveSection = async (sectionId, direction) => {
    const idx = sections.findIndex((s) => s.id === sectionId)
    if (idx < 0) return
    const newIdx = idx + direction
    if (newIdx < 0 || newIdx >= sections.length) return

    try {
      const current = sections[idx]
      const swap = sections[newIdx]

      await supabase
        .from('page_sections')
        .update({ position: swap.position })
        .eq('id', current.id)
      await supabase
        .from('page_sections')
        .update({ position: current.position })
        .eq('id', swap.id)

      await loadSections()
    } catch (err) {
      setError(err.message)
    }
  }

  const placeBlock = async (sectionId, colIdx, blockId) => {
    try {
      // Count existing blocks in this column for position
      const existing = columnBlocks.filter(
        (cb) => cb.section_id === sectionId && cb.column_index === colIdx
      )

      const { error } = await supabase.from('section_column_blocks').insert({
        section_id: sectionId,
        column_index: colIdx,
        content_block_id: blockId,
        position: existing.length,
      })

      if (error) throw error
      setPickingBlock(null)
      await loadSections()
    } catch (err) {
      setError(err.message)
    }
  }

  const removeColumnBlock = async (columnBlockId) => {
    try {
      const { error } = await supabase
        .from('section_column_blocks')
        .delete()
        .eq('id', columnBlockId)

      if (error) throw error
      await loadSections()
    } catch (err) {
      setError(err.message)
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

  if (loading && !page) {
    return <div className="p-8 text-gray-600">Laden...</div>
  }

  if (error && !page) {
    return (
      <div className="p-8">
        <div className="text-red-600 mb-4">{error}</div>
        <Link to="/pages" className="text-blue-600 hover:underline">Terug naar pagina's</Link>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="max-w-5xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/pages"
            className="text-gray-500 hover:text-gray-700 transition"
          >
            &larr; Terug
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{page?.title}</h1>
            <p className="text-sm text-gray-500">Pagina bewerken - secties beheren</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Sections */}
        <div className="space-y-2">
          {sections.length === 0 && addingAtPosition !== 0 && (
            <AddSectionButton onClick={() => setAddingAtPosition(0)} />
          )}

          {addingAtPosition === 0 && sections.length === 0 && (
            <SectionLayoutPicker
              onSelect={(layout) => addSection(layout, 0)}
              onCancel={() => setAddingAtPosition(null)}
            />
          )}

          {sections.map((section, idx) => {
            const layoutConfig = getLayoutConfig(section.layout)

            return (
              <div key={section.id}>
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                  {/* Section toolbar */}
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-medium text-gray-400">
                        Sectie {idx + 1}
                      </span>
                      <select
                        value={section.layout}
                        onChange={(e) => changeLayout(section.id, e.target.value)}
                        className="text-xs px-2 py-1 border border-gray-300 rounded bg-white"
                      >
                        {LAYOUTS.map((l) => (
                          <option key={l.id} value={l.id}>{l.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveSection(section.id, -1)}
                        disabled={idx === 0}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30"
                        title="Omhoog"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveSection(section.id, 1)}
                        disabled={idx === sections.length - 1}
                        className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-30"
                        title="Omlaag"
                      >
                        ↓
                      </button>
                      <button
                        onClick={() => deleteSection(section.id)}
                        className="px-2 py-1 text-xs text-red-500 hover:text-red-700"
                        title="Verwijderen"
                      >
                        Verwijder
                      </button>
                    </div>
                  </div>

                  {/* Grid with columns */}
                  <div
                    className="grid gap-3 p-4"
                    style={{ gridTemplateColumns: `repeat(${layoutConfig.gridCols}, 1fr)` }}
                  >
                    {layoutConfig.columns.map((col, colIdx) => {
                      const blocksInColumn = getColumnBlocks(section.id, colIdx)
                      const pickKey = `${section.id}-${colIdx}`
                      const isPicking = pickingBlock === pickKey

                      return (
                        <div
                          key={colIdx}
                          className="border-2 border-dashed border-gray-200 rounded-lg p-3 min-h-[80px]"
                          style={{ gridColumn: `span ${col.span}` }}
                        >
                          {/* Placed blocks */}
                          {blocksInColumn.map((cb) => {
                            const block = cb.content_blocks
                            const typeDef = getBlockType(block?.block_type)
                            return (
                              <div
                                key={cb.id}
                                className="flex items-center justify-between bg-purple-50 border border-purple-200 rounded px-3 py-2 mb-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-purple-900 truncate">
                                    {block?.name}
                                  </p>
                                  <p className="text-xs text-purple-600">{typeDef.label}</p>
                                </div>
                                <button
                                  onClick={() => removeColumnBlock(cb.id)}
                                  className="text-red-400 hover:text-red-600 text-xs ml-2 shrink-0"
                                  title="Verwijderen"
                                >
                                  x
                                </button>
                              </div>
                            )
                          })}

                          {/* Block picker */}
                          {isPicking ? (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                              <p className="text-xs font-medium text-gray-700 mb-2">Kies contentblok</p>
                              {availableBlocks.length === 0 ? (
                                <p className="text-xs text-gray-400">
                                  Geen contentblokken beschikbaar. Maak er eerst een aan bij Contentblokken.
                                </p>
                              ) : (
                                <div className="space-y-1 max-h-48 overflow-y-auto">
                                  {availableBlocks.map((block) => {
                                    const typeDef = getBlockType(block.block_type)
                                    return (
                                      <button
                                        key={block.id}
                                        onClick={() => placeBlock(section.id, colIdx, block.id)}
                                        className="w-full text-left px-3 py-2 rounded hover:bg-blue-50 transition flex items-center justify-between"
                                      >
                                        <span className="text-sm text-gray-900 truncate">{block.name}</span>
                                        <span className="text-xs text-purple-600 ml-2 shrink-0">{typeDef.label}</span>
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                              <button
                                onClick={() => setPickingBlock(null)}
                                className="mt-2 text-xs text-gray-500 hover:text-gray-700"
                              >
                                Annuleren
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <button
                                onClick={() => setPickingBlock(pickKey)}
                                className="w-6 h-6 flex items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition text-xs"
                                title="Contentblok toevoegen"
                              >
                                +
                              </button>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Add section button after this section */}
                {addingAtPosition === idx + 1 ? (
                  <div className="my-2">
                    <SectionLayoutPicker
                      onSelect={(layout) => addSection(layout, idx + 1)}
                      onCancel={() => setAddingAtPosition(null)}
                    />
                  </div>
                ) : (
                  <AddSectionButton onClick={() => setAddingAtPosition(idx + 1)} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function AddSectionButton({ onClick }) {
  return (
    <div className="flex justify-center py-2">
      <button
        onClick={onClick}
        className="w-8 h-8 flex items-center justify-center rounded-full border-2 border-dashed border-gray-300 text-gray-400 hover:border-blue-500 hover:text-blue-500 hover:bg-blue-50 transition"
        title="Sectie toevoegen"
      >
        +
      </button>
    </div>
  )
}
