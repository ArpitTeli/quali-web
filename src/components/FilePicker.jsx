import React, { useState, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Card, CardContent, CardHeader } from './base-ui/card'
import { Button } from './base-ui/button'
import { Badge } from './base-ui/badge'
import { cn } from '../lib/utils'
import { detectColumns } from '../lib/excel'

function FilePicker({ onFileLoad }) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState(null)
  const [loadedFile, setLoadedFile] = useState(null)
  const fileInputRef = useRef(null)

  const processFile = useCallback(async (file) => {
    setError(null)
    try {
      const data = await file.arrayBuffer()
      const workbook = XLSX.read(data, { type: 'array' })
      const sheetNames = workbook.SheetNames
      const defaultSheet = sheetNames[0]
      const sheets = {}

      for (const name of sheetNames) {
        const sheet = workbook.Sheets[name]
        const jsonData = XLSX.utils.sheet_to_json(sheet, { defval: '' })
        const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : []
        sheets[name] = { data: jsonData, headers }
      }

      const allRows = sheets[defaultSheet]?.data || []
      const headers = sheets[defaultSheet]?.headers || []
      const columnMapping = detectColumns(headers)

      setLoadedFile({ name: file.name, size: file.size })
      onFileLoad({
        data: { sheets, sheetNames, defaultSheet, filePath: file.name },
        columnMapping,
        rowCount: allRows.length,
        fileName: file.name,
        fileSize: file.size
      })
    } catch (err) {
      setError(err.message || 'Failed to parse Excel file')
    }
  }, [onFileLoad])

  const handleBrowse = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (file) processFile(file)
  }, [processFile])

  const handleRemove = useCallback((e) => {
    e.stopPropagation()
    setLoadedFile(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }, [])

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className="file-upload-wrapper">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />
      <Card
        className={cn(
          'file-upload-card',
          isDragging && 'file-upload-card-dragging',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !loadedFile && handleBrowse()}
      >
        <CardHeader>
          <div className="file-upload-header-text">
            <h2>Load Excel</h2>
            <p>Drop your spreadsheet or click to browse</p>
          </div>
        </CardHeader>
        <CardContent
          className={cn(
            'file-upload-dropzone',
            isDragging && 'file-upload-dropzone-active',
          )}
        >
          <div className="file-upload-stripes" />

          {!loadedFile ? (
            <>
              <div className="file-upload-icon-circle">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <h3 className="file-upload-title">
                Click to upload <span>or drag and drop</span>
              </h3>
              <p className="file-upload-hint">.xlsx and .xls files</p>
              <Button
                type="button"
                variant="secondary"
                className="file-upload-browse-btn"
                onClick={(e) => {
                  e.stopPropagation()
                  handleBrowse()
                }}
              >
                Browse Files
              </Button>
            </>
          ) : (
            <div className="file-upload-loaded" onClick={(e) => e.stopPropagation()}>
              <div className="file-upload-loaded-icon">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              </div>
              <div className="file-upload-loaded-info">
                <p className="file-upload-loaded-name">{loadedFile.name}</p>
                <p className="file-upload-loaded-size">{formatFileSize(loadedFile.size)}</p>
              </div>
              <Badge variant="secondary" className="file-upload-done-badge">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Loaded
              </Badge>
              <button className="file-upload-remove" onClick={handleRemove} title="Remove">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="file-upload-error">{error}</div>
      )}
    </div>
  )
}

export default FilePicker
