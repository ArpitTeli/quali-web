import { useRef, useEffect } from 'react'
import UserAvatar from './UserAvatar'

const BACKGROUNDS = [
  { id: 'sunset', label: 'Sunset', thumbnail: '/assets/dashboard-bg.jpg' },
  { id: 'ocean', label: 'Ocean', thumbnail: '/assets/dashboard-ocean.jpg' },
  { id: 'forest', label: 'Forest', thumbnail: '/assets/dashboard-forest.jpg' },
  { id: 'dark', label: 'Dark', thumbnail: null },
  { id: 'custom', label: 'Custom', thumbnail: null },
]

export default function SettingsDropdown({
  settings,
  onSettingsChange,
  onLogout,
  onClose,
  anchorRef,
  customBgPreview,
}) {
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target) && anchorRef.current && !anchorRef.current.contains(e.target)) {
        onClose()
      }
    }
    function handleEsc(e) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEsc)
    }
  }, [onClose, anchorRef])

  function handleBgSelect(id) {
    if (id === 'custom') {
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = 'image/*'
      input.onchange = (e) => {
        const file = e.target.files[0]
        if (!file) return
        const reader = new FileReader()
        reader.onload = (ev) => {
          const base64 = ev.target.result
          try { localStorage.setItem('quali_custom_bg', base64) } catch {}
          onSettingsChange({ ...settings, background: 'custom' })
        }
        reader.readAsDataURL(file)
      }
      input.click()
      return
    }
    onSettingsChange({ ...settings, background: id })
  }

  function handleGlassToggle() {
    onSettingsChange({ ...settings, glassmorphic: !settings.glassmorphic })
  }

  return (
    <div className="settings-dropdown" ref={ref}>
      <div className="sd-header">
        <UserAvatar name={settings._userName || ''} size={40} />
        <div className="sd-header-info">
          <span className="sd-header-name">{settings._userName}</span>
          <span className="sd-header-sub">Settings</span>
        </div>
      </div>

      <div className="sd-section">
        <span className="sd-section-label">Background</span>
        <div className="sd-bg-grid">
          {BACKGROUNDS.map(bg => {
            const isActive = settings.background === bg.id
            const thumb = bg.id === 'custom' && customBgPreview
              ? customBgPreview
              : bg.thumbnail
            return (
              <button
                key={bg.id}
                className={`sd-bg-thumb ${isActive ? 'sd-bg-active' : ''}`}
                onClick={() => handleBgSelect(bg.id)}
                title={bg.label}
              >
                {thumb ? (
                  <img src={thumb} alt={bg.label} className="sd-bg-img" />
                ) : bg.id === 'dark' ? (
                  <div className="sd-bg-dark" />
                ) : (
                  <div className="sd-bg-upload">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <span>Upload</span>
                  </div>
                )}
                <span className="sd-bg-label">{bg.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="sd-section">
        <div className="sd-toggle-row">
          <span className="sd-section-label">Glassmorphic Effect</span>
          <button
            className={`sd-toggle ${settings.glassmorphic ? 'sd-toggle-on' : ''}`}
            onClick={handleGlassToggle}
          >
            <div className="sd-toggle-knob" />
          </button>
        </div>
      </div>

      <div className="sd-divider" />

      <button className="sd-logout-btn" onClick={onLogout}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        Logout
      </button>
    </div>
  )
}
