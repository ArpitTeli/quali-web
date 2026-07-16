import { useState, useRef, useCallback } from 'react'

const STORAGE_KEY = 'quali_dashboard_layout'

const DEFAULT_LAYOUT = {
  left: ['master-sheet', 'lead-queue'],
  center: ['leaderboard'],
  right: ['work-tracker', 'todo-list'],
}

function loadLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { left: [...DEFAULT_LAYOUT.left], center: [...DEFAULT_LAYOUT.center], right: [...DEFAULT_LAYOUT.right] }
    const parsed = JSON.parse(raw)
    const allIds = new Set(Object.values(DEFAULT_LAYOUT).flat())
    const valid = { left: [], center: [], right: [] }
    const seen = new Set()
    for (const col of ['left', 'center', 'right']) {
      for (const id of (parsed[col] || [])) {
        if (allIds.has(id) && !seen.has(id)) {
          valid[col].push(id)
          seen.add(id)
        }
      }
    }
    for (const id of allIds) {
      if (!seen.has(id)) valid.left.push(id)
    }
    return valid
  } catch {
    return { left: [...DEFAULT_LAYOUT.left], center: [...DEFAULT_LAYOUT.center], right: [...DEFAULT_LAYOUT.right] }
  }
}

export default function DraggableDashboard({ renderCard }) {
  const [layout, setLayout] = useState(loadLayout)
  const [dragOverCol, setDragOverCol] = useState(null)
  const dragItem = useRef(null)

  const handleDragStart = useCallback((e, cardId, fromCol) => {
    dragItem.current = { cardId, fromCol }
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', cardId)
    requestAnimationFrame(() => {
      if (e.target) e.target.style.opacity = '0.4'
    })
  }, [])

  const handleDragEnd = useCallback((e) => {
    if (e.target) e.target.style.opacity = '1'
    dragItem.current = null
    setDragOverCol(null)
  }, [])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDragEnter = useCallback((e, colId) => {
    e.preventDefault()
    setDragOverCol(colId)
  }, [])

  const handleDragLeave = useCallback((e, colId) => {
    if (e.currentTarget && e.currentTarget.contains(e.relatedTarget)) return
    setDragOverCol(prev => prev === colId ? null : prev)
  }, [])

  const handleDrop = useCallback((e, toCol) => {
    e.preventDefault()
    setDragOverCol(null)
    if (!dragItem.current) return

    const { cardId, fromCol } = dragItem.current
    dragItem.current = null

    setLayout(prev => {
      const next = { left: [...prev.left], center: [...prev.center], right: [...prev.right] }
      const fromIdx = next[fromCol].indexOf(cardId)
      if (fromIdx === -1) return prev
      next[fromCol].splice(fromIdx, 1)
      next[toCol].push(cardId)
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  return (
    <div className="dd-layout">
      {['left', 'center', 'right'].map(colId => (
        <div
          key={colId}
          className={`dd-column ${dragOverCol === colId ? 'dd-column-active' : ''}`}
          onDragOver={handleDragOver}
          onDragEnter={(e) => handleDragEnter(e, colId)}
          onDragLeave={(e) => handleDragLeave(e, colId)}
          onDrop={(e) => handleDrop(e, colId)}
        >
          <div className="dd-column-inner">
            {layout[colId].map(cardId => (
              <div
                key={cardId}
                className="dd-card"
                draggable="true"
                onDragStart={(e) => handleDragStart(e, cardId, colId)}
                onDragEnd={handleDragEnd}
              >
                {renderCard(cardId)}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
