import React, { useState } from 'react'
import { cn } from '../../lib/utils'

export function Checkbox({ className, checked, onCheckedChange, 'aria-checked': ariaChecked, ...props }) {
  const [internalChecked, setInternalChecked] = useState(checked || false)
  const isMixed = ariaChecked === 'mixed'

  const handleChange = (e) => {
    const next = !isChecked
    setInternalChecked(next)
    if (onCheckedChange) onCheckedChange(next)
  }

  const isChecked = checked !== undefined ? checked : internalChecked

  return (
    <button
      role="checkbox"
      type="button"
      aria-checked={isMixed || isChecked}
      data-checked={isChecked || isMixed ? '' : undefined}
      className={cn('sh-checkbox', isChecked && 'sh-checkbox-checked', isMixed && 'sh-checkbox-mixed', className)}
      onClick={handleChange}
      {...props}
    >
      {(isChecked || isMixed) && (
        <svg viewBox="0 0 16 16" fill="none" className="sh-checkbox-icon">
          {isMixed ? (
            <line x1="4" y1="8" x2="12" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          ) : (
            <polyline points="3.5 8 6.5 11 12.5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          )}
        </svg>
      )}
    </button>
  )
}
