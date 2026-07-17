import { useMemo, useRef, useState, useCallback, useEffect } from 'react'

export default function MiniPlayer({ rows, onTag, onSearch, onClose, onNextBatch, onHome, allTagged, hasUnprocessed }) {
  const taggedCount = useMemo(() => rows.filter(r => r.tag).length, [rows])
  const total = rows.length
  const pct = total > 0 ? (taggedCount / total) * 100 : 0

  const [collapsed, setCollapsed] = useState(false)
  const panelRef = useRef(null)
  const dragRef = useRef(null)

  const handleDragStart = useCallback((e) => {
    if (e.button !== 0) return
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    dragRef.current = {
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    }
    const onMove = (ev) => {
      if (!dragRef.current) return
      const x = ev.clientX - dragRef.current.offsetX
      const y = ev.clientY - dragRef.current.offsetY
      panel.style.left = x + 'px'
      panel.style.top = y + 'px'
      panel.style.right = 'auto'
      panel.style.bottom = 'auto'
    }
    const onUp = () => {
      dragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  return (
    <div className={`mini-player ${collapsed ? 'mp-collapsed' : ''}`} ref={panelRef}>
      <div className="mp-drag-handle" onMouseDown={handleDragStart}>
        <span className="mp-title">Lead Review</span>
        <div className="mp-header-right">
          <span className="mp-stats">{taggedCount}/{total}</span>
          <button className="mp-toggle" onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand' : 'Minimize'}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points={collapsed ? '18 15 12 9 6 15' : '6 9 12 15 18 9'} /></svg>
          </button>
          <button className="mp-close" onClick={onClose} title="Close">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {!collapsed && (
        <>
          <div className="mp-list">
            {total === 0 ? (
              <div className="mp-empty">No leads loaded</div>
            ) : (
              rows.map((row) => {
                const tag = row.tag
                return (
                  <div key={row.rowId} className={`mp-row ${tag ? 'tagged' : ''} ${tag || ''}`}>
                    <span
                      className="mp-row-name"
                      onClick={() => onSearch(row)}
                      title={row.searchValue || row.name}
                    >
                      {row.searchValue || row.name || 'Untitled'}
                    </span>
                    <div className="mp-row-actions">
                      <button className={`tag-btn green ${tag === 'green' ? 'active' : ''}`} onClick={() => onTag(row.rowId, 'green')}>G</button>
                      <button className={`tag-btn yellow ${tag === 'yellow' ? 'active' : ''}`} onClick={() => onTag(row.rowId, 'yellow')}>M</button>
                      <button className={`tag-btn red ${tag === 'red' ? 'active' : ''}`} onClick={() => onTag(row.rowId, 'red')}>B</button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
          <div className="mp-footer">
            <div className="mp-progress">
              <div className="mp-progress-bar">
                <div className="mp-progress-fill" style={{ width: `${pct}%` }} />
              </div>
            </div>
            <div className="mp-footer-btns">
              {onNextBatch && (
                <button className={`mp-btn-next ${allTagged && hasUnprocessed ? '' : 'disabled'}`} onClick={onNextBatch} disabled={!allTagged || !hasUnprocessed}>Next</button>
              )}
              {onHome && (
                <button className="mp-btn-home" onClick={onHome}>Home</button>
              )}
            </div>
          </div>
        </>
      )}

      {collapsed && (
        <div className="mp-collapsed-bar">
          <div className="mp-progress">
            <div className="mp-progress-bar">
              <div className="mp-progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
