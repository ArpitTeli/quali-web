import { useState, useEffect } from 'react'
import { Folder, File, ChevronRight, ChevronDown } from 'lucide-react'
import * as api from '../services/api'

function buildTree(files) {
  const root = []
  const map = {}

  for (const f of files) {
    let folderPath = f.folderPath
    let cleanFilename = f.filename

    if (!folderPath) {
      const lastSlash = f.filename.lastIndexOf('/')
      if (lastSlash > 0) {
        folderPath = f.filename.substring(0, lastSlash)
        cleanFilename = f.filename.substring(lastSlash + 1)
      }
    }

    f._cleanName = cleanFilename

    if (!folderPath) {
      let node = map['__root__']
      if (!node) {
        node = { name: '', path: '', children: [], files: [] }
        map['__root__'] = node
        root.push(node)
      }
      node.files.push(f)
      continue
    }

    const parts = folderPath.split('/')
    let currentPath = ''

    for (let i = 0; i < parts.length; i++) {
      const parentPath = currentPath
      currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i]

      if (!map[currentPath]) {
        const node = { name: parts[i], path: currentPath, children: [], files: [] }
        map[currentPath] = node
        if (parentPath && map[parentPath]) {
          map[parentPath].children.push(node)
        } else {
          root.push(node)
        }
      }
    }

    map[currentPath].files.push(f)
  }

  function sortNode(node) {
    node.children.sort((a, b) => a.name.localeCompare(b.name))
    node.files.sort((a, b) => a.filename.localeCompare(b.filename))
    node.children.forEach(sortNode)
  }
  root.forEach(sortNode)

  return root
}

function getAssignmentForFile(fileId, assignments) {
  if (!assignments) return null
  return assignments.find(a => a.fileId === fileId && a.status === 'Active') || null
}

function getFileStatus(file, assignments) {
  const myAssignment = getAssignmentForFile(file.fileId, assignments)
  if (myAssignment) {
    if (myAssignment.completedAt) return { type: 'completed', label: 'Completed', color: '#4ade80' }
    return { type: 'yours', label: 'Claimed ✓', color: '#60a5fa' }
  }
  const otherAssignment = assignments ? assignments.find(a => a.fileId === file.fileId && a.status === 'Active') : null
  if (otherAssignment) return { type: 'assigned', label: 'Assigned', color: '#facc15' }
  return { type: 'available', label: 'Available', color: '#71717a' }
}

function FileNode({ file, assignments, onClaim, claimLoading }) {
  const status = getFileStatus(file, assignments)
  const canClaim = status.type === 'available'

  return (
    <div className="fb-file-row">
      <File size={15} className="fb-file-icon" />
      <span className="fb-file-name">{file._cleanName || file.filename}</span>
      <span className="fb-file-badge" style={{ color: status.color, borderColor: status.color + '33' }}>
        {status.label}
      </span>
      {canClaim && (
        <button
          className="fb-btn fb-btn-claim"
          onClick={() => onClaim(file)}
          disabled={claimLoading}
        >
          {claimLoading === file.fileId ? 'Loading...' : 'Claim'}
        </button>
      )}
    </div>
  )
}

function TreeNode({ node, depth, expanded, toggle, assignments, onClaim, claimLoading }) {
  const isExpanded = expanded.has(node.path)
  const hasItems = node.children.length > 0 || node.files.length > 0

  return (
    <div>
      {node.name && (
        <button
          className="fb-folder-row"
          style={{ paddingLeft: `${12 + depth * 20}px` }}
          onClick={() => toggle(node.path)}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Folder size={15} className="fb-folder-icon" />
          <span className="fb-folder-name">{node.name}</span>
          <span className="fb-folder-count">
            {node.files.length + node.children.reduce((s, c) => s + c.files.length + c.children.length, 0)} items
          </span>
        </button>
      )}
      {(!node.name || isExpanded) && (
        <>
          {node.children.map(child => (
            <TreeNode
              key={child.path}
              node={child}
              depth={depth + (node.name ? 1 : 0)}
              expanded={expanded}
              toggle={toggle}
              assignments={assignments}
              onClaim={onClaim}
              claimLoading={claimLoading}
            />
          ))}
          {node.files.map(f => (
            <FileNode
              key={f.fileId}
              file={f}
              assignments={assignments}
              onClaim={onClaim}
              claimLoading={claimLoading}
            />
          ))}
        </>
      )}
    </div>
  )
}

export default function FileBrowser({ onClaim, onBack, userId }) {
  const [tree, setTree] = useState([])
  const [assignments, setAssignments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useState(new Set())
  const [claimLoading, setClaimLoading] = useState(null)

  function loadTree() {
    setLoading(true)
    setError('')
    api.getFileTree(userId).then(result => {
      if (result.error) {
        setError(result.error)
      } else {
        setTree(result.tree || [])
        setAssignments(result.assignments || [])
      }
      setLoading(false)
    }).catch(() => {
      setError('Failed to load files')
      setLoading(false)
    })
  }

  useEffect(() => { loadTree() }, [])

  function toggle(path) {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }

  function handleClaim(file) {
    setClaimLoading(file.fileId)
    api.claimFile(userId, file.fileId).then(result => {
      setClaimLoading(null)
      if (result.error) {
        setError(result.error)
      } else {
        try {
          onClaim(result.assignment, result.fileData, file)
        } catch (e) {
          console.error('[FileBrowser] onClaim error:', e)
          setError('Failed to load file: ' + e.message)
        }
      }
    }).catch(e => {
      console.error('[FileBrowser] claimFile error:', e)
      setError('Failed to claim file')
      setClaimLoading(null)
    })
  }

  return (
    <div className="fb-container">
      <div className="fb-header">
        <div className="fb-header-left">
          <button className="fb-back-btn" onClick={onBack}>← Back</button>
          <div className="fb-header-info">
            <h2>Lead Files</h2>
            <p>Browse folders and claim lead sheets.</p>
          </div>
        </div>
        <button className="fb-refresh-btn" onClick={loadTree} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </button>
      </div>

      {error && <p className="fb-error">{error}</p>}

      {loading ? (
        <div className="fb-loading">
          <div className="wheel-and-hamster">
            <div className="wheel"><div className="spoke"></div></div>
            <div className="hamster">
              <div className="hamster__head">
                <div className="hamster__ear"></div>
                <div className="hamster__eye"></div>
                <div className="hamster__nose"></div>
              </div>
              <div className="hamster__body">
                <div className="hamster__limb--fr"></div>
                <div className="hamster__limb--fl"></div>
                <div className="hamster__limb--br"></div>
                <div className="hamster__limb--bl"></div>
                <div className="hamster__tail"></div>
              </div>
            </div>
          </div>
          <p style={{ color: '#666', fontSize: '13px' }}>Loading files...</p>
        </div>
      ) : (
        <div className="fb-tree">
          {tree.length === 0 ? (
            <p className="fb-empty">No files uploaded yet.</p>
          ) : (
            tree.map(node => (
              <TreeNode
                key={node.path || '__root__'}
                node={node}
                depth={0}
                expanded={expanded}
                toggle={toggle}
                assignments={assignments}
                onClaim={handleClaim}
                claimLoading={claimLoading}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}
