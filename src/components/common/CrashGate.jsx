import { useSyncExternalStore } from 'react'
import i18next from 'i18next'

import { getCrash, subscribeCrash } from '../../lib/crashReport'

import CrashScreen from './CrashScreen'

const SOURCE_COPY = {
  backend: ['crash.backendTitle', 'crash.backendMessage'],
  launch: ['crash.launchTitle', 'crash.launchMessage'],
  renderer: ['crash.rendererTitle', 'crash.rendererMessage']
}

export default function CrashGate({ children }) {
  const crash = useSyncExternalStore(subscribeCrash, getCrash)

  const [titleKey, messageKey] = SOURCE_COPY[crash?.source] || []
  return (
    <>
      {children}
      {crash && (
        <CrashScreen
          crash={crash}
          title={crash.title || i18next.t(titleKey)}
          message={crash.message || i18next.t(messageKey)}
          actionLabel={i18next.t('crash.restart')}
          onAction={() => window.electronBridge.relaunch()}
        />
      )}
    </>
  )
}
