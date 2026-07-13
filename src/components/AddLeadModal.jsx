import React, { useState } from 'react'
import { normalizePhone } from '../services/api'

function AddLeadModal({ onClose, onAdd }) {
  const [form, setForm] = useState({ name: '', website: '', company_phone: '', email: '', query: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const hasAny = Object.values(form).some(v => v.trim())
    if (!hasAny) {
      setError('Fill in at least one field')
      return
    }
    setLoading(true)
    setError('')
    try {
      const result = await onAdd({
        name: form.name.trim(),
        website: form.website.trim(),
        company_phone: normalizePhone(form.company_phone),
        email: form.email.trim(),
        query: form.query.trim()
      })
      if (result.success) {
        onClose()
      } else {
        setError(result.error || 'Failed to add lead')
      }
    } catch (err) {
      setError('Failed to add lead')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="add-lead-overlay" onClick={onClose}>
      <div className="add-lead-modal" onClick={e => e.stopPropagation()}>
        <h3 className="add-lead-title">Add Lead</h3>
        <p className="add-lead-subtitle">All fields optional. At least one required.</p>
        <form onSubmit={handleSubmit}>
          <div className="add-lead-field">
            <label>Name</label>
            <input type="text" placeholder="Company or lead name" value={form.name} onChange={e => handleChange('name', e.target.value)} disabled={loading} />
          </div>
          <div className="add-lead-field">
            <label>Website</label>
            <input type="text" placeholder="https://example.com" value={form.website} onChange={e => handleChange('website', e.target.value)} disabled={loading} />
          </div>
          <div className="add-lead-field">
            <label>Phone</label>
            <input type="text" placeholder="Phone number" value={form.company_phone} onChange={e => handleChange('company_phone', e.target.value)} disabled={loading} />
          </div>
          <div className="add-lead-field">
            <label>Email</label>
            <input type="text" placeholder="contact@example.com" value={form.email} onChange={e => handleChange('email', e.target.value)} disabled={loading} />
          </div>
          <div className="add-lead-field">
            <label>Query</label>
            <input type="text" placeholder="Search query" value={form.query} onChange={e => handleChange('query', e.target.value)} disabled={loading} />
          </div>
          {error && <p className="add-lead-error">{error}</p>}
          <div className="add-lead-actions">
            <button type="button" className="add-lead-cancel" onClick={onClose} disabled={loading}>Cancel</button>
            <button type="submit" className="add-lead-save" disabled={loading}>{loading ? 'Adding...' : 'Add Lead'}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default AddLeadModal
