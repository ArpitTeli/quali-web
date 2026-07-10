// ===== QUALI WEB — Per-User Master Sheet Apps Script =====
// Deploy this as a Web App (Execute as: Me, Access: Anyone)
// Each user has their own Google Sheet with this script bound to it.
// OR: Use a single standalone script that takes sheetId parameter.

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)
    const action = body.action

    if (action === 'readMaster') {
      return readMaster(body.sheetId)
    }
    if (action === 'updateMasterRow') {
      return updateMasterRow(body.sheetId, body.rowKey, body.field, body.value)
    }
    if (action === 'discardMasterRow') {
      return discardMasterRow(body.sheetId, body.rowKey)
    }
    if (action === 'addMasterLead') {
      return addMasterLead(body.sheetId, body.row)
    }
    if (action === 'getMasterStats') {
      return getMasterStats(body.sheetId)
    }

    return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action: ' + action }))
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
  }
}

function doGet(e) {
  return ContentService.createTextOutput('Quali Master Sheet API — Use POST')
}

// ===== READ ALL ROWS =====
function readMaster(sheetId) {
  const ss = getSheet(sheetId)
  if (!ss) return { error: 'Sheet not found' }

  const sheet = ss.getSheets()[0]
  const data = sheet.getDataRange().getValues()
  if (data.length < 2) return { rows: [] }

  const headers = data[0].map(h => String(h).trim())
  const rows = []
  for (let i = 1; i < data.length; i++) {
    const row = {}
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j] != null ? String(data[i][j]) : ''
    }
    rows.push(row)
  }

  return ContentService.createTextOutput(JSON.stringify({ rows }))
}

// ===== UPDATE A SINGLE CELL =====
function updateMasterRow(sheetId, rowKey, field, value) {
  const ss = getSheet(sheetId)
  if (!ss) return { error: 'Sheet not found' }

  const sheet = ss.getSheets()[0]
  const data = sheet.getDataRange().getValues()
  if (data.length < 2) return { error: 'Empty sheet' }

  const headers = data[0].map(h => String(h).trim())
  const nameIdx = headers.indexOf('name')
  const websiteIdx = headers.indexOf('website')
  const fieldIdx = headers.indexOf(field)

  if (fieldIdx === -1) return { error: 'Column not found: ' + field }

  const parts = rowKey.split('|')
  const keyName = parts[0] || ''
  const keyWebsite = parts[1] || ''

  for (let i = 1; i < data.length; i++) {
    const rowName = String(data[i][nameIdx] || '').trim()
    const rowWebsite = String(data[i][websiteIdx] || '').trim()
    if (rowName === keyName && rowWebsite === keyWebsite) {
      sheet.getRange(i + 1, fieldIdx + 1).setValue(value)
      return { success: true }
    }
  }

  return { error: 'Row not found' }
}

// ===== DISCARD (DELETE) A ROW =====
function discardMasterRow(sheetId, rowKey) {
  const ss = getSheet(sheetId)
  if (!ss) return { error: 'Sheet not found' }

  const sheet = ss.getSheets()[0]
  const data = sheet.getDataRange().getValues()
  if (data.length < 2) return { error: 'Empty sheet' }

  const headers = data[0].map(h => String(h).trim())
  const nameIdx = headers.indexOf('name')
  const websiteIdx = headers.indexOf('website')

  const parts = rowKey.split('|')
  const keyName = parts[0] || ''
  const keyWebsite = parts[1] || ''

  for (let i = 1; i < data.length; i++) {
    const rowName = String(data[i][nameIdx] || '').trim()
    const rowWebsite = String(data[i][websiteIdx] || '').trim()
    if (rowName === keyName && rowWebsite === keyWebsite) {
      sheet.deleteRow(i + 1)
      return { success: true }
    }
  }

  return { error: 'Row not found' }
}

// ===== ADD A NEW LEAD =====
function addMasterLead(sheetId, row) {
  const ss = getSheet(sheetId)
  if (!ss) return { error: 'Sheet not found' }

  const sheet = ss.getSheets()[0]
  const data = sheet.getDataRange().getValues()
  const headers = data.length > 0 ? data[0].map(h => String(h).trim()) : []

  if (headers.length === 0) {
    // Create headers if sheet is empty
    const newHeaders = ['query', 'name', 'website', 'company_phone', 'email', 'Lead Status', 'Comments']
    sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders])
    headers.push(...newHeaders)
  }

  const newRow = headers.map(h => row[h] || '')
  sheet.appendRow(newRow)

  return { success: true }
}

// ===== GET STATS =====
function getMasterStats(sheetId) {
  const ss = getSheet(sheetId)
  if (!ss) return { error: 'Sheet not found' }

  const sheet = ss.getSheets()[0]
  const data = sheet.getDataRange().getValues()
  if (data.length < 2) return { totalLeads: 0, good: 0, maybe: 0, bad: 0 }

  const headers = data[0].map(h => String(h).trim())
  const statusIdx = headers.indexOf('Lead Status')

  let total = 0, good = 0, maybe = 0, bad = 0
  for (let i = 1; i < data.length; i++) {
    total++
    const status = String(data[i][statusIdx] || '').toLowerCase()
    if (status === 'green') good++
    else if (status === 'yellow') maybe++
    else if (status === 'red') bad++
  }

  return { totalLeads: total, good, maybe, bad, lastModified: new Date().toISOString() }
}

// ===== HELPER: GET SPREADSHEET BY ID =====
function getSheet(sheetId) {
  if (!sheetId) {
    // If no sheetId, use the bound spreadsheet (for per-user deployment)
    return SpreadsheetApp.getActiveSpreadsheet()
  }
  try {
    return SpreadsheetApp.openById(sheetId)
  } catch (e) {
    return null
  }
}
