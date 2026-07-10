import React from 'react'
import { cn } from '../../lib/utils'

export function Label({ className, children, ...props }) {
  return (
    <label className={cn('sh-label', className)} {...props}>
      {children}
    </label>
  )
}
