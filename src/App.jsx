import React, { useState, useEffect, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import FilePicker from './components/FilePicker'
import SetupView from './components/SetupView'
import LoginView from './components/LoginView'
import BottomBar from './components/BottomBar'
import { useToast } from './components/Toast'
import ActivitiesCard from './components/right-panel/ActivitiesCard'
import TodoList from './components/right-panel/TodoList'
import MasterCard from './components/right-panel/MasterCard'
import CompetitionWidget from './components/right-panel/CompetitionWidget'
import AddLeadModal from './components/AddLeadModal'
import { FaBell } from 'react-icons/fa'
import { X, FileText, BarChart3, CheckCircle, AlertCircle, XCircle, Globe, Upload, Clock, Users } from 'lucide-react'
import * as api from './services/api'
import { normalizePhone } from './services/api'
import * as storage from './services/storage'
import { detectColumns, mapRowData } from './lib/excel'

let rowIdCounter = 0

function App() {
  const { addToast, ToastContainer } = useToast()
  const [view, setView] = useState('landing')
  const [auth, setAuth] = useState({ loggedIn: false, displayName: '', uid: '', masterSheetId: '' })
  const [authLoading, setAuthLoading] = useState(true)

  const [excelData, setExcelData] = useState(null)
  const [columnMapping, setColumnMapping] = useState({})
  const [batchSize, setBatchSize] = useState(20)
  const [rowCount, setRowCount] = useState(0)
  const [isAdditional, setIsAdditional] = useState(false)

  const allRowsRef = useRef([])
  const [allRows, setAllRows] = useState([])
  const excelDataRef = useRef(null)
  const [batchRows, setBatchRows] = useState([])
  const [stats, setStats] = useState({ total: 0, processed: 0, remaining: 0, inBatch: 0 })
  const [activeTab, setActiveTab] = useState(null)
  const [isComplete, setIsComplete] = useState(false)
  const [cloudMasterFiltered, setCloudMasterFiltered] = useState(0)

  const [masterRows, setMasterRows] = useState([])
  const [masterLoading, setMasterLoading] = useState(false)
  const [masterStats, setMasterStats] = useState({ totalLeads: 0, good: 0, maybe: 0, bad: 0, lastModified: null })
  const [pushCounts, setPushCounts] = useState({})
  const [activities, setActivities] = useState([])
  const [pushedByName, setPushedByName] = useState(storage.getPushedByName())
  const [scriptUrl, setScriptUrl] = useState(storage.getScriptUrl())
  const [scriptUrlInput, setScriptUrlInput] = useState(storage.getScriptUrl())
  const [showAddLead, setShowAddLead] = useState(false)
  const [selectedCommentRow, setSelectedCommentRow] = useState(null)
  const [commentText, setCommentText] = useState('')
  const commentTimerRef = useRef(null)
  const [cloudMasterData, setCloudMasterData] = useState({ names: new Set(), phones: new Set() })
  const [selectedLead, setSelectedLead] = useState(null)

  useEffect(() => {
    allRowsRef.current = allRows
  }, [allRows])

  useEffect(() => {
    const checkAuth = async () => {
      const session = storage.getSession()
      if (session && session.loggedIn) {
        setAuth(session)
        setPushedByName(session.displayName || storage.getPushedByName())
      }
      setAuthLoading(false)
    }
    checkAuth()
  }, [])

  useEffect(() => {
    if (!auth.loggedIn) return
    const loadCloudMaster = async () => {
      try {
        const result = await api.fetchCloudMaster()
        if (result.taggedLeads) {
          const names = new Set(result.taggedLeads.map(l => (l.name || '').toLowerCase().trim()))
          const phones = new Set(result.taggedLeads.map(l => normalizePhone(l.phone)).filter(Boolean))
          setCloudMasterData({ names, phones })
        }
      } catch (e) { /* ignore */ }
    }
    loadCloudMaster()
  }, [auth.loggedIn])

  useEffect(() => {
    if (view === 'landing' && auth.loggedIn) {
      const refresh = async () => {
        try {
          const pc = await api.getLeaderboard()
          if (pc && pc.pushCounts) setPushCounts(pc.pushCounts)
        } catch (e) { /* ignore */ }
        if (auth.masterSheetId) {
          try {
            const stats = await api.getMasterStats(auth.masterSheetId)
            if (stats && stats.error) {
              console.warn('Master stats error:', stats.error)
            } else if (stats && stats.totalLeads !== undefined) {
              setMasterStats(stats)
            }
          } catch (e) { /* ignore */ }
        }
        setActivities(storage.getActivities())
      }
      refresh()
    }
  }, [view, auth.loggedIn, auth.masterSheetId])

  const handleLogin = useCallback(async ({ uid, password }) => {
    const result = await api.login(uid, password)
    if (result.success) {
      const session = { loggedIn: true, displayName: result.displayName, uid, masterSheetId: result.masterSheetId || '' }
      setAuth(session)
      setPushedByName(result.displayName)
      storage.saveSession(session)
      storage.savePushedByName(result.displayName)
    }
    return result
  }, [])

  const handleLogout = useCallback(() => {
    storage.clearSession()
    setAuth({ loggedIn: false, displayName: '', uid: '', masterSheetId: '' })
    setPushedByName('')
    setView('landing')
  }, [])

  const handleFileLoad = useCallback((data) => {
    setExcelData(data.data)
    excelDataRef.current = data.data
    setColumnMapping(data.columnMapping)
    setRowCount(data.rowCount || 0)
    setIsAdditional(false)
    setView('setup')
  }, [])

  const handleSetupComplete = useCallback(async (setupData) => {
    try {
      setColumnMapping(setupData.columnMapping)
      setBatchSize(setupData.batchSize)

      const currentExcelData = excelDataRef.current
      console.log('[SetupComplete]', { sheetName: setupData.sheetName, hasExcelData: !!currentExcelData, batchSize: setupData.batchSize })
      if (!currentExcelData) {
        addToast('No file loaded — try uploading again', 'error')
        return
      }

      const sheet = currentExcelData.sheets[setupData.sheetName]
      console.log('[SetupComplete]', { hasSheet: !!sheet, sheetKeys: Object.keys(currentExcelData.sheets) })
      if (!sheet) {
        addToast('Failed to load sheet data', 'error')
        return
      }

      const mapping = setupData.columnMapping
      console.log('[SetupComplete]', { mapping, dataCount: sheet.data.length })
      const newRows = sheet.data.map((r) => {
        const mapped = mapRowData(r, mapping)
        return {
          ...mapped,
          company_phone: normalizePhone(mapped.company_phone),
          searchValue: mapped.name || '',
          rowId: `row-${++rowIdCounter}`,
          tag: null,
          status: 'unprocessed'
        }
      })

      let rows = newRows
      let skippedByCloud = 0
      if (cloudMasterData.names.size > 0 || cloudMasterData.phones.size > 0) {
        const before = rows.length
        rows = rows.filter(r => {
          const name = (r.name || '').toLowerCase().trim()
          const phone = normalizePhone(r.company_phone)
          if (name && cloudMasterData.names.has(name)) return false
          if (phone && cloudMasterData.phones.has(phone)) return false
          return true
        })
        skippedByCloud = before - rows.length
      }

      if (skippedByCloud > 0) {
        setCloudMasterFiltered(skippedByCloud)
        addToast(`${skippedByCloud} lead(s) skipped — already tagged by others`, 'info')
      } else {
        setCloudMasterFiltered(0)
      }

      const existingRows = isAdditional ? allRowsRef.current : []
      const combinedRows = [...existingRows, ...rows]
      const batchSlice = combinedRows.filter(r => r.status === 'unprocessed').slice(0, setupData.batchSize)
      const batchIds = new Set(batchSlice.map(r => r.rowId))
      const updatedAllRows = combinedRows.map(r => batchIds.has(r.rowId) ? { ...r, status: 'in_batch' } : r)

      setAllRows(updatedAllRows)
      allRowsRef.current = updatedAllRows

      const processed = updatedAllRows.filter(r => r.status === 'processed' || r.tag).length
      const remaining = updatedAllRows.filter(r => r.status === 'unprocessed').length

      setStats({
        total: updatedAllRows.length,
        processed,
        remaining,
        inBatch: batchSlice.length
      })
      setBatchRows(batchSlice)
      setIsComplete(remaining === 0)

      if (batchSlice.length > 0) {
        setActiveTab(batchSlice[0].rowId)
        setSelectedLead(batchSlice[0])
      }

      setView('batch')

      const act = [...storage.getActivities(), {
        type: 'file',
        title: 'File loaded',
        desc: `${setupData.sheetName} — ${rows.length} leads`,
        time: new Date().toISOString()
      }]
      storage.saveActivities(act)
      setActivities(act)

      addToast(`Loaded ${rows.length} leads${skippedByCloud > 0 ? ` (${skippedByCloud} skipped)` : ''}`, 'success')
    } catch (err) {
      console.error('Setup failed:', err)
      addToast('Setup failed: ' + (err.message || err), 'error')
    }
  }, [isAdditional, cloudMasterData, addToast])

  const handleTag = useCallback(async (rowId, tag) => {
    const row = allRowsRef.current.find(r => r.rowId === rowId)

    const updatedAll = allRowsRef.current.map(r => r.rowId === rowId ? { ...r, tag, status: 'processed' } : r)
    setAllRows(updatedAll)
    allRowsRef.current = updatedAll

    setBatchRows(prev => prev.map(r => r.rowId === rowId ? { ...r, tag, status: 'processed' } : r))

    if (row) {
      try {
        await api.addTag({
          name: row.name || '',
          phone: normalizePhone(row.company_phone),
          taggedBy: auth.displayName || auth.uid,
          tag
        })
      } catch (e) { /* fire and forget */ }

      if (auth.masterSheetId) {
        try {
          await api.addMasterLead(auth.masterSheetId, {
            query: row.query || '',
            name: row.name || '',
            website: row.website || '',
            company_phone: normalizePhone(row.company_phone),
            email: row.email || '',
            'Lead Status': tag === 'green' ? 'Good' : tag === 'yellow' ? 'Maybe' : tag === 'red' ? 'Bad' : '',
            Comments: ''
          })
        } catch (e) { /* fire and forget */ }
      }

      setCloudMasterData(prev => {
        const names = new Set(prev.names)
        const phones = new Set(prev.phones)
        if (row.name) names.add(row.name.toLowerCase().trim())
        const phone = normalizePhone(row.company_phone)
        if (phone) phones.add(phone)
        return { names, phones }
      })
    }

    setStats(prev => {
      const newProcessed = prev.processed + 1
      const newRemaining = prev.remaining - 1
      const newInBatch = prev.inBatch - 1
      const totalDone = newProcessed
      const totalRows = prev.total
      if (totalDone >= totalRows) {
        setTimeout(() => setIsComplete(true), 300)
      }
      return {
        ...prev,
        processed: newProcessed,
        remaining: newRemaining,
        inBatch: newInBatch
      }
    })
  }, [auth])

  const handleNextBatch = useCallback(() => {
    const current = allRowsRef.current
    const remaining = current.filter(r => r.status === 'unprocessed')
    const batch = remaining.slice(0, batchSize)
    const batchIds = new Set(batch.map(r => r.rowId))
    const updated = current.map(r => batchIds.has(r.rowId) ? { ...r, status: 'in_batch' } : r)

    setAllRows(updated)
    allRowsRef.current = updated
    setBatchRows(batch)
    setStats(s => ({
      ...s,
      remaining: remaining.length,
      inBatch: batch.length
    }))

    if (batch.length > 0) {
      setActiveTab(batch[0].rowId)
      setSelectedLead(batch[0])
    } else {
      setIsComplete(true)
    }
  }, [batchSize])

  const handleGoHome = useCallback(() => {
    setView('landing')
    setExcelData(null)
    excelDataRef.current = null
    setColumnMapping({})
    setBatchSize(20)
    setStats({ total: 0, processed: 0, remaining: 0, inBatch: 0 })
    setBatchRows([])
    setAllRows([])
    allRowsRef.current = []
    setActiveTab(null)
    setSelectedLead(null)
    setIsComplete(false)
    setIsAdditional(false)
    setCloudMasterFiltered(0)
  }, [])

  const handleOpenMasterViewer = useCallback(async () => {
    setMasterLoading(true)
    setView('master')
    if (!auth.masterSheetId) {
      addToast('No master sheet linked. Please logout and login again to auto-create one.', 'error')
      setMasterLoading(false)
      return
    }
    try {
      const result = await api.readMasterSheet(auth.masterSheetId)
      if (result.error) {
        addToast('Master sheet error: ' + result.error, 'error')
      } else if (result.rows) {
        setMasterRows(result.rows.map(r => ({
          ...r,
          company_phone: normalizePhone(r.company_phone)
        })))
      }
    } catch (e) {
      addToast('Failed to read master sheet — check Apps Script deployment', 'error')
    }
    setMasterLoading(false)
  }, [auth, addToast])

  const handleDiscard = useCallback(async (row) => {
    if (!auth.masterSheetId) {
      addToast('No master sheet linked', 'error')
      return
    }
    try {
      const rowKey = { name: row.name || '', website: row.website || '' }
      console.log('[Discard]', { sheetId: auth.masterSheetId, rowKey })
      const result = await api.discardMasterRow(auth.masterSheetId, rowKey)
      console.log('[Discard] result:', result)
      if (result.error) {
        addToast('Discard failed: ' + result.error, 'error')
        return
      }
      setMasterRows(prev => prev.filter(r => !(r.name === row.name && r.website === row.website)))
      addToast('Lead discarded', 'info')
    } catch (e) {
      console.error('[Discard] exception:', e)
      addToast('Discard failed — ' + (e.message || 'network error'), 'error')
    }
  }, [auth, addToast])

  const handlePush = useCallback(async (row) => {
    if (!pushedByName.trim()) {
      addToast('Enter your name before pushing', 'error')
      return
    }
    try {
      const result = await api.pushLead({
        query: row.query || '',
        name: row.name || '',
        website: row.website || '',
        company_phone: normalizePhone(row.company_phone),
        email: row.email || '',
        pushed_by: pushedByName.trim(),
        Comments: row.Comments || '',
        'Lead Status': row['Lead Status'] || ''
      })
      if (result.duplicate) {
        addToast(`"${row.name}" already exists in shared sheet — skipped`, 'info')
      } else {
        addToast('Lead pushed to shared sheet', 'success')
      }
    } catch (e) {
      addToast('Push failed', 'error')
      return
    }

    if (auth.masterSheetId) {
      try {
        await api.discardMasterRow(auth.masterSheetId, { name: row.name, website: row.website })
      } catch (e) { /* ignore */ }
    }
    setMasterRows(prev => prev.filter(r => !(r.name === row.name && r.website === row.website)))
  }, [pushedByName, auth, addToast])

  const handleAddLead = useCallback(async (data) => {
    if (!auth.masterSheetId) {
      addToast('No master sheet linked — please logout and login again', 'error')
      return { success: false }
    }
    try {
      const result = await api.addMasterLead(auth.masterSheetId, data)
      return result
    } catch (e) {
      addToast('Failed to add lead', 'error')
      return { success: false }
    }
  }, [auth, addToast])

  const handleAddFile = useCallback(() => {
    setIsAdditional(true)
    setView('landing')
  }, [])

  const handleExport = useCallback(() => {
    const headers = ['name', 'query', 'website', 'company_phone', 'email', 'Lead Status', 'Comments']
    const data = allRows.filter(r => r.tag).map(r => {
      const row = {}
      for (const h of headers) {
        row[h] = r[h] || ''
      }
      row['Lead Status'] = r.tag === 'green' ? 'Good' : r.tag === 'yellow' ? 'Maybe' : r.tag === 'red' ? 'Bad' : ''
      return row
    })

    if (data.length === 0) {
      addToast('No tagged leads to export', 'info')
      return
    }

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data, { header: headers })
    XLSX.utils.book_append_sheet(wb, ws, 'Leads')
    XLSX.writeFile(wb, `quali_export_${new Date().toISOString().slice(0, 10)}.xlsx`)
    addToast(`Exported ${data.length} leads`, 'success')
  }, [allRows, addToast])

  const handleRowClick = useCallback((rowId) => {
    setActiveTab(rowId)
    const row = allRowsRef.current.find(r => r.rowId === rowId)
    setSelectedLead(row || null)
    if (row && row.searchValue) {
      const url = `https://www.google.com/search?q=${encodeURIComponent(row.searchValue)}&_t=${Date.now()}`
      const a = document.createElement('a')
      a.href = url
      a.target = '_blank'
      a.rel = 'noopener noreferrer'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    }
  }, [])

  const handleSaveScriptUrl = useCallback(() => {
    setScriptUrl(scriptUrlInput.trim())
    storage.saveScriptUrl(scriptUrlInput.trim())
    addToast('Apps Script URL saved', 'success')
  }, [scriptUrlInput, addToast])

  const handleSaveName = useCallback((name) => {
    setPushedByName(name)
    storage.savePushedByName(name)
  }, [])

  if (authLoading) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Quali</h1>
          <p className="app-subtitle">Lead Review Tool</p>
        </header>
        <main className="app-main">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh', color: '#666' }}>
            Loading...
          </div>
        </main>
      </div>
    )
  }

  if (!auth.loggedIn) {
    return (
      <div className="app">
        <LoginView onLogin={handleLogin} />
        <ToastContainer />
      </div>
    )
  }

  if (view === 'landing') {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Quali</h1>
          <p className="app-subtitle">Lead Review Tool — Web</p>
          <div className="header-user">
            <span className="header-username">{auth.displayName}</span>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </header>
        <main className="app-main landing-main">
          <div className="landing-left">
            <div className="landing-cards">
              <MasterCard
                icon={<FileText size={20} />}
                title="My Master Sheet"
                miniGraph="M2 18C15 15 25 5 45 8C65 11 70 2 78 2"
                stats={[
                  { icon: <FileText size={14} />, label: 'Sheet', value: <span className="mc-stat-text">{auth.masterSheetId ? 'Connected' : 'Not configured'}</span> },
                  { icon: <BarChart3 size={14} />, label: 'Total Leads', value: <span className="mc-stat-bold">{masterStats.totalLeads}</span> },
                  { icon: <CheckCircle size={14} />, label: 'Good', value: <span className="mc-stat-green">{masterStats.good}</span> },
                  { icon: <AlertCircle size={14} />, label: 'Maybe', value: <span className="mc-stat-yellow">{masterStats.maybe}</span> },
                  { icon: <XCircle size={14} />, label: 'Bad', value: <span className="mc-stat-red">{masterStats.bad}</span> },
                ]}
                actions={
                  <div className="mc-btn-row">
                    <button className="mc-btn mc-btn-primary" onClick={handleOpenMasterViewer}>View</button>
                    <button className="mc-btn mc-btn-secondary" onClick={() => setShowAddLead(true)}>Add Lead</button>
                  </div>
                }
              />
              <MasterCard
                icon={<Globe size={20} />}
                title="Shared Master Sheet"
                miniGraph="M2 12C18 8 35 18 55 10C70 5 75 14 78 8"
                stats={[
                  { icon: <Globe size={14} />, label: 'URL', value: <span className="mc-stat-text">Google Drive — all users</span> },
                  { icon: <Upload size={14} />, label: 'Total Pushed', value: <span className="mc-stat-bold">—</span> },
                  { icon: <Clock size={14} />, label: 'Last Push', value: <span className="mc-stat-text">—</span> },
                  { icon: <Users size={14} />, label: 'Top Pusher', value: <span className="mc-stat-text">—</span> },
                ]}
                actions={
                  <div className="mc-btn-row">
                    <a className="mc-btn mc-btn-secondary" href="https://docs.google.com/spreadsheets/d/1LWsb7dfw5vQ3DZcLgmN523ALoys9hqYfmft6v-bA9kU/edit?usp=sharing" target="_blank" rel="noopener noreferrer">Open</a>
                  </div>
                }
              />
            </div>
            <div className="landing-upload">
              <FilePicker onFileLoad={handleFileLoad} />
            </div>
          </div>
          <div className="landing-center">
            <CompetitionWidget
              data={Object.entries(pushCounts).map(([name, leads]) => ({ name, leads }))}
            />
          </div>
          <div className="landing-right">
            <ActivitiesCard
              headerIcon={<FaBell size={22} />}
              title="Notifications"
              subtitle="Recent activity"
              activities={activities}
            />
            <div className="landing-right-bottom">
              <TodoList />
            </div>
          </div>
        </main>
        {showAddLead && <AddLeadModal onClose={() => { setShowAddLead(false); if (isAdditional) { setView('batch'); setIsAdditional(false) } }} onAdd={handleAddLead} />}
        <ToastContainer />
      </div>
    )
  }

  if (view === 'setup' && excelData) {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Quali</h1>
          <p className="app-subtitle">{isAdditional ? 'Add Another File' : 'Configure Review Session'}</p>
        </header>
        <main className="app-main">
          <SetupView
            excelData={excelData}
            columnMapping={columnMapping}
            rowCount={rowCount}
            onComplete={handleSetupComplete}
            onBack={() => {
              if (isAdditional) {
                setView('batch')
                setIsAdditional(false)
              } else {
                setView('landing')
              }
            }}
            isAdditional={isAdditional}
          />
        </main>
        <ToastContainer />
      </div>
    )
  }

  if (view === 'master') {
    return (
      <div className="app">
        <header className="app-header">
          <h1>Quali</h1>
          <p className="app-subtitle">Master Sheet</p>
          <div className="header-user">
            <span className="header-username">{auth.displayName}</span>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </header>
        <main className="app-main master-view">
          <div className="master-toolbar">
            <button className="btn btn-secondary btn-sm" onClick={() => setView('landing')}>← Back</button>
            <div className="master-toolbar-right">
              <input
                type="text"
                className="master-name-input"
                value={pushedByName}
                onChange={(e) => handleSaveName(e.target.value)}
                placeholder="Your name (for pushed_by)"
              />
              <span className="master-row-count">{masterRows.length} leads</span>
              <button className="btn btn-primary btn-sm" onClick={() => setShowAddLead(true)}>+ Add Lead</button>
            </div>
          </div>
          <div className="master-script-config">
            <label>Apps Script URL (for Push to work)</label>
            <div className="input-row">
              <input
                type="text"
                value={scriptUrlInput}
                onChange={(e) => setScriptUrlInput(e.target.value)}
                placeholder="Paste your Google Apps Script web app URL"
              />
              <button className="btn btn-primary btn-sm" onClick={handleSaveScriptUrl} disabled={!scriptUrlInput.trim() || scriptUrlInput.trim() === scriptUrl}>
                Save
              </button>
            </div>
            {scriptUrl && <span className="settings-hint">URL configured</span>}
          </div>
          {masterLoading ? (
            <div className="master-empty">Loading...</div>
          ) : masterRows.length === 0 ? (
            <div className="master-empty">No leads in master sheet</div>
          ) : (
            <div className="master-table-wrapper">
              <table className="master-table">
                <thead>
                  <tr>
                    <th>Candidate</th>
                    <th>Query</th>
                    <th>Website</th>
                    <th>Phone</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Comments</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {masterRows.map((row, i) => {
                    const status = (row['Lead Status'] || '').toLowerCase()
                    const statusLabel = status === 'green' ? 'Good' : status === 'yellow' ? 'Maybe' : status === 'red' ? 'Bad' : row['Lead Status'] || ''
                    return (
                      <tr key={i} style={{ cursor: 'pointer' }} onClick={() => { setSelectedCommentRow(row); setCommentText(row.Comments || '') }}>
                        <td className="font-medium">{row.name || '—'}</td>
                        <td className="text-muted">{row.query || '—'}</td>
                        <td className="text-muted">{row.website || '—'}</td>
                        <td className="text-muted">{normalizePhone(row.company_phone) || '—'}</td>
                        <td className="text-muted">{row.email || '—'}</td>
                        <td>
                          {statusLabel ? (
                            <span className={`badge badge-${status}`}>{statusLabel}</span>
                          ) : (
                            <span className="badge badge-muted">—</span>
                          )}
                        </td>
                        <td className="text-muted">{row.Comments || '—'}</td>
                        <td className="text-right">
                          <button className="btn-discard" onClick={(e) => { e.stopPropagation(); handleDiscard(row) }} title="Discard">Discard</button>
                          <button className="btn-push" onClick={(e) => { e.stopPropagation(); handlePush(row) }} title="Push to shared sheet">Push</button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              <div className="master-table-footer">
                <span>Total Candidates</span>
                <span>{masterRows.length}</span>
              </div>
            </div>
          )}
        </main>
        {selectedCommentRow && (
          <div className="comment-modal-overlay" onClick={() => setSelectedCommentRow(null)}>
            <div className="comment-modal" onClick={e => e.stopPropagation()}>
              <h3>{selectedCommentRow.name || 'Lead'}</h3>
              <textarea
                autoFocus
                value={commentText}
                onChange={(e) => {
                  const val = e.target.value
                  setCommentText(val)
                  setMasterRows(prev => prev.map(r =>
                    (r.name === selectedCommentRow.name && r.website === selectedCommentRow.website)
                      ? { ...r, Comments: val }
                      : r
                  ))
                  if (commentTimerRef.current) clearTimeout(commentTimerRef.current)
                  commentTimerRef.current = setTimeout(() => {
                    if (auth.masterSheetId) {
                      api.updateMasterRow(auth.masterSheetId, { name: selectedCommentRow.name, website: selectedCommentRow.website }, 'Comments', val).catch(() => {})
                    }
                  }, 500)
                }}
                placeholder="Add comments..."
              />
              <div className="comment-modal-actions">
                <button className="btn btn-secondary btn-sm" onClick={() => setSelectedCommentRow(null)}>Close</button>
              </div>
            </div>
          </div>
        )}
        {showAddLead && <AddLeadModal onClose={() => { setShowAddLead(false); handleOpenMasterViewer() }} onAdd={handleAddLead} />}
        <ToastContainer />
      </div>
    )
  }

  if (view === 'batch') {
    const taggedCount = batchRows.filter(r => r.tag).length
    const allTagged = batchRows.length > 0 && taggedCount === batchRows.length
    const hasUnprocessed = allRows.some(r => r.status === 'unprocessed')

    return (
      <div className="app">
        <header className="app-header">
          <h1>Quali</h1>
          <div className="stats-bar">
            <span>{stats.processed} / {stats.total} reviewed</span>
            <span className="separator">|</span>
            <span>{stats.remaining} remaining</span>
            {cloudMasterFiltered > 0 && (
              <>
                <span className="separator">|</span>
                <span style={{ color: '#a78bfa' }}>{cloudMasterFiltered} filtered (cloud dedup)</span>
              </>
            )}
            <span className="separator">|</span>
            <button className="btn btn-secondary btn-sm" onClick={handleAddFile}>+ Add File</button>
            <button className="btn btn-secondary btn-sm" onClick={handleExport}>Export</button>
            <span className="separator">|</span>
            <span className="header-username">{auth.displayName}</span>
            <button className="btn-logout" onClick={handleLogout}>Logout</button>
          </div>
        </header>
        <main className="app-main batch-view">
          <div className="batch-content">
            {selectedLead ? (
              <div className="lead-detail-panel">
                <h3 className="lead-detail-name">{selectedLead.name || 'No Name'}</h3>
                <div className="lead-detail-fields">
                  {selectedLead.query && (
                    <div className="lead-detail-field">
                      <span className="lead-detail-label">Query</span>
                      <span className="lead-detail-value">{selectedLead.query}</span>
                    </div>
                  )}
                  {selectedLead.website && (
                    <div className="lead-detail-field">
                      <span className="lead-detail-label">Website</span>
                      <a className="lead-detail-value lead-detail-link" href={selectedLead.website.startsWith('http') ? selectedLead.website : `https://${selectedLead.website}`} target="_blank" rel="noopener noreferrer">{selectedLead.website}</a>
                    </div>
                  )}
                  {selectedLead.company_phone && normalizePhone(selectedLead.company_phone) && (
                    <div className="lead-detail-field">
                      <span className="lead-detail-label">Phone</span>
                      <span className="lead-detail-value">{normalizePhone(selectedLead.company_phone)}</span>
                    </div>
                  )}
                  {selectedLead.email && (
                    <div className="lead-detail-field">
                      <span className="lead-detail-label">Email</span>
                      <span className="lead-detail-value">{selectedLead.email}</span>
                    </div>
                  )}
                </div>
                <div className="lead-detail-tag-actions">
                  <button className={`lead-tag-btn lead-tag-good ${selectedLead.tag === 'green' ? 'active' : ''}`} onClick={() => handleTag(selectedLead.rowId, 'green')}>Good</button>
                  <button className={`lead-tag-btn lead-tag-maybe ${selectedLead.tag === 'yellow' ? 'active' : ''}`} onClick={() => handleTag(selectedLead.rowId, 'yellow')}>Maybe</button>
                  <button className={`lead-tag-btn lead-tag-bad ${selectedLead.tag === 'red' ? 'active' : ''}`} onClick={() => handleTag(selectedLead.rowId, 'red')}>Bad</button>
                </div>
              </div>
            ) : (
              <div className="batch-empty">
                <p>Select a lead from the panel below to start reviewing</p>
              </div>
            )}
          </div>
          <BottomBar
            batchRows={batchRows}
            stats={stats}
            activeRow={activeTab}
            onRowClick={handleRowClick}
            onTag={handleTag}
            onNextBatch={handleNextBatch}
            onHome={handleGoHome}
            allTagged={allTagged}
            hasUnprocessed={hasUnprocessed}
          />
        </main>
        {isComplete && (
          <div className="completion-overlay">
            <div className="completion-card">
              <h2>All Leads Reviewed!</h2>
              <p>You have reviewed all {stats.total} leads.</p>
              <div className="completion-actions">
                <button className="btn btn-primary" onClick={handleExport}>Export Results</button>
                <button className="btn btn-secondary" onClick={handleAddFile}>Add Another File</button>
                <button className="btn btn-secondary" onClick={handleGoHome}>Start New Session</button>
              </div>
            </div>
          </div>
        )}
        <ToastContainer />
      </div>
    )
  }

  return null
}

export default App
