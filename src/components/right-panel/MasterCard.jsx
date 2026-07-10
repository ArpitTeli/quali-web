import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { ChevronUp } from 'lucide-react'

const DataRow = ({ icon, label, children }) => (
  <div className="mc-row">
    <div className="mc-row-left">
      {icon}
      <span className="mc-row-label">{label}</span>
    </div>
    <div className="mc-row-right">{children}</div>
  </div>
)

export default function MasterCard({
  icon,
  title,
  stats,
  actions,
  miniGraph,
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const springConfig = { type: 'spring', stiffness: 300, damping: 30 }

  return (
    <motion.div
      layout
      transition={springConfig}
      className="mc-card"
    >
      <div className="mc-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="mc-header-left">
          <div className="mc-icon">{icon}</div>
          <span className="mc-title">{title}</span>
        </div>
        <div className="mc-header-right">
          {miniGraph && (
            <div className="mc-graph">
              <svg viewBox="0 0 80 20" fill="none" className="mc-graph-svg">
                <path
                  d={miniGraph}
                  stroke="#4ade80"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          )}
          <motion.div
            animate={{ rotate: isExpanded ? 0 : 180 }}
            className="mc-chevron"
          >
            <ChevronUp size={20} />
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springConfig}
            className="mc-body"
          >
            <div className="mc-body-inner">
              {stats.map((row, i) => (
                <DataRow key={i} icon={row.icon} label={row.label}>
                  {row.value}
                </DataRow>
              ))}
              {actions && (
                <div className="mc-actions">
                  {actions}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
