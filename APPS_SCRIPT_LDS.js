// ===== QUALI WEB — LDS (Lead Distribution System) Apps Script =====
//
// SETUP:
// 1. In your Auth Google Sheet, go to Extensions → Apps Script
// 2. Paste this code
// 3. Deploy → New Deployment → Web App → Execute as: Me → Access: Anyone
// 4. Copy the deployment URL and add it to qual-web/src/services/api.js as LDS_SCRIPT_URL
//
// This script auto-creates two tabs in your Auth Sheet:
//   LDS_Files       — tracks Excel files in your Google Drive folder
//   LDS_Assignments — tracks user assignments, progress, and cached file data
//
// Config:
var FOLDER_ID = '15my4rIu1E0QBZUKfBYepAtdSQ2eH4sbf' // Google Drive folder ID

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents)
    var action = body.action

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
  return ContentService.createTextOutput('Quali LDS API — Use POST')
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
    sheet.getRange(1, 1, 1, 8).setValues([['AssignmentID', 'FileID', 'UserID', 'AssignedAt', 'CompletedAt', 'Status', 'ProgressData', 'FileData']])
    sheet.getRange(1, 1, 1, 8).setFontWeight('bold')
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

// ===== Get File Tree =====

function handleGetFileTree(body) {
  var userId = body.userId
  if (!userId) return json({ error: 'Missing userId' })

  var files = scanDriveFolder()
  var syncResult = syncFilesToSheet(files)
  var assignments = getUserAssignments(userId)
  var tree = buildTree(syncResult.sheetFiles, assignments)

  return json({ tree: tree, assignments: assignments })
}

function scanDriveFolder() {
  try {
    var folder = DriveApp.getFolderById(FOLDER_ID)
    var files = []
    scanFolder(folder, '', files)
    return files
  } catch (err) {
    return []
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
      result.push({
        assignmentId: String(data[i][0] || ''),
        fileId: String(data[i][1] || ''),
        userId: String(data[i][2] || ''),
        assignedAt: String(data[i][3] || ''),
        completedAt: String(data[i][4] || ''),
        status: String(data[i][5] || ''),
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

// ===== Claim File =====

function handleClaimFile(body) {
  var userId = body.userId
  var fileId = body.fileId
  if (!userId || !fileId) return json({ error: 'Missing userId or fileId' })

  var sheet = getAssignmentsSheet()
  var data = sheet.getDataRange().getValues()

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

  var file
  try {
    file = DriveApp.getFileById(fileId)
  } catch (err) {
    return json({ error: 'File not found in Drive' })
  }

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
    fileData
  ])

  return json({
    assignment: {
      assignmentId: assignmentId,
      fileId: fileId,
      userId: userId,
      assignedAt: assignedAt,
      status: 'Active'
    },
    fileData: fileData
  })
}

// ===== Save Progress =====

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

// ===== Load Progress =====

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

// ===== Mark Complete =====

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

// ===== Get Queue Stats =====

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
