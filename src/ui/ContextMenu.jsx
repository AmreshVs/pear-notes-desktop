
import {
  Folder,
  Trash2,
  Check,
  ChevronRight,
  Copy
} from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'

export default function ContextMenu({
  position,
  onClose,
  items
}) {
  const menuRef = useRef(null)
  const [submenu, setSubmenu] = useState(null)

  return createPortal(
    <>
       <div 
        className="fixed inset-0 z-[9998]" 
        onMouseDown={onClose}
        onContextMenu={(e) => {
            e.preventDefault()
            onClose()
        }}
       />
      <div
        ref={menuRef}
        className="fixed z-[9999] w-48 bg-gray-900/95 backdrop-blur-xl border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 text-gray-100"
        style={{ top: position.y, left: position.x }}
        onMouseLeave={() => setSubmenu(null)}
      >
        <div className="p-1">
            {items.map((item, index) => {
                if (item.type === 'separator') {
                    return <div key={index} className="h-px bg-white/[0.1] my-1" />
                }
                
                const Icon = item.icon
                
                return (
                 <div key={index} className="relative">
                    <button
                        onClick={(e) => {
                            if (item.submenu) return
                            item.onClick?.()
                            onClose()
                        }}
                        onMouseEnter={() => {
                            if (item.submenu) {
                                setSubmenu(item.id)
                            } else {
                                setSubmenu(null)
                            }
                        }}
                        className={`w-full flex items-center justify-between px-3 py-2 text-[13px] rounded-lg transition-colors text-left ${item.danger ? 'text-red-400 hover:bg-red-400/10' : 'text-gray-200 hover:bg-white/10'} ${submenu === item.id ? 'bg-white/10' : ''}`}
                    >
                        <div className="flex items-center gap-2.5">
                            {Icon && <Icon className="w-4 h-4" />}
                            <span className="font-medium">{item.label}</span>
                        </div>
                        {item.submenu && <ChevronRight className="w-3 h-3 opacity-50" />}
                    </button>
                    
                    {/* Submenu */}
                    {item.submenu && submenu === item.id && (
                        <div 
                            className="absolute top-0 left-full ml-1 w-44 bg-gray-900/95 backdrop-blur-xl border border-white/[0.1] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                        >
                            <div className="p-1 max-h-60 overflow-y-auto scrollbar-hide">
                                {item.submenu.map((subItem, subIndex) => (
                                    <button
                                        key={subIndex}
                                        onClick={() => {
                                            subItem.onClick?.()
                                            onClose()
                                        }}
                                        className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-gray-200 hover:bg-white/10 rounded-lg transition-colors text-left truncate"
                                    >
                                        <Folder className="w-3.5 h-3.5 opacity-70" />
                                        <span className="font-medium truncate">{subItem.label}</span>
                                    </button>
                                ))}
                                {item.submenu.length === 0 && (
                                     <div className="px-3 py-2 text-[11px] text-gray-500 italic text-center">Empty</div>
                                )}
                            </div>
                        </div>
                    )}
                 </div>
                )
            })}
        </div>
      </div>
    </>,
    document.body
  )
}
