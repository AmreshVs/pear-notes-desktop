import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { LogIn } from 'lucide-react'

import { VAULT_NAME_MAX_LENGTH } from '@pear-notes/core/constant.js'
import { subscribePairUser } from '@pear-notes/core/store/slices/syncSlice.js'
import { setShowSettings } from '@pear-notes/core/store/slices/uiSlice.js'
import { getCanAddVault, getVaultPending } from '@pear-notes/core/store/slices/vaultsSlice.js'
import { extractInvite, isValidInvite } from '@pear-notes/core/utils.js'

const INPUT_CLASS =
  'w-full bg-bg-panel text-text-primary px-4 py-3 rounded-xl border border-border-secondary text-sm focus:outline-none focus:border-accent-primary'

export default function JoinVaultForm() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const canAdd = useSelector(getCanAddVault)
  const pending = useSelector(getVaultPending)
  const [name, setName] = useState('')
  const [code, setCode] = useState('')

  if (!canAdd) return null

  const isValid = isValidInvite(code)
  const canJoin = isValid && !!name.trim() && !pending

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!canJoin) return
    dispatch(
      subscribePairUser({ invite: extractInvite(code), mode: 'add', vaultName: name.trim() })
    )
    setName('')
    setCode('')
    dispatch(setShowSettings(false))
  }

  return (
    <form
      onSubmit={handleSubmit}
      className='space-y-3 rounded-2xl border border-border-primary bg-overlay-faint p-5'
    >
      <h3 className='text-sm font-bold text-text-primary'>{t('vaults.join.sectionTitle')}</h3>
      <p className='text-xs text-text-tertiary leading-relaxed'>{t('vaults.join.screenDesc')}</p>
      <input
        id='vault-join-name'
        value={name}
        maxLength={VAULT_NAME_MAX_LENGTH}
        onChange={(e) => setName(e.target.value)}
        placeholder={t('vaults.namePlaceholder')}
        aria-label={t('vaults.nameLabel')}
        className={INPUT_CLASS}
      />
      <input
        id='vault-join-code'
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder={t('sync.paste.placeholder')}
        aria-label={t('vaults.join.codeLabel')}
        autoComplete='off'
        spellCheck={false}
        className={`${INPUT_CLASS} font-mono`}
      />
      {code.trim() && !isValid && (
        <p className='text-xs font-medium text-accent-danger'>{t('sync.paste.hintInvalid')}</p>
      )}
      <p className='text-xs text-text-tertiary leading-relaxed'>{t('vaults.join.hint')}</p>
      <button
        type='submit'
        disabled={!canJoin}
        className='flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-accent-primary text-accent-on-primary disabled:opacity-50'
      >
        <LogIn className='w-4 h-4' />
        {t('vaults.join.joinBtn')}
      </button>
    </form>
  )
}
