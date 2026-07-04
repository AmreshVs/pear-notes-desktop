import { useEffect, useState } from 'react'

export function useWindowFocused () {
  const [focused, setFocused] = useState(() =>
    typeof document !== 'undefined' ? document.hasFocus() : true
  )

  useEffect(() => {
    const onFocus = () => setFocused(true)
    const onBlur = () => setFocused(false)
    window.addEventListener('focus', onFocus)
    window.addEventListener('blur', onBlur)
    return () => {
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('blur', onBlur)
    }
  }, [])

  return focused
}
