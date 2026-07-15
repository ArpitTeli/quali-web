import React, { useState, useEffect, useCallback, useMemo } from 'react'

let toastId = 0

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const timer = setTimeout(onClose, 4000)
    return () => clearTimeout(timer)
  }, [onClose])

  return (
    <div className={`toast toast-${type}`}>
      <span>{message}</span>
      <button className="toast-close" onClick={onClose}>×</button>
    </div>
  )
}

export function useToast() {
  const [toasts, setToasts] = useState([])

  const addToast = useCallback((message, type = 'info') => {
    const id = ++toastId
    setToasts(prev => {
      const next = Array.isArray(prev) ? prev : []
      return [...next, { id, message, type }]
    })
  }, [])

  const removeToast = useCallback((id) => {
    setToasts(prev => {
      const next = Array.isArray(prev) ? prev : []
      return next.filter(t => t.id !== id)
    })
  }, [])

  const ToastContainer = useMemo(() => {
    return function ToastContainerInner() {
      const safeToasts = Array.isArray(toasts) ? toasts : []
      return (
        <div className="toast-container">
          {safeToasts.map(t => (
            <Toast key={t.id} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
          ))}
        </div>
      )
    }
  }, [toasts, removeToast])

  return { addToast, ToastContainer }
}

export default Toast
