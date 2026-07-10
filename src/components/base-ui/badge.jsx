import React from 'react'
import { cn } from '../../lib/utils'

const variants = {
  default: 'sh-badge',
  secondary: 'sh-badge sh-badge-secondary',
  destructive: 'sh-badge sh-badge-destructive',
}

export function Badge({ variant = 'default', className, children, ...props }) {
  return (
    <span className={cn(variants[variant], className)} {...props}>
      {children}
    </span>
  )
}
