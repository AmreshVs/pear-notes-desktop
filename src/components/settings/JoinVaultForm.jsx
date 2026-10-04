import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'
import { LogIn } from 'lucide-react'

import { INVITE_KIND, VAULT_NAME_MAX_LENGTH } from '@pear-notes/core/constant.js'
import { subscribePairUser } from '@pear-notes/core/store/slices/syncSlice.js'
import { setShowSettings } from '@pear-notes/core/store/slices/uiSlice.js'
import { getVaultPending } from '@pear-notes/core/store/slices/vaultsSlice.js'
import {
  extractInvite,
  getInviteNameHint,
  isInviteForOtherKind,
  isValidInvite
} from '@pear-notes/core/utils.js'

const INPUT_CLASS =
  'w-full bg-bg-panel text-text-primary px-4 py-3 rounded-xl border border-border-secondary text-sm focus:outline-none focus:border-accent-primary'

export default function JoinVaultForm() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const pending = useSelector(getVaultPending)
  const [name, setName] = useState('')
  const [nameEdited, setNameEdited] = useState(false)
  const [nameHint, setNameHint] = useState('')
  const [code, setCode] = useState('')

  const isValid = isValidInvite(code, INVITE_KIND.VAULT)
  const isDeviceLink = isInviteForOtherKind(code, INVITE_KIND.VAULT)
  const canJoin = isValid && !!name.trim() && !pending
  const nameFromInvite = !!nameHint && name === nameHint

  const handleCodeChange = (e) => {
    const next = e.target.value
    setCode(next)
    const hint = getInviteNameHint(next).slice(0, VAULT_NAME_MAX_LENGTH)
    setNameHint(hint)
    if (hint && !nameEdited) setName(hint)
  }

  const handleNameChange = (e) => {
    setName(e.target.value)
    setNameEdited(!!e.target.value.trim())
  }

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
        id='vault-join-code'
        autoFocus
        value={code}
        onChange={handleCodeChange}
        placeholder={t('vaults.join.linkPlaceholder')}
        aria-label={t('vaults.join.codeLabel')}
        autoComplete='off'
        spellCheck={false}
        className={`${INPUT_CLASS} font-mono`}
      />
      {isDeviceLink && (
        <p className='text-xs font-medium text-accent-danger'>{t('vaults.join.deviceLinkError')}</p>
      )}
      {code.trim() && !isValid && !isDeviceLink && (
        <p className='text-xs font-medium text-accent-danger'>{t('sync.paste.hintInvalid')}</p>
      )}
      <input
        id='vault-join-name'
        value={name}
        maxLength={VAULT_NAME_MAX_LENGTH}
        onChange={handleNameChange}
        placeholder={t('vaults.namePlaceholder')}
        aria-label={t('vaults.nameLabel')}
        className={INPUT_CLASS}
      />
      {nameFromInvite && (
        <p className='text-xs text-text-tertiary'>{t('vaults.join.nameFromInvite')}</p>
      )}
      <button
        type='submit'
        disabled={!canJoin}
        className='flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-bold bg-accent-primary text-accent-on-primary disabled:opacity-50'
      >
        <LogIn className='w-4 h-4' />
        {t('vaults.join.joinBtn')}
      </button>
      <p className='text-xs text-text-tertiary leading-relaxed'>{t('vaults.join.hint')}</p>
    </form>
  )
}
