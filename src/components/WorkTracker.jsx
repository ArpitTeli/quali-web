import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Monitor } from 'lucide-react'
import * as api from '../services/api'

export default function WorkTracker({ userId }) {
  const [tab, setTab] = useState('ongoing')
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

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

  useEffect(() => {
    if (open) loadAssignments()
  }, [open, userId])

  const safeAssignments = Array.isArray(assignments) ? assignments : []
  const ongoing = safeAssignments.filter(a => a.status === 'Active' && !a.completedAt)
  const closed = safeAssignments.filter(a => a.status === 'Completed' || a.completedAt)
  const current = tab === 'ongoing' ? ongoing : closed

  return (
    <motion.div layout className="wt-card">
      <motion.button onClick={() => setOpen(!open)} className="wt-header">
        <div className="wt-header-left">
          <motion.div
            animate={{ width: open ? 40 : 52, height: open ? 40 : 52 }}
            className="wt-icon-box"
          >
            <motion.div animate={{ scale: open ? 0.7 : 1 }}>
              <Monitor size={22} color="#4ade80" />
            </motion.div>
          </motion.div>
          <div className="wt-header-text">
            <motion.p layout className="wt-title">Your Work</motion.p>
            <AnimatePresence mode="popLayout" initial={false}>
              {!open && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="wt-subtitle"
                >
                  {ongoing.length > 0 ? `${ongoing.length} ongoing` : 'No active files'}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>
        <motion.div animate={{ rotate: open ? 180 : 0 }} className="wt-chevron">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="18 15 12 9 6 15" /></svg>
        </motion.div>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="wt-body"
          >
            <div className="wt-tabs">
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
                  {tab === 'ongoing' ? 'No ongoing work' : 'No completed files'}
                </div>
              ) : (
                current.map((a, i) => (
                  <div
                    key={a.assignmentId || i}
                    className="wt-item"
                  >
                    <span className="wt-dot" style={{ background: tab === 'ongoing' ? '#4ade80' : '#71717a' }} />
                    <span className="wt-item-name">{a.filename || a.fileId?.substring(0, 8) || 'Unknown'}</span>
                    {tab === 'ongoing' && (
                      <span className="wt-item-status">Active</span>
                    )}
                    {tab === 'closed' && (
                      <span className="wt-item-status" style={{ color: '#4ade80' }}>Done</span>
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
