import { Component, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props { children: ReactNode; onReset?: () => void }
interface State { error: Error | null }

/** Catches render errors so a bad frame never blanks the whole editor. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }
  static getDerivedStateFromError(error: Error): State {
    return { error }
  }
  componentDidCatch(error: Error) {
    console.error('Editor error:', error)
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-danger-soft text-danger"><AlertTriangle size={18} /></span>
        <p className="text-[13px] font-semibold">Something went wrong while drawing the editor</p>
        <p className="max-w-md break-words font-mono text-[11px] text-ink-muted">{this.state.error.message}</p>
        <div className="flex gap-2">
          <button className="btn" onClick={() => { this.setState({ error: null }); this.props.onReset?.() }}>Try again</button>
          <button className="btn-dark" onClick={() => window.location.reload()}>Reload</button>
        </div>
      </div>
    )
  }
}
