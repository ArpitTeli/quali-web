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

let ghostEl = null
let activeDrag = null

export default function DraggableDashboard({ renderCard }) {
  const [layout, setLayout] = useState(loadLayout)
  const [dragOverCol, setDragOverCol] = useState(null)
  const [draggingCard, setDraggingCard] = useState(null)
  const layoutRef = useRef(layout)
  layoutRef.current = layout

  useEffect(() => {
    function onMouseMove(e) {
      if (!activeDrag) return
      if (ghostEl) {
        ghostEl.style.left = (e.clientX - activeDrag.offsetX) + 'px'
        ghostEl.style.top = (e.clientY - activeDrag.offsetY) + 'px'
      }
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const colEl = el?.closest?.('.dd-column')
      if (colEl) {
        const classes = colEl.className
        let found = null
        if (classes.includes('dd-col-left')) found = 'left'
        else if (classes.includes('dd-col-center')) found = 'center'
        else if (classes.includes('dd-col-right')) found = 'right'
        setDragOverCol(found)
      } else {
        setDragOverCol(null)
      }
    }

    function onMouseUp(e) {
      if (!activeDrag) return
      const { cardId, fromCol } = activeDrag
      activeDrag = null

      if (ghostEl) {
        ghostEl.remove()
        ghostEl = null
      }
      setDraggingCard(null)

      const el = document.elementFromPoint(e.clientX, e.clientY)
      const colEl = el?.closest?.('.dd-column')
      let toCol = null
      if (colEl) {
        const classes = colEl.className
        if (classes.includes('dd-col-left')) toCol = 'left'
        else if (classes.includes('dd-col-center')) toCol = 'center'
        else if (classes.includes('dd-col-right')) toCol = 'right'
      }
      setDragOverCol(null)
      if (!toCol || toCol === fromCol) return

      setLayout(prev => {
        const next = { left: [...prev.left], center: [...prev.center], right: [...prev.right] }
        const fromIdx = next[fromCol].indexOf(cardId)
        if (fromIdx === -1) return prev
        next[fromCol].splice(fromIdx, 1)
        next[toCol].push(cardId)
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch {}
        return next
      })
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  function onMouseDown(e, cardId, colId) {
    if (e.button !== 0) return
    const cardEl = e.currentTarget
    const rect = cardEl.getBoundingClientRect()

    activeDrag = {
      cardId,
      fromCol: colId,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    }
    setDraggingCard(cardId)

    ghostEl = cardEl.cloneNode(true)
    ghostEl.className = 'dd-card dd-card-overlay'
    ghostEl.style.position = 'fixed'
    ghostEl.style.width = rect.width + 'px'
    ghostEl.style.left = (e.clientX - activeDrag.offsetX) + 'px'
    ghostEl.style.top = (e.clientY - activeDrag.offsetY) + 'px'
    ghostEl.style.zIndex = '9999'
    ghostEl.style.pointerEvents = 'none'
    document.body.appendChild(ghostEl)
  }

  return (
    <div className="dd-layout">
      {['left', 'center', 'right'].map(colId => (
        <div
          key={colId}
          className={`dd-column dd-col-${colId} ${dragOverCol === colId ? 'dd-column-active' : ''}`}
        >
          <div className="dd-column-inner">
            {layout[colId].map(cardId => (
              <div
                key={cardId}
                className={`dd-card ${draggingCard === cardId ? 'dd-card-dragging' : ''}`}
                onMouseDown={(e) => onMouseDown(e, cardId, colId)}
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
