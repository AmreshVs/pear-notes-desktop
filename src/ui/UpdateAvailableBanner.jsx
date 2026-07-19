import { Download, X } from 'lucide-react'
import { useState } from 'react'

const DISMISSED_VERSION_KEY = 'pear-notes:update-banner-dismissed-version'

export default function UpdateAvailableBanner({ latestVersion, downloadUrl }) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(DISMISSED_VERSION_KEY) === latestVersion
  )

  if (dismissed) return null

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_VERSION_KEY, latestVersion)
    setDismissed(true)
  }

  const handleUpdate = () => {
    window.electronBridge.openExternal(downloadUrl)
  }

  return (
    <div className="fixed bottom-6 right-6 w-80 bg-bg-secondary border border-border-primary rounded-xl shadow-2xl p-4 flex flex-col gap-3 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0 bg-accent-primary/10 text-accent-primary">
          <Download className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="text-text-primary font-semibold text-sm truncate">Update available</h4>
          <p className="text-text-tertiary text-xs truncate">Version {latestVersion} is ready to install</p>
        </div>

        <button
          onClick={handleDismiss}
          className="w-7 h-7 rounded-full flex items-center justify-center text-text-tertiary hover:text-text-primary hover:bg-bg-tertiary transition-all shrink-0"
          title="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <button
        onClick={handleUpdate}
        className="w-full py-2 bg-accent-primary text-accent-on-primary rounded-lg font-semibold text-sm hover:bg-accent-primary-hover transition-all active:scale-95"
      >
        Update Now
      </button>
    </div>
  )
}
