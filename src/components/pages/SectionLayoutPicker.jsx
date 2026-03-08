const LAYOUTS = [
  {
    id: '1',
    label: '1 kolom',
    columns: [{ span: 1 }],
    gridCols: 1,
  },
  {
    id: '2',
    label: '2 kolommen',
    columns: [{ span: 1 }, { span: 1 }],
    gridCols: 2,
  },
  {
    id: '3',
    label: '3 kolommen',
    columns: [{ span: 1 }, { span: 1 }, { span: 1 }],
    gridCols: 3,
  },
  {
    id: '1-2',
    label: '1/3 + 2/3',
    columns: [{ span: 1 }, { span: 2 }],
    gridCols: 3,
  },
  {
    id: '2-1',
    label: '2/3 + 1/3',
    columns: [{ span: 2 }, { span: 1 }],
    gridCols: 3,
  },
  {
    id: '1-3',
    label: '1/4 + 3/4',
    columns: [{ span: 1 }, { span: 3 }],
    gridCols: 4,
  },
  {
    id: '3-1',
    label: '3/4 + 1/4',
    columns: [{ span: 3 }, { span: 1 }],
    gridCols: 4,
  },
  {
    id: '1-1-2',
    label: '1/4 + 1/4 + 2/4',
    columns: [{ span: 1 }, { span: 1 }, { span: 2 }],
    gridCols: 4,
  },
  {
    id: '2-1-1',
    label: '2/4 + 1/4 + 1/4',
    columns: [{ span: 2 }, { span: 1 }, { span: 1 }],
    gridCols: 4,
  },
]

export { LAYOUTS }

export default function SectionLayoutPicker({ onSelect, onCancel }) {
  return (
    <div className="bg-white border-2 border-dashed border-gray-300 rounded-lg p-6">
      <h3 className="text-sm font-semibold text-gray-700 mb-4">Kies een layout</h3>
      <div className="grid grid-cols-3 gap-3">
        {LAYOUTS.map((layout) => (
          <button
            key={layout.id}
            onClick={() => onSelect(layout.id)}
            className="group p-3 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition"
          >
            <div
              className="grid gap-1 h-8 mb-2"
              style={{ gridTemplateColumns: `repeat(${layout.gridCols}, 1fr)` }}
            >
              {layout.columns.map((col, i) => (
                <div
                  key={i}
                  className="bg-gray-300 group-hover:bg-blue-300 rounded transition"
                  style={{ gridColumn: `span ${col.span}` }}
                />
              ))}
            </div>
            <p className="text-xs text-gray-500 group-hover:text-blue-600">{layout.label}</p>
          </button>
        ))}
      </div>
      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-4 text-sm text-gray-500 hover:text-gray-700"
        >
          Annuleren
        </button>
      )}
    </div>
  )
}
