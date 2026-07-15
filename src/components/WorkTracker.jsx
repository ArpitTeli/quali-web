import { useState, useEffect } from 'react'
import { motion } from 'motion/react'
import { Monitor } from 'lucide-react'
import * as api from '../services/api'

export default function WorkTracker({ onResume, userId }) {
  const [tab, setTab] = useState('all')
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [resuming, setResuming] = useState(null)

  function loadAssignments() {
    if (!userId) return
    setLoading(true)
    api.getFileTree(userId).then(result => {
      if (result.assignments && Array.isArray(result.assignments)) {
        setAssignments(result.assignments)
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => { loadAssignments() }, [userId])

  function handleResume(assignment) {
    setResuming(assignment.assignmentId)
    onResume(assignment).finally(() => setResuming(null))
  }

  const safeAssignments = Array.isArray(assignments) ? assignments : []
  const ongoing = safeAssignments.filter(a => a.status === 'Active' && !a.completedAt)
  const closed = safeAssignments.filter(a => a.status === 'Completed' || a.completedAt)
  const all = safeAssignments
  const current = tab === 'all' ? all : tab === 'ongoing' ? ongoing : closed

  function isOngoing(a) { return a.status === 'Active' && !a.completedAt }

  return (
    <div className="wt-card wt-card-open">
      <div className="wt-header">
        <div className="wt-header-left">
          <div className="wt-icon-box">
            <Monitor size={22} color="#4ade80" />
          </div>
          <div className="wt-header-text">
            <p className="wt-title">Your Work</p>
            <p className="wt-subtitle">
              {ongoing.length > 0 ? `${ongoing.length} ongoing` : 'No active files'}
            </p>
          </div>
        </div>
      </div>

      <div className="wt-body">
        <div className="wt-tabs">
          <button
            className={`wt-tab ${tab === 'all' ? 'wt-tab-active' : ''}`}
            onClick={() => setTab('all')}
          >
            ALL
          </button>
          <button
            className={`wt-tab ${tab === 'ongoing' ? 'wt-tab-active' : ''}`}
            onClick={() => setTab('ongoing')}
          >
            ONGOING
          </button>
          <button
            className={`wt-tab ${tab === 'closed' ? 'wt-tab-active' : ''}`}
            onClick={() => setTab('closed')}
          >
            CLOSED
          </button>
        </div>

        <div className="wt-list">
          {loading ? (
            <div className="wt-empty">Loading...</div>
          ) : current.length === 0 ? (
            <div className="wt-empty">
              {tab === 'all' ? 'No work yet' : tab === 'ongoing' ? 'No ongoing work' : 'No completed files'}
            </div>
          ) : (
            current.map((a, i) => {
              const ongoing = isOngoing(a)
              return (
                <motion.button
                  key={a.assignmentId || i}
                  className={`wt-item ${ongoing ? 'wt-item-clickable' : ''}`}
                  onClick={() => ongoing && handleResume(a)}
                  whileHover={ongoing ? { backgroundColor: 'rgba(255,255,255,0.04)' } : {}}
                  disabled={resuming === a.assignmentId}
                >
                  <span className="wt-dot" style={{ background: ongoing ? '#4ade80' : '#71717a' }} />
                  <span className="wt-item-name">{a.filename || a.fileId?.substring(0, 8) || 'Unknown'}</span>
                  {ongoing ? (
                    <span className="wt-item-progress">
                      {resuming === a.assignmentId ? 'Loading...' :
                        a.totalRows > 0 ? `${a.taggedCount}/${a.totalRows}` : 'New'}
                    </span>
                  ) : (
                    <span className="wt-item-status" style={{ color: '#4ade80' }}>Done</span>
                  )}
                </motion.button>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
