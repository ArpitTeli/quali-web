import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app">
          <header className="app-header">
            <h1>Quali</h1>
          </header>
          <main className="app-main" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
            <div style={{ color: '#f87171', fontSize: 18 }}>Something went wrong</div>
            <div style={{ color: '#a1a1aa', fontSize: 14, maxWidth: 500, textAlign: 'center' }}>
              {this.state.error?.message || 'An unexpected error occurred'}
            </div>
            <button
              className="btn btn-primary"
              onClick={() => { this.setState({ hasError: false, error: null }); window.location.reload() }}
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
