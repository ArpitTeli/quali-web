// ===== QUALI WEB — Auth Apps Script (Auto-Creates Master Sheet) =====
//
// SETUP:
// 1. Create a Google Sheet with columns: UID, Pass
// 2. Add users as rows (e.g. arpit, mypassword)
// 3. Extensions → Apps Script → paste this code
// 4. Deploy → New Deployment → Web App → Execute as: Me → Access: Anyone
// 5. Visit the URL in browser once to accept permissions
//
// The script auto-creates a personal Google Sheet per user on first login.
// It also auto-creates a MasterSheetId column if missing.

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

  const headers = data[0].map(h => { try { return String(h).trim().toLowerCase() } catch(e) { return '' } })
  const uidIdx = headers.indexOf('uid')
  const passIdx = headers.indexOf('pass')
  let sheetIdIdx = headers.indexOf('mastersheetid')

  if (uidIdx === -1 || passIdx === -1) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Auth sheet missing UID or Pass columns' }))
  }

  // Auto-create MasterSheetId column if it doesn't exist
  if (sheetIdIdx === -1) {
    const lastCol = sheet.getLastColumn()
    sheet.getRange(1, lastCol + 1).setValue('MasterSheetId')
    sheetIdIdx = lastCol // 0-based index for array access
  }

  for (let i = 1; i < data.length; i++) {
    const rowUid = (data[i][uidIdx] != null ? String(data[i][uidIdx]) : '').trim()
    const rowPass = (data[i][passIdx] != null ? String(data[i][passIdx]) : '').trim()

    if (rowUid === uid && rowPass === password) {
      const displayName = rowUid
      let masterSheetId = sheetIdIdx >= 0 ? (data[i][sheetIdIdx] != null ? String(data[i][sheetIdIdx]) : '').trim() : ''

      // Auto-create master sheet if empty
      if (!masterSheetId) {
        masterSheetId = createMasterSheet(uid)
        if (masterSheetId) {
          sheet.getRange(i + 1, sheetIdIdx + 1).setValue(masterSheetId)
        }
      }

      return ContentService.createTextOutput(JSON.stringify({
        success: true,
        displayName,
        masterSheetId: masterSheetId || ''
      }))
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Invalid credentials' }))
}

function createMasterSheet(uid) {
  try {
    const newName = 'Quali Master - ' + uid
    const newSS = SpreadsheetApp.create(newName)
    const sheet = newSS.getSheets()[0]

    const headers = ['query', 'name', 'website', 'company_phone', 'email', 'Lead Status', 'Comments']
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])

    const headerRange = sheet.getRange(1, 1, 1, headers.length)
    headerRange.setFontWeight('bold')
    headerRange.setBackground('#f0f0f0')

    for (let c = 1; c <= headers.length; c++) {
      sheet.autoResizeColumn(c)
    }

    return newSS.getId()
  } catch (err) {
    console.error('Failed to create master sheet for ' + uid + ': ' + err.message)
    return ''
  }
}
