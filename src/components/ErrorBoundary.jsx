import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary] Error:', error.message)
    console.error('[ErrorBoundary] Stack:', error.stack)
    console.error('[ErrorBoundary] Component Stack:', errorInfo.componentStack)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app">
          <header className="app-header">
            <h1>Quali</h1>
          </header>
          <main className="app-main" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
            <div style={{ color: '#f87171', fontSize: 18 }}>Something went wrong</div>
            <div style={{ color: '#e4e4e7', fontSize: 13, fontFamily: 'monospace', maxWidth: 600, textAlign: 'left', background: '#1a1a2e', padding: 12, borderRadius: 8, overflow: 'auto', maxHeight: 200, whiteSpace: 'pre-wrap' }}>
              {this.state.error?.message}
              {'\n\n'}
              {this.state.errorInfo?.componentStack?.substring(0, 500)}
            </div>
            <button
              className="btn btn-primary"
              onClick={() => { this.setState({ hasError: false, error: null, errorInfo: null }); window.location.reload() }}
              style={{ marginTop: 12 }}
            >
              Reload App
            </button>
          </main>
        </div>
      )
    }
    return this.props.children
  }
}
