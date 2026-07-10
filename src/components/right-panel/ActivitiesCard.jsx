import { useState, useEffect } from 'react'
import { motion, AnimatePresence, MotionConfig } from 'motion/react'
import { ChevronUpIcon } from 'lucide-react'

function formatTimeAgo(isoString) {
  if (!isoString) return ''
  const now = new Date()
  const then = new Date(isoString)
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  const diffHrs = Math.floor(diffMins / 60)
  if (diffHrs < 24) return `${diffHrs}h ago`
  const diffDays = Math.floor(diffHrs / 24)
  return `${diffDays}d ago`
}

function getActivityIcon(type) {
  switch (type) {
    case 'push': return '📤'
    case 'discard': return '🗑️'
    case 'tag': return '🏷️'
    case 'file': return '📁'
    case 'batch': return '⚡'
    default: return '📋'
  }
}

function ActivityItem({ type, title, desc, time }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className="act-item"
    >
      <div className="act-item-icon">{getActivityIcon(type)}</div>
      <div className="act-item-info">
        <p className="act-item-title">{title}</p>
        <p className="act-item-desc">{desc}</p>
      </div>
      <span className="act-item-time">{formatTimeAgo(time)}</span>
    </motion.div>
  )
}

export default function ActivitiesCard({ headerIcon, title, subtitle, activities = [] }) {
  const [open, setOpen] = useState(false)
  const count = activities.length

  return (
    <MotionConfig transition={{ type: 'spring', bounce: 0, duration: 0.6 }}>
      <motion.div layout className="act-card">
        <motion.button onClick={() => setOpen(!open)} className="act-card-header">
          <div className="act-card-header-left">
            <motion.div
              animate={{ width: open ? 40 : 52, height: open ? 40 : 52 }}
              className="act-card-icon-box"
            >
              <motion.div animate={{ scale: open ? 0.7 : 1 }}>
                {headerIcon}
              </motion.div>
            </motion.div>
            <div className="act-card-header-text">
              <motion.p layout className="act-card-title">{title}</motion.p>
              <AnimatePresence mode="popLayout" initial={false}>
                {!open && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeOut' }}
                    className="act-card-subtitle"
                  >
                    {count > 0 ? `${count} event${count === 1 ? '' : 's'}` : subtitle}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>
          </div>
          <motion.div animate={{ rotate: open ? 180 : 0 }} className="act-card-chevron">
            <ChevronUpIcon size={18} color="#fff" />
          </motion.div>
        </motion.button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="act-card-body"
            >
              <div className="act-card-list">
                {activities.length > 0 ? activities.map((item, i) => (
                  <ActivityItem key={i} {...item} />
                )) : (
                  <div className="act-item" style={{ justifyContent: 'center', opacity: 0.5 }}>
                    <p className="act-item-desc">No activity yet</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </MotionConfig>
  )
}
