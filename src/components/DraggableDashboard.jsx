import { useState, useCallback, useRef, useEffect } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

const STORAGE_KEY = 'quali_dashboard_layout'

const DEFAULT_LAYOUT = {
  left: ['master-sheet', 'lead-queue'],
  center: ['leaderboard'],
  right: ['work-tracker', 'todo-list'],
}

function loadLayout() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_LAYOUT }
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
      if (!seen.has(id)) {
        valid.left.push(id)
      }
    }
    return valid
  } catch {
    return { ...DEFAULT_LAYOUT }
  }
}

function findColumnForId(layout, id) {
  for (const [col, ids] of Object.entries(layout)) {
    if (ids.includes(id)) return col
  }
  return null
}

function DroppableColumn({ children, isActive }) {
  return (
    <div className={`dd-column ${isActive ? 'dd-column-active' : ''}`}>
      {children}
    </div>
  )
}

function DraggableCard({ id, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    zIndex: isDragging ? 999 : 'auto',
    cursor: 'grab',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`dd-card ${isDragging ? 'dd-card-dragging' : ''}`}
      {...attributes}
      {...listeners}
    >
      {children}
    </div>
  )
}

export default function DraggableDashboard({ cardMap }) {
  const [layout, setLayout] = useState(loadLayout)
  const [activeId, setActiveId] = useState(null)
  const layoutRef = useRef(layout)

  useEffect(() => { layoutRef.current = layout }, [layout])

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(layout)) } catch {}
  }, [layout])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragOver = useCallback((event) => {
    const { active, over } = event
    if (!over) return

    const current = layoutRef.current
    const activeCol = findColumnForId(current, active.id)
    const overCol = findColumnForId(current, over.id)

    if (!activeCol || !overCol || activeCol === overCol) return

    setLayout(prev => {
      const next = { ...prev }
      next[activeCol] = [...prev[activeCol]]
      next[overCol] = [...prev[overCol]]

      const activeIndex = next[activeCol].indexOf(active.id)
      if (activeIndex === -1) return prev
      next[activeCol].splice(activeIndex, 1)

      const overIndex = next[overCol].indexOf(over.id)
      next[overCol].splice(overIndex === -1 ? next[overCol].length : overIndex, 0, active.id)

      return next
    })
  }, [])

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const current = layoutRef.current
    const activeCol = findColumnForId(current, active.id)
    const overCol = findColumnForId(current, over.id)

    if (!activeCol || !overCol || activeCol !== overCol) return

    const oldIndex = current[activeCol].indexOf(active.id)
    const newIndex = current[overCol].indexOf(over.id)

    if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
      setLayout(prev => ({
        ...prev,
        [activeCol]: arrayMove(prev[activeCol], oldIndex, newIndex),
      }))
    }
  }, [])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  const activeCard = activeId ? cardMap[activeId] : null

  const flatIds = [...layout.left, ...layout.center, ...layout.right]

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="landing-main dd-layout">
        {['left', 'center', 'right'].map(colId => {
          const isActive = activeId && layout[colId].includes(activeId)
          return (
            <DroppableColumn key={colId} isActive={isActive}>
              <SortableContext items={layout[colId]} strategy={verticalListSortingStrategy}>
                <div className="dd-column-inner">
                  {layout[colId].map(cardId => (
                    <DraggableCard key={cardId} id={cardId}>
                      {cardMap[cardId]}
                    </DraggableCard>
                  ))}
                </div>
              </SortableContext>
            </DroppableColumn>
          )
        })}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeCard ? (
          <div className="dd-card dd-card-overlay dd-card-dragging">
            {activeCard}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
