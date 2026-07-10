import React from 'react'

function BottomBar({ batchRows, stats, activeRow, onRowClick, onTag, onNextBatch, onHome, allTagged, hasUnprocessed }) {
  const taggedCount = batchRows.filter(r => r.tag).length

  return (
    <div className="bottom-bar">
      <div className="bottom-bar-left">
        <div className="bottom-bar-info">
          <span className="bottom-bar-title">Lead Review</span>
          <span className="bottom-bar-stats">{stats.processed}/{stats.total} reviewed</span>
        </div>
        <div className="bottom-bar-progress">
          <div className="bottom-bar-progress-bar">
            <div
              className="bottom-bar-progress-fill"
              style={{ width: `${batchRows.length > 0 ? (taggedCount / batchRows.length) * 100 : 0}%` }}
            />
          </div>
          <span className="bottom-bar-progress-text">{taggedCount}/{batchRows.length} tagged</span>
        </div>
      </div>

      <div className="bottom-bar-rows">
        {batchRows.map(row => (
          <div
            key={row.rowId}
            className={`bottom-bar-row ${row.tag ? 'tagged' : ''} ${row.tag || ''} ${activeRow === row.rowId ? 'active' : ''}`}
          >
            <span
              className="bottom-bar-row-name"
              onClick={() => onRowClick(row.rowId)}
              title={row.searchValue}
            >
              {row.searchValue || 'No data'}
            </span>
            <div className="bottom-bar-row-actions">
              <button
                className={`tag-btn green ${row.tag === 'green' ? 'active' : ''}`}
                onClick={() => onTag(row.rowId, 'green')}
              >
                Good
              </button>
              <button
                className={`tag-btn yellow ${row.tag === 'yellow' ? 'active' : ''}`}
                onClick={() => onTag(row.rowId, 'yellow')}
              >
                Maybe
              </button>
              <button
                className={`tag-btn red ${row.tag === 'red' ? 'active' : ''}`}
                onClick={() => onTag(row.rowId, 'red')}
              >
                Bad
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="bottom-bar-actions">
        <button
          className="btn btn-primary btn-sm"
          onClick={onNextBatch}
          disabled={!allTagged || !hasUnprocessed}
        >
          Next Batch
        </button>
        <button className="btn btn-secondary btn-sm" onClick={onHome}>
          Home
        </button>
      </div>
    </div>
  )
}

export default BottomBar
