import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Without this, an uncaught render error anywhere in the tree is a silent
 * blank white screen with no way for a non-technical user to report what
 * happened. This shows the actual error instead. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Uncaught render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'sans-serif' }}>
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 12 }}>Une erreur est survenue</div>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 16, wordBreak: 'break-word' }}>
              {this.state.error.message}
            </div>
            <button
              onClick={() => window.location.reload()}
              style={{ background: '#f5c518', border: 'none', borderRadius: 10, padding: '12px 20px', fontWeight: 700, cursor: 'pointer' }}
            >
              Recharger la page
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
