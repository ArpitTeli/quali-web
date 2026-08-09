// ===== QUALI WEB — Combined Auth + LDS Apps Script =====
//
// SETUP:
// 1. Open your Auth Google Sheet → Extensions → Apps Script
// 2. DELETE all existing code in Code.gs
// 3. Paste this ENTIRE file
// 4. Save (Ctrl+S)
// 5. Deploy → Manage deployments → Edit (pencil) → New version → Deploy
//    - Use the SAME deployment URL for Auth (login) AND LDS actions
//    - OR create two separate deployments if you prefer
// 6. Update BOTH AUTH_SCRIPT_URL and LDS_SCRIPT_URL in api.js to point to this deployment
//
// Auth Sheet columns: UID, Pass, MasterSheetId
// This script auto-creates MasterSheetId if missing.
// It also auto-creates a personal Google Sheet per user on first login.
//
// LDS tabs (auto-created): LDS_Files, LDS_Assignments

var FOLDER_ID = '{{LDS_DRIVE_FOLDER_ID}}'

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents)
    var action = body.action

    // Auth actions
    if (action === 'login') return handleLogin(body.uid, body.password)

    // LDS actions
    if (action === 'getFileTree')     return handleGetFileTree(body)
    if (action === 'claimFile')       return handleClaimFile(body)
    if (action === 'saveProgress')    return handleSaveProgress(body)
    if (action === 'loadProgress')    return handleLoadProgress(body)
    if (action === 'markComplete')    return handleMarkComplete(body)
    if (action === 'getQueueStats')   return handleGetQueueStats(body)

    return json({ error: 'Unknown action: ' + action })
  } catch (err) {
    return json({ error: err.message || String(err) })
  }
}

function doGet(e) {
  return ContentService.createTextOutput('Quali API — Use POST')
}

// ===== Helpers =====

function json(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON)
}

function getSheet(name) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheetByName(name)
  if (!sheet) {
    sheet = ss.insertSheet(name)
  }
  return sheet
}

function generateId() {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  var id = ''
  for (var i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return id
}

function now() {
  return new Date().toISOString()
}

// ===== AUTH =====

function handleLogin(uid, password) {
  var ss = SpreadsheetApp.getActiveSpreadsheet()
  var sheet = ss.getSheets()[0]
  var data = sheet.getDataRange().getValues()

  if (data.length < 2) {
    return json({ success: false, error: 'No users configured' })
  }

  var headers = data[0].map(function(h) { try { return String(h).trim().toLowerCase() } catch(e) { return '' } })
  var uidIdx = headers.indexOf('uid')
  var passIdx = headers.indexOf('pass')
  var sheetIdIdx = headers.indexOf('mastersheetid')

  if (uidIdx === -1 || passIdx === -1) {
    return json({ success: false, error: 'Auth sheet missing UID or Pass columns' })
  }

  if (sheetIdIdx === -1) {
    var lastCol = sheet.getLastColumn()
    sheet.getRange(1, lastCol + 1).setValue('MasterSheetId')
    sheetIdIdx = lastCol
  }

  for (var i = 1; i < data.length; i++) {
    var rowUid = (data[i][uidIdx] != null ? String(data[i][uidIdx]) : '').trim()
    var rowPass = (data[i][passIdx] != null ? String(data[i][passIdx]) : '').trim()

    if (rowUid === uid && rowPass === password) {
      var displayName = rowUid
      var masterSheetId = sheetIdIdx >= 0 ? (data[i][sheetIdIdx] != null ? String(data[i][sheetIdIdx]) : '').trim() : ''

      if (!masterSheetId) {
        masterSheetId = createMasterSheet(uid)
        if (masterSheetId) {
          sheet.getRange(i + 1, sheetIdIdx + 1).setValue(masterSheetId)
        }
      }

      return json({
        success: true,
        displayName: displayName,
        masterSheetId: masterSheetId || ''
      })
    }
  }

  return json({ success: false, error: 'Invalid credentials' })
}

function createMasterSheet(uid) {
  try {
    var newName = 'Quali Master - ' + uid
    var newSS = SpreadsheetApp.create(newName)
    var sheet = newSS.getSheets()[0]

    var headers = ['query', 'name', 'website', 'company_phone', 'email', 'Lead Status', 'Comments']
    sheet.getRange(1, 1, 1, headers.length).setValues([headers])

    var headerRange = sheet.getRange(1, 1, 1, headers.length)
    headerRange.setFontWeight('bold')
    headerRange.setBackground('#f0f0f0')

    for (var c = 1; c <= headers.length; c++) {
      sheet.autoResizeColumn(c)
    }

    return newSS.getId()
  } catch (err) {
    console.error('Failed to create master sheet for ' + uid + ': ' + err.message)
    return ''
  }
}

// ===== LDS =====

function getFilesSheet() {
  var sheet = getSheet('LDS_Files')
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 4).setValues([['FileID', 'Filename', 'FolderPath', 'UploadedAt']])
    sheet.getRange(1, 1, 1, 4).setFontWeight('bold')
  }
  return sheet
}

function getAssignmentsSheet() {
  var sheet = getSheet('LDS_Assignments')
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 9).setValues([['AssignmentID', 'FileID', 'UserID', 'AssignedAt', 'CompletedAt', 'Status', 'ProgressData', 'FileData', 'Filename']])
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold')
  }
  return sheet
}

function handleGetFileTree(body) {
  var userId = body.userId
  if (!userId) return json({ error: 'Missing userId' })

  var scanResult = scanDriveFolder()
  if (scanResult.error) return json({ error: scanResult.error })

  var syncResult = syncFilesToSheet(scanResult.files)
  var myAssignments = getUserAssignments(userId)
  var allActive = getAllActiveAssignments()
  var tree = buildTree(syncResult.sheetFiles, allActive)

  return json({ tree: tree, assignments: allActive, myAssignments: myAssignments })
}

function getAllActiveAssignments() {
  var sheet = getAssignmentsSheet()
  var data = sheet.getDataRange().getValues()
  var result = []

  for (var i = 1; i < data.length; i++) {
    var status = String(data[i][5] || '').trim()
    if (status === 'Active' || status === 'Completed') {
      result.push({
        assignmentId: String(data[i][0] || ''),
        fileId: String(data[i][1] || '').trim(),
        userId: String(data[i][2] || ''),
        assignedAt: String(data[i][3] || ''),
        completedAt: String(data[i][4] || ''),
        status: status,
        filename: String(data[i][8] || '') || String(data[i][1] || '').trim(),
        row: i + 1
      })
    }
  }

  return result
}

function scanDriveFolder() {
  try {
    var folder = DriveApp.getFolderById(FOLDER_ID)
    var files = []
    scanFolder(folder, '', files)
    return { files: files, error: null }
  } catch (err) {
    return { files: [], error: 'Drive access failed: ' + err.message }
  }
}

function scanFolder(folder, path, result) {
  var fileIterator = folder.getFiles()
  while (fileIterator.hasNext()) {
    var file = fileIterator.next()
    var name = file.getName()
    var mimeType = file.getMimeType()
    var isExcel = mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                  mimeType === 'application/vnd.ms-excel' ||
                  name.match(/\.xlsx?$/i)
    if (isExcel) {
      result.push({
        fileId: file.getId(),
        filename: name,
        folderPath: path,
        uploadedAt: file.getDateCreated().toISOString()
      })
    }
  }

  var subIterator = folder.getFolders()
  while (subIterator.hasNext()) {
    var sub = subIterator.next()
    var subPath = path ? path + '/' + sub.getName() : sub.getName()
    scanFolder(sub, subPath, result)
  }
}

function syncFilesToSheet(driveFiles) {
  var sheet = getFilesSheet()
  var data = sheet.getDataRange().getValues()
  var existingMap = {}
  var sheetFiles = []

  for (var i = 1; i < data.length; i++) {
    var fileId = String(data[i][0] || '').trim()
    if (fileId) {
      existingMap[fileId] = {
        fileId: fileId,
        filename: String(data[i][1] || ''),
        folderPath: String(data[i][2] || ''),
        uploadedAt: String(data[i][3] || ''),
        row: i + 1
      }
      sheetFiles.push(existingMap[fileId])
    }
  }

  var newCount = 0
  for (var j = 0; j < driveFiles.length; j++) {
    var f = driveFiles[j]
    if (!existingMap[f.fileId]) {
      sheet.appendRow([f.fileId, f.filename, f.folderPath, f.uploadedAt])
      sheetFiles.push(f)
      newCount++
    }
  }

  return { sheetFiles: sheetFiles, newCount: newCount }
}

function getUserAssignments(userId) {
  var sheet = getAssignmentsSheet()
  var data = sheet.getDataRange().getValues()

  var result = []
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][2] || '').trim() === userId) {
      var fileId = String(data[i][1] || '').trim()
      var taggedCount = 0
      var totalRows = 0
      var progressStr = String(data[i][6] || '')
      if (progressStr) {
        try {
          var progress = JSON.parse(progressStr)
          totalRows = progress.totalRows || 0
          taggedCount = (progress.allRows || []).filter(function(r) { return r.tag }).length
        } catch (e) {}
      }
      result.push({
        assignmentId: String(data[i][0] || ''),
        fileId: fileId,
        userId: String(data[i][2] || ''),
        assignedAt: String(data[i][3] || ''),
        completedAt: String(data[i][4] || ''),
        status: String(data[i][5] || ''),
        filename: String(data[i][8] || '') || fileId,
        taggedCount: taggedCount,
        totalRows: totalRows,
        row: i + 1
      })
    }
  }

  return result
}

function buildTree(sheetFiles, assignments) {
  var assignmentMap = {}
  for (var a = 0; a < assignments.length; a++) {
    var assignment = assignments[a]
    if (!assignmentMap[assignment.fileId]) {
      assignmentMap[assignment.fileId] = []
    }
    assignmentMap[assignment.fileId].push(assignment)
  }

  var enrichedFiles = []
  for (var i = 0; i < sheetFiles.length; i++) {
    var f = sheetFiles[i]
    enrichedFiles.push({
      fileId: f.fileId,
      filename: f.filename,
      folderPath: f.folderPath || '',
      uploadedAt: f.uploadedAt,
      assignments: assignmentMap[f.fileId] || []
    })
  }

  var root = []
  var nodeMap = {}

  for (var j = 0; j < enrichedFiles.length; j++) {
    var file = enrichedFiles[j]
    var folderPath = file.folderPath

    if (!folderPath) {
      var rootNode = nodeMap['__root__']
      if (!rootNode) {
        rootNode = { name: '', path: '', children: [], files: [] }
        nodeMap['__root__'] = rootNode
        root.push(rootNode)
      }
      rootNode.files.push(file)
      continue
    }

    var parts = folderPath.split('/')
    var currentPath = ''

    for (var p = 0; p < parts.length; p++) {
      var parentPath = currentPath
      currentPath = currentPath ? currentPath + '/' + parts[p] : parts[p]

      if (!nodeMap[currentPath]) {
        var node = { name: parts[p], path: currentPath, children: [], files: [] }
        nodeMap[currentPath] = node

        if (parentPath && nodeMap[parentPath]) {
          nodeMap[parentPath].children.push(node)
        } else {
          root.push(node)
        }
      }
    }

    nodeMap[currentPath].files.push(file)
  }

  function sortNode(node) {
    node.children.sort(function(a, b) { return a.name.localeCompare(b.name) })
    node.files.sort(function(a, b) { return a.filename.localeCompare(b.filename) })
    node.children.forEach(sortNode)
  }
  root.forEach(sortNode)

  return root
}

function handleClaimFile(body) {
  var userId = body.userId
  var fileId = body.fileId
  if (!userId || !fileId) return json({ error: 'Missing userId or fileId' })

  var sheet = getAssignmentsSheet()
  var data = sheet.getDataRange().getValues()

  // Check if THIS user already has an Active assignment
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][1] || '').trim() === fileId &&
        String(data[i][2] || '').trim() === userId &&
        String(data[i][5] || '').trim() === 'Active') {
      var existing = {
        assignmentId: String(data[i][0] || ''),
        fileId: fileId,
        userId: userId,
        assignedAt: String(data[i][3] || ''),
        status: 'Active'
      }
      var fileData = String(data[i][7] || '')
      return json({ assignment: existing, fileData: fileData })
    }
  }

  // Check if ANY other user already has an Active assignment for this file
  for (var j = 1; j < data.length; j++) {
    if (String(data[j][1] || '').trim() === fileId &&
        String(data[j][5] || '').trim() === 'Active') {
      var claimedBy = String(data[j][2] || '').trim()
      return json({ error: 'File already claimed by ' + claimedBy })
    }
  }

  var file
  try {
    file = DriveApp.getFileById(fileId)
  } catch (err) {
    return json({ error: 'File not found in Drive' })
  }

  var fileName = file.getName()
  var blob = file.getBlob()
  var bytes = blob.getBytes()
  var fileData = Utilities.base64Encode(bytes)

  var assignmentId = generateId()
  var assignedAt = now()

  sheet.appendRow([
    assignmentId,
    fileId,
    userId,
    assignedAt,
    '',
    'Active',
    '',
    fileData,
    fileName
  ])

  // Trash file from Google Drive
  var trashError = null
  try {
    file.setTrashed(true)
  } catch (e) {
    trashError = e.message || String(e)
  }

  // Remove file from LDS_Files sheet
  var deleteError = null
  try {
    var filesSheet = getFilesSheet()
    var filesData = filesSheet.getDataRange().getValues()
    for (var j = filesData.length - 1; j >= 1; j--) {
      if (String(filesData[j][0] || '').trim() === fileId) {
        filesSheet.deleteRow(j + 1)
        break
      }
    }
  } catch (e) {
    deleteError = e.message || String(e)
  }

  var response = {
    assignment: {
      assignmentId: assignmentId,
      fileId: fileId,
      userId: userId,
      assignedAt: assignedAt,
      status: 'Active'
    },
    fileData: fileData
  }
  if (trashError) response.trashError = trashError
  if (deleteError) response.deleteError = deleteError
  return json(response)
}

function handleSaveProgress(body) {
  var assignmentId = body.assignmentId
  var progressData = body.progressData
  if (!assignmentId) return json({ error: 'Missing assignmentId' })

  var sheet = getAssignmentsSheet()
  var data = sheet.getDataRange().getValues()

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').trim() === assignmentId) {
      sheet.getRange(i + 1, 7).setValue(JSON.stringify(progressData))
      return json({ success: true })
    }
  }

  return json({ error: 'Assignment not found' })
}

function handleLoadProgress(body) {
  var assignmentId = body.assignmentId
  if (!assignmentId) return json({ error: 'Missing assignmentId' })

  var sheet = getAssignmentsSheet()
  var data = sheet.getDataRange().getValues()

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').trim() === assignmentId) {
      var progressStr = String(data[i][6] || '')
      var fileData = String(data[i][7] || '')
      var progressData = null

      if (progressStr) {
        try {
          progressData = JSON.parse(progressStr)
        } catch (e) {
          progressData = null
        }
      }

      return json({
        progressData: progressData,
        fileData: fileData,
        assignment: {
          assignmentId: String(data[i][0] || ''),
          fileId: String(data[i][1] || ''),
          userId: String(data[i][2] || ''),
          assignedAt: String(data[i][3] || ''),
          completedAt: String(data[i][4] || ''),
          status: String(data[i][5] || '')
        }
      })
    }
  }

  return json({ error: 'Assignment not found' })
}

function handleMarkComplete(body) {
  var assignmentId = body.assignmentId
  if (!assignmentId) return json({ error: 'Missing assignmentId' })

  var sheet = getAssignmentsSheet()
  var data = sheet.getDataRange().getValues()

  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0] || '').trim() === assignmentId) {
      var completedAt = now()
      sheet.getRange(i + 1, 5).setValue(completedAt)
      sheet.getRange(i + 1, 6).setValue('Completed')
      return json({ success: true, completedAt: completedAt })
    }
  }

  return json({ error: 'Assignment not found' })
}

function handleGetQueueStats(body) {
  var userId = body.userId

  var filesSheet = getFilesSheet()
  var filesData = filesSheet.getDataRange().getValues()
  var totalFiles = Math.max(0, filesData.length - 1)

  var assignmentsSheet = getAssignmentsSheet()
  var assignmentsData = assignmentsSheet.getDataRange().getValues()
  var activeCount = 0
  var completedCount = 0

  for (var i = 1; i < assignmentsData.length; i++) {
    if (String(assignmentsData[i][2] || '').trim() === userId) {
      var status = String(assignmentsData[i][5] || '').trim()
      if (status === 'Active') activeCount++
      else if (status === 'Completed') completedCount++
    }
  }

  return json({
    totalFiles: totalFiles,
    activeCount: activeCount,
    completedCount: completedCount
  })
}
