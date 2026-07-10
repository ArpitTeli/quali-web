import React from 'react'
import { cn } from '../../lib/utils'

const variants = {
  default: 'sh-btn-primary',
  secondary: 'sh-btn-secondary',
  ghost: 'sh-btn-ghost',
  destructive: 'sh-btn-destructive',
}

const sizes = {
  default: '',
  sm: 'sh-btn-sm',
  icon: 'sh-btn-icon',
}

export function Button({ variant = 'default', size = 'default', className, children, ...props }) {
  return (
    <button
      className={cn('sh-btn', variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  )
}
