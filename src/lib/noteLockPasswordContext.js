import { createContext, useContext } from 'react'

export const NoteLockPasswordContext = createContext(null)

export function useNoteLockPassword() {
  return useContext(NoteLockPasswordContext)
}
