import { useMemo, useRef, useState, useCallback, useEffect } from 'react'
import { createRoot } from 'react-dom/client'

function MiniPlayerContent({ rows, onTag, onSearch, onClose, onNextBatch, onHome, onPopOut, collapsed, setCollapsed, panelRef, handleDragStart }) {
  const taggedCount = useMemo(() => rows.filter(r => r.tag).length, [rows])
  const total = rows.length
  const pct = total > 0 ? (taggedCount / total) * 100 : 0

  return (
    <div className={`mini-player ${collapsed ? 'mp-collapsed' : ''}`} ref={panelRef}>
      <div className="mp-drag-handle" onMouseDown={handleDragStart}>
        <span className="mp-title">Lead Review</span>
        <div className="mp-header-right">
          <span className="mp-stats">{taggedCount}/{total}</span>
          <button className="mp-pip" onClick={onPopOut} title="Pop out to floating window">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
          </button>
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
                    <span className="mp-row-name" onClick={() => onSearch(row)} title={row.searchValue || row.name}>
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
                <button className={`mp-btn-next ${rows.every(r => r.tag) && rows.some(r => r.status === 'unprocessed') ? '' : 'disabled'}`} onClick={onNextBatch} disabled={!rows.every(r => r.tag) || !rows.some(r => r.status === 'unprocessed')}>Next</button>
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

export default function MiniPlayer({ rows, onTag, onSearch, onClose, onNextBatch, onHome }) {
  const [collapsed, setCollapsed] = useState(false)
  const [pipWindow, setPipWindow] = useState(null)
  const pipRootRef = useRef(null)
  const panelRef = useRef(null)
  const dragRef = useRef(null)

  const handleDragStart = useCallback((e) => {
    if (e.button !== 0) return
    const panel = panelRef.current
    if (!panel) return
    const rect = panel.getBoundingClientRect()
    dragRef.current = { offsetX: e.clientX - rect.left, offsetY: e.clientY - rect.top }
    const onMove = (ev) => {
      if (!dragRef.current) return
      panel.style.left = (ev.clientX - dragRef.current.offsetX) + 'px'
      panel.style.top = (ev.clientY - dragRef.current.offsetY) + 'px'
      panel.style.right = 'auto'
      panel.style.bottom = 'auto'
    }
    const onUp = () => { dragRef.current = null; window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp) }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }, [])

  const cleanup = useCallback(() => {
    if (pipRootRef.current) {
      try { pipRootRef.current.render(null) } catch {}
      pipRootRef.current = null
    }
    if (pipWindow) { try { pipWindow.close() } catch {} }
    setPipWindow(null)
  }, [pipWindow])

  const popOut = useCallback(async () => {
    if (pipWindow || !window.documentPictureInPicture) return
    try {
      const pw = await window.documentPictureInPicture.requestWindow({ width: 320, height: 500 })
      pw.addEventListener('pagehide', () => { pipRootRef.current = null; setPipWindow(null) })

      let css = ''
      for (const sheet of document.styleSheets) {
        try { for (const rule of sheet.cssRules) css += rule.cssText + '\n' } catch {}
      }
      const style = pw.document.createElement('style')
      style.textContent = css
      pw.document.head.appendChild(style)

      pw.document.body.style.margin = '0'
      pw.document.body.style.padding = '0'
      pw.document.body.style.background = '#141414'
      pw.document.body.style.overflow = 'hidden'
      pw.document.body.style.fontFamily = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"

      const container = pw.document.createElement('div')
      pw.document.body.appendChild(container)

      const root = createRoot(container)
      pipRootRef.current = root
      setPipWindow(pw)
    } catch (err) {
      console.warn('Document PiP failed:', err)
    }
  }, [pipWindow])

  useEffect(() => () => { if (pipRootRef.current) { try { pipRootRef.current.render(null) } catch {} }; if (pipWindow) try { pipWindow.close() } catch {} }, [pipWindow])
  useEffect(() => { if (!rows || rows.length === 0) cleanup() }, [rows, cleanup])

  const handleClose = useCallback(() => { cleanup(); onClose() }, [cleanup, onClose])
  const handleNextBatch = useCallback(() => { cleanup(); onNextBatch?.() }, [cleanup, onNextBatch])
  const handleHome = useCallback(() => { cleanup(); onHome?.() }, [cleanup, onHome])

  useEffect(() => {
    if (!pipWindow || !pipRootRef.current) return
    pipRootRef.current.render(
      <MiniPlayerContent
        rows={rows}
        onTag={onTag}
        onSearch={onSearch}
        onClose={handleClose}
        onNextBatch={handleNextBatch}
        onHome={handleHome}
        onPopOut={() => {}}
        collapsed={false}
        setCollapsed={() => {}}
        panelRef={null}
        handleDragStart={() => {}}
      />
    )
  })

  return !pipWindow ? (
    <MiniPlayerContent
      rows={rows}
      onTag={onTag}
      onSearch={onSearch}
      onClose={handleClose}
      onNextBatch={handleNextBatch}
      onHome={handleHome}
      onPopOut={popOut}
      collapsed={collapsed}
      setCollapsed={setCollapsed}
      panelRef={panelRef}
      handleDragStart={handleDragStart}
    />
  ) : null
}
