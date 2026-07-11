// ===== QUALI WEB — Auth Apps Script (Auto-Creates Master Sheet) =====
//
// SETUP:
// 1. Create a Google Sheet with columns: UID, Pass
//    (No other columns needed — UID is used as display name)
// 2. Add users as rows (e.g. arpit, mypassword)
// 3. Extensions → Apps Script → paste this code
// 4. Deploy → New Deployment → Web App → Execute as: Me → Access: Anyone
// 5. Visit the URL in browser once to accept permissions
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
  const sheetIdIdx = headers.indexOf('mastersheetid')

  if (uidIdx === -1 || passIdx === -1) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: 'Auth sheet missing UID or Pass columns' }))
  }

  for (let i = 1; i < data.length; i++) {
    const rowUid = String(data[i][uidIdx] || '').trim()
    const rowPass = String(data[i][passIdx] || '').trim()

    if (rowUid === uid && rowPass === password) {
      // UID is the display name (no separate Name column)
      const displayName = rowUid
      let masterSheetId = sheetIdIdx >= 0 ? String(data[i][sheetIdIdx] || '').trim() : ''

      // Auto-create master sheet if MasterSheetId column exists but is empty
      if (!masterSheetId && sheetIdIdx >= 0) {
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
