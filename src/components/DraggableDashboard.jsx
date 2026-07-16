import { useState, useRef, useCallback, useEffect } from 'react'

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

const COL_IDS = ['left', 'center', 'right']

export default function DraggableDashboard({ renderCard }) {
  const [layout, setLayout] = useState(loadLayout)
  const [dragOverCol, setDragOverCol] = useState(null)
  const dragState = useRef(null)
  const [dragGhost, setDragGhost] = useState(null)
  const layoutRef = useRef(layout)
  layoutRef.current = layout

  const handleMouseDown = useCallback((e, cardId, colId) => {
    if (e.button !== 0) return
    const el = e.currentTarget.closest('.dd-card')
    if (!el) return
    const rect = el.getBoundingClientRect()
    dragState.current = {
      cardId,
      fromCol: colId,
      startX: e.clientX,
      startY: e.clientY,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
      width: rect.width,
      height: rect.height,
      moved: false,
    }
  }, [])

  useEffect(() => {
    const handleMouseMove = (e) => {
      const ds = dragState.current
      if (!ds) return
      const dx = e.clientX - ds.startX
      const dy = e.clientY - ds.startY
      if (!ds.moved && Math.abs(dx) + Math.abs(dy) < 4) return
      ds.moved = true
      setDragGhost({
        cardId: ds.cardId,
        x: e.clientX - ds.offsetX,
        y: e.clientY - ds.offsetY,
        width: ds.width,
        height: ds.height,
      })
      const el = document.elementFromPoint(e.clientX, e.clientY)
      if (!el) return
      const colEl = el.closest('.dd-column')
      if (colEl) {
        const colId = COL_IDS.find(c => colEl.classList.contains(`dd-column-${c}`))
        setDragOverCol(prev => prev === colId ? prev : colId)
      } else {
        setDragOverCol(null)
      }
    }

    const handleMouseUp = (e) => {
      const ds = dragState.current
      dragState.current = null
      setDragGhost(null)
      if (!ds || !ds.moved) { setDragOverCol(null); return }
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const colEl = el?.closest('.dd-column')
      const toCol = colEl ? COL_IDS.find(c => colEl.classList.contains(`dd-column-${c}`)) : null
      setDragOverCol(null)
      if (!toCol || toCol === ds.fromCol) return
      setLayout(prev => {
        const next = { left: [...prev.left], center: [...prev.center], right: [...prev.right] }
        const fromIdx = next[ds.fromCol].indexOf(ds.cardId)
        if (fromIdx === -1) return prev
        next[ds.fromCol].splice(fromIdx, 1)
        next[toCol].push(ds.cardId)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
        return next
      })
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  return (
    <div className="dd-layout">
      {COL_IDS.map(colId => (
        <div
          key={colId}
          className={`dd-column dd-column-${colId} ${dragOverCol === colId ? 'dd-column-active' : ''}`}
        >
          <div className="dd-column-inner">
            {layout[colId].map(cardId => (
              <div
                key={cardId}
                className={`dd-card ${dragGhost?.cardId === cardId ? 'dd-card-ghost-source' : ''}`}
                onMouseDown={(e) => handleMouseDown(e, cardId, colId)}
              >
                {renderCard(cardId)}
              </div>
            ))}
          </div>
        </div>
      ))}
      {dragGhost && (
        <div
          className="dd-card-overlay"
          style={{
            position: 'fixed',
            left: dragGhost.x,
            top: dragGhost.y,
            width: dragGhost.width,
            zIndex: 9999,
          }}
        >
          {renderCard(dragGhost.cardId)}
        </div>
      )}
    </div>
  )
}
