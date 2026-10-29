import { Component } from 'react'
import i18next from 'i18next'

import { version as appVersion } from '../../../package.json'

import CrashScreen from './CrashScreen'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, componentStack: '' }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('Unhandled render error:', error, info?.componentStack)
    this.setState({ componentStack: info?.componentStack || '' })
  }

  handleReload = () => {
    location.reload()
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const { error, componentStack } = this.state
    // String(error) is "TypeError: ..." - the same line the stack opens with.
    const message = String(error)
    const stack = [error?.stack, componentStack && `Component stack:${componentStack}`]
      .filter(Boolean)
      .join('\n\n')
    return (
      <CrashScreen
        crash={{ source: 'render', error: message, log: stack, env: { appVersion } }}
        title={i18next.t('errorBoundary.title')}
        message={i18next.t('errorBoundary.description')}
        actionLabel={i18next.t('errorBoundary.reload')}
        onAction={this.handleReload}
      />
    )
  }
}
