import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'

import { clearUnlockedNotes, useHasUnlockedNotes } from '../../lib/noteLock'

const ICON_SIZE = 11

export const LockNowButton = memo(function LockNowButton() {
  const { t } = useTranslation()
  const hasUnlockedNotes = useHasUnlockedNotes()

  const handleLockNow = useCallback(() => {
    clearUnlockedNotes()
  }, [])

  if (!hasUnlockedNotes) return null

  return (
    <button
      type='button'
      onClick={handleLockNow}
      title={t('folderView.lockNowA11y')}
      aria-label={t('folderView.lockNowA11y')}
      className='inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider text-accent-primary bg-bg-tertiary/50 hover:bg-bg-tertiary active:scale-95 transition-all duration-200'
    >
      <Lock size={ICON_SIZE} strokeWidth={2.5} />
      {t('folderView.lockNow')}
    </button>
  )
})
