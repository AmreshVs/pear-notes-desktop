import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { SCROLL_JUMP, useScrollJump } from '../../hooks/useScrollJump'

export default function ScrollJumpButton({ scrollEl, resetKey }) {
  const { t } = useTranslation()
  const { direction, jump } = useScrollJump(scrollEl, resetKey)
  if (!direction) return null
  const down = direction === SCROLL_JUMP.DOWN
  const label = t(down ? 'noteEditor.scrollToBottom' : 'noteEditor.scrollToTop')
  const Icon = down ? ChevronDown : ChevronUp
  return (
    <button
      type='button'
      onClick={jump}
      title={label}
      aria-label={label}
      className='w-11 h-11 rounded-full bg-bg-secondary border border-border-primary text-text-secondary hover:text-text-primary shadow-lg flex items-center justify-center transition-all active:scale-95 animate-in fade-in zoom-in-95 duration-150'
    >
      <Icon className='w-5 h-5' />
    </button>
  )
}
