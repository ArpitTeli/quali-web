import { useState, useCallback } from 'react'
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

const COLUMN_LABELS = {
  left: '',
  center: '',
  right: '',
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

function saveLayout(layout) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(layout))
  } catch { /* ignore */ }
}

function DroppableColumn({ id, children, isActive }) {
  return (
    <div className={`dd-column ${isActive ? 'dd-column-active' : ''}`}>
      {children}
    </div>
  )
}

function DraggableCard({ id, children, isOverlay }) {
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
      className={`dd-card ${isDragging ? 'dd-card-dragging' : ''} ${isOverlay ? 'dd-card-overlay' : ''}`}
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  )

  const findColumn = useCallback((id) => {
    for (const [col, ids] of Object.entries(layout)) {
      if (ids.includes(id)) return col
    }
    return null
  }, [layout])

  const handleDragStart = useCallback((event) => {
    setActiveId(event.active.id)
  }, [])

  const handleDragOver = useCallback((event) => {
    const { active, over } = event
    if (!over) return

    const activeCol = findColumn(active.id)
    const overCol = findColumn(over.id)

    if (!activeCol || !overCol || activeCol === overCol) return

    setLayout(prev => {
      const next = { ...prev }
      next[activeCol] = [...prev[activeCol]]
      next[overCol] = [...prev[overCol]]

      const activeIndex = next[activeCol].indexOf(active.id)
      next[activeCol].splice(activeIndex, 1)

      const overIndex = next[overCol].indexOf(over.id)
      next[overCol].splice(overIndex, 0, active.id)

      return next
    })
  }, [findColumn])

  const handleDragEnd = useCallback((event) => {
    const { active, over } = event
    setActiveId(null)

    if (!over) return

    const activeCol = findColumn(active.id)
    const overCol = findColumn(over.id)

    if (!activeCol || !overCol) return

    if (activeCol === overCol) {
      const oldIndex = layout[activeCol].indexOf(active.id)
      const newIndex = layout[overCol].indexOf(over.id)

      if (oldIndex !== newIndex) {
        setLayout(prev => ({
          ...prev,
          [activeCol]: arrayMove(prev[activeCol], oldIndex, newIndex),
        }))
      }
    }
  }, [findColumn, layout])

  const handleDragEndPersist = useCallback((event) => {
    handleDragEnd(event)
    setTimeout(() => {
      setLayout(prev => {
        saveLayout(prev)
        return prev
      })
    }, 0)
  }, [handleDragEnd])

  const handleDragCancel = useCallback(() => {
    setActiveId(null)
  }, [])

  const activeCard = activeId ? cardMap[activeId] : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEndPersist}
      onDragCancel={handleDragCancel}
    >
      <div className="landing-main dd-layout">
        {['left', 'center', 'right'].map(colId => {
          const isActive = activeId && layout[colId].includes(activeId)
          return (
            <DroppableColumn key={colId} id={colId} isActive={isActive}>
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
