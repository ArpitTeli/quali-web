// ===== QUALI WEB — Updated Auth Apps Script =====
// Add 'MasterSheetId' column to your auth sheet (UID, Pass, MasterSheetId)
// This returns the sheet ID on successful login.

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents)

    if (body.action === 'login') {
      return handleLogin(body.uid, body.password)
    }

    return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown action' }))
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
  }
}

function doGet(e) {
  return ContentService.createTextOutput('Quali Auth API — Use POST')
}

function handleLogin(uid, password) {
  const ss = SpreadsheetApp.getActiveSpreadsheet()
  const sheet = ss.getSheets()[0]
  const data = sheet.getDataRange().getValues()

  if (data.length < 2) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'No users configured' }))
  }

  const headers = data[0].map(h => String(h).trim().toLowerCase())
  const uidIdx = headers.indexOf('uid')
  const passIdx = headers.indexOf('pass')
  const nameIdx = headers.indexOf('name') >= 0 ? headers.indexOf('name') : uidIdx
  const sheetIdIdx = headers.indexOf('mastersheetid')

  for (let i = 1; i < data.length; i++) {
    const rowUid = String(data[i][uidIdx] || '').trim()
    const rowPass = String(data[i][passIdx] || '').trim()

    if (rowUid === uid && rowPass === password) {
      const displayName = String(data[i][nameIdx] || rowUid).trim()
      const masterSheetId = sheetIdIdx >= 0 ? String(data[i][sheetIdIdx] || '').trim() : ''

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        displayName,
        masterSheetId
      }))
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid credentials' }))
}
