// ===== QUALI WEB — Per-User Master Sheet Apps Script =====
// Deploy this as a Web App (Execute as: Me, Access: Anyone)

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents)
    var action = body.action
    var result

    if (action === 'readMaster') {
      result = readMaster(body.sheetId)
    } else if (action === 'updateMasterRow') {
      result = updateMasterRow(body.sheetId, body.name, body.website, body.field, body.value)
    } else if (action === 'discardMasterRow') {
      result = discardMasterRow(body.sheetId, body.name, body.website)
    } else if (action === 'addMasterLead') {
      result = addMasterLead(body.sheetId, body.row)
    } else if (action === 'batchAddMasterLeads') {
      result = batchAddMasterLeads(body.sheetId, body.rows)
    } else if (action === 'getMasterStats') {
      result = getMasterStats(body.sheetId)
    } else {
      result = { error: 'Unknown action: ' + action }
    }

    return ContentService.createTextOutput(JSON.stringify(result))
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message || String(err) }))
  }
}

function doGet(e) {
  return ContentService.createTextOutput('Quali Master Sheet API — Use POST')
}

function safeString(val) {
  if (val == null) return ''
  if (val instanceof Error) return '#ERROR!'
  try { return String(val) } catch(e) { return '' }
}

function readMaster(sheetId) {
  var ss = getSheet(sheetId)
  if (!ss) return { error: 'Sheet not found' }

  var sheet = ss.getSheets()[0]
  var data = sheet.getDataRange().getValues()
  if (data.length < 2) return { rows: [] }

  var headers = data[0].map(function(h) { return safeString(h).trim() })
  var rows = []
  for (var i = 1; i < data.length; i++) {
    var row = {}
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = safeString(data[i][j])
    }
    rows.push(row)
  }

  return { rows: rows }
}

function findRow(data, headers, name, website) {
  var nameIdx = headers.indexOf('name')
  var websiteIdx = headers.indexOf('website')
  if (nameIdx === -1 || websiteIdx === -1) return -1

  var keyName = (name || '').trim().toLowerCase()
  var keyWebsite = (website || '').trim().toLowerCase()

  for (var i = 1; i < data.length; i++) {
    var rowName = safeString(data[i][nameIdx]).trim().toLowerCase()
    var rowWebsite = safeString(data[i][websiteIdx]).trim().toLowerCase()
    if (rowName === keyName && rowWebsite === keyWebsite) {
      return i
    }
  }
  return -1
}

function updateMasterRow(sheetId, name, website, field, value) {
  var ss = getSheet(sheetId)
  if (!ss) return { error: 'Sheet not found' }

  var sheet = ss.getSheets()[0]
  var data = sheet.getDataRange().getValues()
  if (data.length < 2) return { error: 'Empty sheet' }

  var headers = data[0].map(function(h) { return safeString(h).trim().toLowerCase() })
  var fieldIdx = headers.indexOf(String(field || '').toLowerCase())
  if (fieldIdx === -1) return { error: 'Column not found: ' + field }

  var rowIdx = findRow(data, data[0].map(function(h) { return safeString(h).trim() }), name, website)
  if (rowIdx === -1) return { error: 'Row not found: ' + name }

  sheet.getRange(rowIdx + 1, fieldIdx + 1).setValue(value)
  return { success: true }
}

function discardMasterRow(sheetId, name, website) {
  var ss = getSheet(sheetId)
  if (!ss) return { error: 'Sheet not found' }

  var sheet = ss.getSheets()[0]
  var data = sheet.getDataRange().getValues()
  if (data.length < 2) return { error: 'Empty sheet' }

  var rowIdx = findRow(data, data[0].map(function(h) { return safeString(h).trim() }), name, website)
  if (rowIdx === -1) return { error: 'Row not found: ' + name }

  sheet.deleteRow(rowIdx + 1)
  return { success: true }
}

function addMasterLead(sheetId, row) {
  var ss = getSheet(sheetId)
  if (!ss) return { error: 'Sheet not found' }

  var sheet = ss.getSheets()[0]
  var data = sheet.getDataRange().getValues()
  var headers = data.length > 0 ? data[0].map(function(h) { return safeString(h).trim() }) : []

  if (headers.length === 0) {
    var newHeaders = ['query', 'name', 'website', 'company_phone', 'email', 'Lead Status', 'Comments']
    sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders])
    headers.push.apply(headers, newHeaders)
  }

  var existingIdx = findRow(data, headers, row.name || '', row.website || '')
  if (existingIdx !== -1) {
    for (var c = 0; c < headers.length; c++) {
      var val = row[headers[c]] || ''
      if (val !== '') {
        sheet.getRange(existingIdx + 1, c + 1).setValue(val)
      }
    }
    return { success: true, updated: true }
  }

  var newRow = headers.map(function(h) { return row[h] || '' })
  sheet.appendRow(newRow)
  return { success: true, appended: true }
}

function batchAddMasterLeads(sheetId, rows) {
  var ss = getSheet(sheetId)
  if (!ss) return { error: 'Sheet not found' }
  if (!rows || !rows.length) return { success: true, added: 0, updated: 0 }

  var sheet = ss.getSheets()[0]
  var data = sheet.getDataRange().getValues()
  var headers = data.length > 0 ? data[0].map(function(h) { return safeString(h).trim() }) : []

  if (headers.length === 0) {
    var newHeaders = ['query', 'name', 'website', 'company_phone', 'email', 'Lead Status', 'Comments']
    sheet.getRange(1, 1, 1, newHeaders.length).setValues([newHeaders])
    headers = newHeaders.slice()
  }

  var nameIdx = headers.indexOf('name')
  var websiteIdx = headers.indexOf('website')
  var existingKeys = {}
  for (var i = 1; i < data.length; i++) {
    var k = safeString(data[i][nameIdx]).trim().toLowerCase() + '|' + safeString(data[i][websiteIdx]).trim().toLowerCase()
    existingKeys[k] = i
  }

  var toAppend = []
  var updated = 0

  for (var r = 0; r < rows.length; r++) {
    var row = rows[r]
    var key = (row.name || '').trim().toLowerCase() + '|' + (row.website || '').trim().toLowerCase()

    if (existingKeys[key] !== undefined) {
      var rowIdx = existingKeys[key]
      for (var c = 0; c < headers.length; c++) {
        var val = row[headers[c]] || ''
        if (val !== '') sheet.getRange(rowIdx + 1, c + 1).setValue(val)
      }
      updated++
    } else {
      toAppend.push(headers.map(function(h) { return row[h] || '' }))
      existingKeys[key] = data.length + toAppend.length
    }
  }

  if (toAppend.length > 0) {
    sheet.getRange(data.length + 1, 1, toAppend.length, headers.length).setValues(toAppend)
  }

  return { success: true, added: toAppend.length, updated: updated, total: rows.length }
}

function getMasterStats(sheetId) {
  var ss = getSheet(sheetId)
  if (!ss) return { error: 'Sheet not found' }

  var sheet = ss.getSheets()[0]
  var data = sheet.getDataRange().getValues()
  if (data.length < 2) return { totalLeads: 0, good: 0, maybe: 0, bad: 0 }

  var headers = data[0].map(function(h) { return safeString(h).trim() })
  var statusIdx = headers.indexOf('Lead Status')

  var total = 0, good = 0, maybe = 0, bad = 0
  for (var i = 1; i < data.length; i++) {
    total++
    if (statusIdx === -1) continue
    var status = safeString(data[i][statusIdx]).toLowerCase().trim()
    if (status === 'good' || status === 'green') good++
    else if (status === 'maybe' || status === 'yellow') maybe++
    else if (status === 'bad' || status === 'red') bad++
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
