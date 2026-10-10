import { useLocalToggle } from './useLocalToggle'

export const useSpellcheck = () => useLocalToggle('spellcheck', true)
