import { Link2, Check, Info, Monitor, Smartphone, Plus, ShieldCheck, Globe, Loader2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { createInvite, getInvite, getInviteExpiresAt, getSyncIsLoading, subscribePairUser, getInviterStatus } from '../store/slices/syncSlice'
import { setShowSettings } from '../store/slices/uiSlice'
import { getSyncedDevices, deleteSyncedDevice, updateSyncedDevice, getLocalPreferences } from '../store/slices/syncedDevicesSlice'

const PLATFORM_NAMES = {
  'darwin': 'macOS',
  'win32': 'Windows',
  'linux': 'Linux',
  'android': 'Android',
  'ios': 'iOS'
}

function getPlatformName(platform) {
  return PLATFORM_NAMES[platform] || platform
}

export default function SyncSettings() {
  const dispatch = useDispatch()
  const inviteCode = useSelector(getInvite)
  const expiresAt = useSelector(getInviteExpiresAt)
  const isLoading = useSelector(getSyncIsLoading)
  const { step } = useSelector(getInviterStatus)
  const syncedDevices = useSelector(getSyncedDevices)
  const localPreferences = useSelector(getLocalPreferences)
  const isSynced = localPreferences['isSynced'] === 'true'
  
  const isInviteGenerated = !!inviteCode
  
  const [syncTab, setSyncTab] = useState('invite')
  const [copied, setCopied] = useState(false)
  const [pasteCode, setPasteCode] = useState('')

  const handleCopyInvite = () => {
    if (!isInviteGenerated) return
    navigator.clipboard.writeText(inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleCreateInvite = () => {
    dispatch(createInvite())
  }

  const handleConnect = () => {
    if (pasteCode.trim()) {
      dispatch(subscribePairUser({ invite: pasteCode.trim() }))
      setPasteCode('')
      dispatch(setShowSettings(false))
    }
  }

  const formatExpiration = (timestamp) => {
    if (!timestamp) return ''
    const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp
    const date = new Date(ms)
    if (isNaN(date.getTime())) return ''
    return `Expires at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
  }

  return (
    <div className='max-w-3xl mx-auto px-6 py-4 space-y-6'>
      <div className='flex p-1 bg-bg-panel-secondary rounded-xl border border-border-primary w-fit mx-auto'>
        <button
          onClick={() => setSyncTab('invite')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            syncTab === 'invite'
              ? 'bg-bg-quaternary text-text-primary'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          Link Device
        </button>
        <button
          onClick={() => setSyncTab('manage')}
          className={`px-6 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
            syncTab === 'manage'
              ? 'bg-bg-quaternary text-text-primary'
              : 'text-text-tertiary hover:text-text-secondary'
          }`}
        >
          My Devices
        </button>
      </div>

      <div className='space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-400'>
        {syncTab === 'invite' ? (
          <div className='space-y-6'>
              <>
                {!isInviteGenerated ? (
                  <div className='bg-bg-panel-secondary/40 backdrop-blur-md border border-border-primary rounded-2xl p-10 flex flex-col items-center text-center space-y-5 transition-all hover:border-border-secondary'>
                    <div className='w-20 h-20 bg-accent-primary/5 rounded-3xl flex items-center justify-center ring-1 ring-accent-primary/10 shadow-inner'>
                      <Globe className='w-10 h-10 text-accent-primary animate-pulse' />
                    </div>
                    <div className='space-y-2'>
                      <h3 className='text-text-primary font-bold text-xl'>Link Your Devices</h3>
                      <p className='text-text-tertiary text-sm max-w-sm leading-relaxed'>
                        Create a secure, end-to-end encrypted connection to sync your notes across devices instantly.
                      </p>
                    </div>
                    <button
                      onClick={handleCreateInvite}
                      disabled={isLoading}
                      className='group relative px-10 py-3 bg-accent-primary text-text-primary rounded-lg font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden flex items-center justify-center gap-2'
                    >
                      <div className='absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity' />
                      {isLoading && <Loader2 className='w-4 h-4 animate-spin' />}
                      {isLoading ? 'Preparing Secure Link...' : 'Generate New Invite'}
                    </button>
                  </div>
                ) : (
                  <div className='space-y-5'>
                    <div className='bg-bg-panel-secondary/60 backdrop-blur-lg border border-border-primary rounded-2xl p-8 relative overflow-hidden'>
                      <div className='absolute -top-24 -right-24 w-48 h-48 bg-accent-primary/5 blur-3xl rounded-full pointer-events-none' />
                      
                      <div className='flex items-center gap-3 mb-6'>
                        <div className='w-10 h-10 bg-accent-primary/10 rounded-full flex items-center justify-center border border-accent-primary/20'>
                          <ShieldCheck className='w-5 h-5 text-accent-primary' />
                        </div>
                        <div>
                          <h4 className='text-text-primary font-semibold'>Invitation Ready</h4>
                          <p className='text-xs text-text-tertiary font-medium bg-bg-panel-tertiary/50 px-2 py-0.5 rounded-full inline-block mt-1'>
                            {expiresAt ? formatExpiration(expiresAt) : 'Permanent Link'}
                          </p>
                        </div>
                      </div>

                      <div className='space-y-3'>
                        <label className='text-[10px] uppercase tracking-wider font-bold text-text-tertiary ml-1'>
                          Secure Pair Code
                        </label>
                        <div className='relative group'>
                          <input
                            type='text'
                            readOnly
                            value={inviteCode}
                            className='w-full px-5 py-4 bg-bg-panel/50 border border-border-secondary rounded-xl text-text-primary font-mono text-base tracking-wider shadow-inner outline-none transition-all group-hover:border-border-primary'
                          />
                        </div>
                      </div>

                      <button
                        onClick={handleCopyInvite}
                        className={`w-full flex items-center justify-center gap-2 mt-6 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                          copied 
                            ? 'bg-accent-success text-white' 
                            : 'bg-accent-primary text-text-primary'
                        }`}
                      >
                        {copied ? (
                          <><Check className='w-4 h-4' strokeWidth={2.5} /> Code Copied!</>
                        ) : (
                          <><Link2 className='w-4 h-4' /> Copy Invite Code</>
                        )}
                      </button>
                    </div>

                    <div className='bg-accent-primary/5 border border-accent-primary/10 rounded-xl p-4 flex gap-4 items-start'>
                      <Info className='w-5 h-5 text-accent-primary shrink-0' />
                      <p className='text-xs text-text-tertiary leading-relaxed'>
                        For security, don&apos;t share this code in public channels as it grants full access to your notes.
                      </p>
                    </div>
                  </div>
                )}

                {!isSynced && <div className='pt-6 border-t border-border-primary space-y-4'>
                  <div className='flex items-center gap-2 ml-1'>
                    <Plus className='w-4 h-4 text-accent-primary' />
                    <h4 className='font-bold text-sm text-text-primary'>Already have an invite?</h4>
                  </div>
                  
                  <div className='relative flex gap-2'>
                    <input
                      type='text'
                      value={pasteCode}
                      onChange={(e) => setPasteCode(e.target.value)}
                      placeholder='Paste invite code here...'
                      className='flex-1 px-4 py-3 rounded-xl bg-bg-panel-secondary/50 border border-border-primary text-text-primary text-sm focus:outline-none focus:border-accent-primary transition-all placeholder:text-text-tertiary/50'
                    />
                    <button 
                      onClick={handleConnect}
                      disabled={!pasteCode.trim() || isLoading || step !== 'idle'}
                      className='px-6 py-2.5 bg-accent-primary text-text-primary rounded-lg hover:bg-accent-primary-hover disabled:bg-bg-panel-tertiary disabled:text-text-tertiary disabled:cursor-not-allowed transition-all text-sm font-medium border border-accent-primary active:scale-95 flex items-center gap-2'
                    >
                      {isLoading && <Loader2 className='w-4 h-4 animate-spin' />}
                      Link Device
                    </button>
                  </div>
                </div>}
              </>
          </div>
        ) : (
          <div className='space-y-6'>
            {/* This Device Section */}
            <div className='space-y-4'>
              <div className='flex items-center justify-between px-1'>
                <h4 className='text-text-tertiary font-bold text-[10px] uppercase tracking-widest'>This Device</h4>
              </div>
              <div className='grid gap-4'>
                {syncedDevices.filter(d => d.isLocal).map(device => (
                  <DeviceItem key={device.key} device={device} />
                ))}
              </div>
            </div>

            {/* Other Devices Section */}
            <div className='space-y-4'>
              <div className='flex items-center justify-between px-1'>
                <h4 className='text-text-tertiary font-bold text-[10px] uppercase tracking-widest'>Other Devices</h4>
              </div>
              <div className='grid gap-4'>
                {syncedDevices.filter(d => !d.isLocal).length > 0 ? (
                  syncedDevices.filter(d => !d.isLocal).map(device => (
                    <DeviceItem key={device.key} device={device} isOther />
                  ))
                ) : (
                  <div className='p-6 bg-bg-panel-secondary/20 border border-dashed border-border-primary rounded-2xl flex flex-col items-center text-center space-y-2'>
                    <div className='w-10 h-10 bg-bg-panel/30 rounded-full flex items-center justify-center text-text-tertiary'>
                      <Smartphone className='w-5 h-5 opacity-50' />
                    </div>
                    <p className='text-xs text-text-tertiary italic'>No other devices connected yet.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className='pt-2'>
          <p className='text-center text-xs text-text-tertiary px-4'>
            <ShieldCheck className='w-3.5 h-3.5 text-accent-primary inline mr-1.5 opacity-60' />
            Your data moves directly between devices using encrypted Hypercore logs. No central server involved.
          </p>
        </div>
      </div>
    </div>
  )
}

function DeviceItem({ device, isOther }) {
  const dispatch = useDispatch()
  const Icon = device.deviceType === 'desktop' ? Monitor : Smartphone
  const [isEditing, setIsEditing] = useState(false)
  const [editedTitle, setEditedTitle] = useState(device.title || '')
  
  const handleDoubleClick = () => {
    if (!isOther) {
      setIsEditing(true)
      setEditedTitle(device.title || '')
    }
  }

  const handleBlur = () => {
    if (editedTitle.trim() && editedTitle !== device.title) {
      dispatch(updateSyncedDevice({ key: device.key, title: editedTitle.trim() }))
    }
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleBlur()
    } else if (e.key === 'Escape') {
      setIsEditing(false)
      setEditedTitle(device.title || '')
    }
  }
  
  return (
    <div className='group relative p-5 bg-bg-panel-secondary/40 border border-border-primary rounded-2xl flex items-center gap-5 transition-all hover:bg-bg-panel-secondary/60 hover:border-border-secondary'>
      <div className='w-14 h-14 bg-bg-panel/50 rounded-2xl flex items-center justify-center text-accent-primary border border-border-primary shadow-inner relative'>
        <Icon className='w-7 h-7' />
        {device.isLocal && (
          <div className='absolute -bottom-1 -right-1 w-4 h-4 bg-accent-success border-2 border-bg-panel-secondary rounded-full shadow-sm' />
        )}
      </div>
      
      <div className='flex-1 min-w-0'>
        {isEditing ? (
          <input
            type='text'
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            autoFocus
            className='w-full font-bold text-text-primary text-base bg-bg-panel border border-accent-primary rounded px-3 py-2 outline-none'
          />
        ) : (
          <div>
            <span 
              className='font-bold text-text-primary text-base truncate cursor-pointer block'
              onDoubleClick={handleDoubleClick}
              title={device.isLocal ? 'Double-click to rename' : device.title}
            >
              {device.title || 'Unnamed Device'}
            </span>
            <p className='text-[11px] text-text-tertiary font-bold uppercase tracking-tight mt-1.5'>
              {getPlatformName(device.platform)}
            </p>
          </div>
        )}
      </div>

      {isOther && (
        <button 
          onClick={() => dispatch(deleteSyncedDevice({ key: device.key }))}
          className='opacity-0 group-hover:opacity-100 p-2 hover:bg-bg-panel-tertiary rounded-lg text-text-tertiary hover:text-accent-destructive transition-all flex items-center gap-2'
        >
          <Trash2 className='w-4 h-4' />
        </button>
      )}
    </div>
  )
}
