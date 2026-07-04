import { Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useWindowFocused } from '../hooks/useWindowFocused'
import { getLockPrivacyPreference, LOCK_SWITCHER_HIDE_KEY } from '../lib/contentProtection'

export default function LockedNoteShield ({ active }) {
  const focused = useWindowFocused()
  const [enabled, setEnabled] = useState(true)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    getLockPrivacyPreference(LOCK_SWITCHER_HIDE_KEY).then((value) => {
      if (!cancelled) setEnabled(value)
    })
    return () => {
      cancelled = true
    }
  }, [active])

  if (!active || !enabled || focused) return null

  return (
    <div className='fixed inset-0 z-[5000] bg-bg-primary flex flex-col items-center justify-center gap-6'>
      <div className='w-20 h-20 rounded-[2rem] bg-accent-primary/10 border border-accent-primary/20 flex items-center justify-center'>
        <Lock className='w-9 h-9 text-accent-primary' />
      </div>
      <span className='text-text-primary text-xl font-black tracking-tight'>Pear Notes</span>
    </div>
  )
}
