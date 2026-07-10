import React from 'react'
import { cn } from '../../lib/utils'

export function Select({ value, onValueChange, children, className }) {
  const items = []
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return
    if (child.type === SelectContent) {
      React.Children.forEach(child.props.children, (item) => {
        if (React.isValidElement(item) && item.type === SelectItem) {
          items.push({ value: item.props.value, label: item.props.children })
        }
      })
    }
  })

  return (
    <select
      className={cn('sh-select-native', className)}
      value={value}
      onChange={(e) => onValueChange && onValueChange(e.target.value)}
    >
      {items.map((item) => (
        <option key={item.value} value={item.value}>{item.label}</option>
      ))}
    </select>
  )
}

export function SelectTrigger({ className, children, ...props }) {
  return null
}

export function SelectValue({ children, value }) {
  return null
}

export function SelectContent({ children, ...props }) {
  return null
}

export function SelectItem({ value, children, ...props }) {
  return null
}
