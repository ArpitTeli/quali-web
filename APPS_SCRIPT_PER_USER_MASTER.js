// ===== QUALI WEB — Per-User Master Sheet Apps Script =====
// Deploy this as a Web App (Execute as: Me, Access: Anyone)

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)
    const action = body.action
    let result

    if (action === 'readMaster') {
      result = readMaster(body.sheetId)
    } else if (action === 'updateMasterRow') {
      result = updateMasterRow(body.sheetId, body.rowKey, body.field, body.value)
    } else if (action === 'discardMasterRow') {
      result = discardMasterRow(body.sheetId, body.rowKey)
    } else if (action === 'addMasterLead') {
      result = addMasterLead(body.sheetId, body.row)
    } else if (action === 'getMasterStats') {
      result = getMasterStats(body.sheetId)
    } else {
      result = { error: 'Unknown action: ' + action }
    }

    return ContentService.createTextOutput(JSON.stringify(result))
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
  }
}

function doGet(e) {
  return ContentService.createTextOutput('Quali Master Sheet API — Use POST')
}

function readMaster(sheetId) {
  var ss = getSheet(sheetId)
  if (!ss) return { error: 'Sheet not found' }

  var sheet = ss.getSheets()[0]
  var data = sheet.getDataRange().getValues()
  if (data.length < 2) return { rows: [] }

  var headers = data[0].map(function(h) { return String(h).trim() })
  var rows = []
  for (var i = 1; i < data.length; i++) {
    var row = {}
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j] != null ? String(data[i][j]) : ''
    }
    rows.push(row)
  }

  return { rows: rows }
}

function updateMasterRow(sheetId, rowKey, field, value) {
  var ss = getSheet(sheetId)
  if (!ss) return { error: 'Sheet not found' }

  var sheet = ss.getSheets()[0]
  var data = sheet.getDataRange().getValues()
  if (data.length < 2) return { error: 'Empty sheet' }

  var headers = data[0].map(function(h) { return String(h).trim().toLowerCase() })
  var nameIdx = headers.indexOf('name')
  var websiteIdx = headers.indexOf('website')
  var fieldIdx = headers.indexOf(field.toLowerCase())

  if (fieldIdx === -1) return { error: 'Column not found: ' + field }

  var parts = rowKey.split('||')
  var keyName = (parts[0] || '').trim().toLowerCase()
  var keyWebsite = (parts[1] || '').trim().toLowerCase()

  for (var i = 1; i < data.length; i++) {
    var rowName = String(data[i][nameIdx] || '').trim().toLowerCase()
    var rowWebsite = String(data[i][websiteIdx] || '').trim().toLowerCase()
    if (rowName === keyName && rowWebsite === keyWebsite) {
      sheet.getRange(i + 1, fieldIdx + 1).setValue(value)
      return { success: true }
    }
  }

  return { error: 'Row not found' }
}

function discardMasterRow(sheetId, rowKey) {
  var ss = getSheet(sheetId)
  if (!ss) return { error: 'Sheet not found' }

  var sheet = ss.getSheets()[0]
  var data = sheet.getDataRange().getValues()
  if (data.length < 2) return { error: 'Empty sheet' }

  var headers = data[0].map(function(h) { return String(h).trim().toLowerCase() })
  var nameIdx = headers.indexOf('name')
  var websiteIdx = headers.indexOf('website')

  if (nameIdx === -1 || websiteIdx === -1) {
    return { error: 'Columns not found. Headers: ' + JSON.stringify(data[0]) }
  }

  var parts = rowKey.split('||')
  var keyName = (parts[0] || '').trim().toLowerCase()
  var keyWebsite = (parts[1] || '').trim().toLowerCase()

  for (var i = 1; i < data.length; i++) {
    var rowName = String(data[i][nameIdx] || '').trim().toLowerCase()
    var rowWebsite = String(data[i][websiteIdx] || '').trim().toLowerCase()
    if (rowName === keyName && rowWebsite === keyWebsite) {
      sheet.deleteRow(i + 1)
      return { success: true }
    }
  }

  return { error: 'Row not found. Key: ' + rowKey + ' Headers: ' + JSON.stringify(data[0]) }
}

function addMasterLead(sheetId, row) {
  var ss = getSheet(sheetId)
  if (!ss) return { error: 'Sheet not found' }

  var sheet = ss.getSheets()[0]
  var data = sheet.getDataRange().getValues()
  var headers = data.length > 0 ? data[0].map(function(h) { return String(h).trim() }) : []

  if (headers.length === 0) {
    var newHeaders = ['query', 'name', 'website', 'company_phone', 'email', 'Lead Status', 'Comments']
    sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders])
    headers.push.apply(headers, newHeaders)
  }

  var newRow = headers.map(function(h) { return row[h] || '' })
  sheet.appendRow(newRow)

  return { success: true }
}

function getMasterStats(sheetId) {
  var ss = getSheet(sheetId)
  if (!ss) return { error: 'Sheet not found' }

  var sheet = ss.getSheets()[0]
  var data = sheet.getDataRange().getValues()
  if (data.length < 2) return { totalLeads: 0, good: 0, maybe: 0, bad: 0 }

  var headers = data[0].map(function(h) { return String(h).trim() })
  var statusIdx = headers.indexOf('Lead Status')

  var total = 0, good = 0, maybe = 0, bad = 0
  for (var i = 1; i < data.length; i++) {
    total++
    var status = String(data[i][statusIdx] || '').toLowerCase()
    if (status === 'green') good++
    else if (status === 'yellow') maybe++
    else if (status === 'red') bad++
  }

  return { totalLeads: total, good: good, maybe: maybe, bad: bad, lastModified: new Date().toISOString() }
}

function getSheet(sheetId) {
  if (!sheetId || !String(sheetId).trim()) {
    return null
  }
  try {
    return SpreadsheetApp.openById(String(sheetId).trim())
  } catch (e) {
    console.error('Failed to open sheet ' + sheetId + ': ' + e.message)
    return null
  }
}
