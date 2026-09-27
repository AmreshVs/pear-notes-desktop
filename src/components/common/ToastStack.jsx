import { createContext, useContext, useState } from 'react'
import { createPortal } from 'react-dom'

const ToastStackContext = createContext(null)

export function ToastStackProvider({ children }) {
  const [node, setNode] = useState(null)

  return (
    <ToastStackContext.Provider value={node}>
      {children}
      <div
        ref={setNode}
        className='fixed top-14 right-6 z-[120] flex flex-col items-end gap-3 max-w-[calc(100%-3rem)] pointer-events-none *:pointer-events-auto'
      />
    </ToastStackContext.Provider>
  )
}

export function Toast({ children }) {
  const node = useContext(ToastStackContext)
  return node ? createPortal(children, node) : null
}
