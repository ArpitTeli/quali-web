import React from 'react'
import { cn } from '../../lib/utils'

export function Table({ className, children, ...props }) {
  return (
    <div className="sh-table-wrapper">
      <table className={cn('sh-table', className)} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ className, children, ...props }) {
  return <thead className={cn('sh-table-header', className)} {...props}>{children}</thead>
}

export function TableBody({ className, children, ...props }) {
  return <tbody className={cn('sh-table-body', className)} {...props}>{children}</tbody>
}

export function TableRow({ className, children, ...props }) {
  return <tr className={cn('sh-table-row', className)} {...props}>{children}</tr>
}

export function TableHead({ className, children, ...props }) {
  return <th className={cn('sh-table-head', className)} {...props}>{children}</th>
}

export function TableCell({ className, children, ...props }) {
  return <td className={cn('sh-table-cell', className)} {...props}>{children}</td>
}
