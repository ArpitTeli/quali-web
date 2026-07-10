import React from 'react'
import { cn } from '../../lib/utils'

export function Avatar({ className, children, ...props }) {
  return (
    <div className={cn('sh-avatar', className)} {...props}>
      {children}
    </div>
  )
}

export function AvatarImage({ className, src, alt, ...props }) {
  return (
    <img className={cn('sh-avatar-image', className)} src={src} alt={alt} {...props} />
  )
}

export function AvatarFallback({ className, children, ...props }) {
  return (
    <div className={cn('sh-avatar-fallback', className)} {...props}>
      {children}
    </div>
  )
}
