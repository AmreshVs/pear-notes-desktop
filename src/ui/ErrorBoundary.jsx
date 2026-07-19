import { Component } from 'react'
import { AlertTriangle } from 'lucide-react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info?.componentStack)
  }

  handleReload = () => {
    location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    return (
      <div className='fixed inset-0 z-[3000] flex items-center justify-center p-6 bg-bg-primary'>
        <div className='relative bg-bg-panel border border-border-primary rounded-[2rem] p-10 max-w-md w-full text-center'>
          <div className='flex flex-col items-center space-y-6'>
            <div className='w-20 h-20 bg-accent-danger/15 rounded-3xl flex items-center justify-center ring-1 ring-accent-danger/30'>
              <AlertTriangle className='w-10 h-10 text-accent-danger' />
            </div>

            <div className='space-y-2'>
              <h3 className='text-2xl font-bold text-text-primary tracking-tight'>
                Something went wrong
              </h3>
              <p className='text-text-tertiary text-sm leading-relaxed'>
                The app hit an unexpected error. Reloading will recover your notes without data loss.
              </p>
              {this.state.error?.message && (
                <p className='text-text-tertiary/70 text-xs font-mono mt-2 break-words'>
                  {this.state.error.message}
                </p>
              )}
            </div>

            <button
              onClick={this.handleReload}
              className='w-full py-4 bg-accent-primary text-accent-on-primary rounded-xl font-bold text-[15px] hover:bg-accent-primary-hover transition-all active:scale-95'
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    )
  }
}
