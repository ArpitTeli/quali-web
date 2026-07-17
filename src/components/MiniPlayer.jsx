import { useMemo } from 'react'

export default function MiniPlayer({ rows, onTag, onSearch, onClose, onNextBatch, onHome, allTagged, hasUnprocessed }) {
  const taggedCount = useMemo(() => rows.filter(r => r.tag).length, [rows])
  const total = rows.length
  const pct = total > 0 ? (taggedCount / total) * 100 : 0

  return (
    <div className="mini-player">
      <div className="mp-header">
        <div className="mp-header-left">
          <span className="mp-title">Lead Review</span>
          <span className="mp-stats">{taggedCount}/{total}</span>
        </div>
        <button className="mp-close" onClick={onClose} title="Close mini player">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>

      <div className="mp-list">
        {total === 0 ? (
          <div className="mp-empty">No leads loaded</div>
        ) : (
          rows.map((row) => {
            const tag = row.tag
            const rowClass = `mp-row ${tag ? 'tagged' : ''} ${tag || ''}`
            return (
              <div key={row.rowId} className={rowClass}>
                <span
                  className="mp-row-name"
                  onClick={() => onSearch(row)}
                  title={row.searchValue || row.name}
                >
                  {row.searchValue || row.name || 'Untitled'}
                </span>
                <div className="mp-row-actions">
                  <button
                    className={`tag-btn green ${tag === 'green' ? 'active' : ''}`}
                    onClick={() => onTag(row.rowId, 'green')}
                  >Good</button>
                  <button
                    className={`tag-btn yellow ${tag === 'yellow' ? 'active' : ''}`}
                    onClick={() => onTag(row.rowId, 'yellow')}
                  >Maybe</button>
                  <button
                    className={`tag-btn red ${tag === 'red' ? 'active' : ''}`}
                    onClick={() => onTag(row.rowId, 'red')}
                  >Bad</button>
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
          <span className="mp-progress-text">{taggedCount}/{total} tagged</span>
        </div>
        {onNextBatch && (
          <button
            className={`mp-btn-next ${allTagged && hasUnprocessed ? '' : 'disabled'}`}
            onClick={onNextBatch}
            disabled={!allTagged || !hasUnprocessed}
          >Next Batch</button>
        )}
        {onHome && (
          <button className="mp-btn-home" onClick={onHome}>Home</button>
        )}
      </div>
    </div>
  )
}
