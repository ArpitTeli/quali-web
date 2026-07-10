// ===== QUALI WEB — Auth Apps Script (Auto-Creates Master Sheet) =====
//
// SETUP:
// 1. Create a Google Sheet with columns: UID, Pass, Name, MasterSheetId
//    (MasterSheetId column can be empty — it auto-fills on first login)
// 2. Open Extensions → Apps Script → paste this code
// 3. Deploy → New Deployment → Web App → Execute as: Me → Access: Anyone
// 4. Visit the URL in browser once to accept permissions
//
// The script auto-creates a personal Google Sheet per user on first login.
// Sheet name: "Quali Master - {uid}"
// Headers: query, name, website, company_phone, email, Lead Status, Comments

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

  if (uidIdx === -1 || passIdx === -1) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Auth sheet missing UID or Pass columns' }))
  }

  for (let i = 1; i < data.length; i++) {
    const rowUid = String(data[i][uidIdx] || '').trim()
    const rowPass = String(data[i][passIdx] || '').trim()

    if (rowUid === uid && rowPass === password) {
      const displayName = String(data[i][nameIdx] || rowUid).trim()
      let masterSheetId = sheetIdIdx >= 0 ? String(data[i][sheetIdIdx] || '').trim() : ''

      // Auto-create master sheet if not yet assigned
      if (!masterSheetId && sheetIdIdx >= 0) {
        masterSheetId = createMasterSheet(uid)
        if (masterSheetId) {
          // Write the new sheet ID back to the auth sheet
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

    // Set up headers
    const headers = ['query', 'name', 'website', 'company_phone', 'email', 'Lead Status', 'Comments']
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])

    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, headers.length)
    headerRange.setFontWeight('bold')
    headerRange.setBackground('#f0f0f0')

    // Auto-resize columns
    for (let c = 1; c <= headers.length; c++) {
      sheet.autoResizeColumn(c)
    }

    return newSS.getId()
  } catch (err) {
    console.error('Failed to create master sheet for ' + uid + ': ' + err.message)
    return ''
  }
}
