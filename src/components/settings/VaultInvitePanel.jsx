import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { UserPlus } from 'lucide-react'

import { formatVaultInvite } from '@pear-notes/core/utils.js'

import { useInviteLink } from '../../hooks/useInviteLink'

import InviteLinkCard from './InviteLinkCard'

export default function VaultInvitePanel({ name }) {
  const { t } = useTranslation()
  const format = useCallback((invite) => formatVaultInvite(invite, name), [name])
  const invite = useInviteLink(format)

  const copy = useMemo(
    () => ({
      idleTitle: t('vaults.invite.idleTitle', { name }),
      idleDesc: t('vaults.invite.idleDesc', { name }),
      generateBtn: t('vaults.invite.generateBtn'),
      readyTitle: t('vaults.invite.readyTitle'),
      qrTitle: t('vaults.invite.qrTitle'),
      qrDescription: t('vaults.invite.qrDescription'),
      codeLabel: t('vaults.invite.codeLabel'),
      copyBtn: t('vaults.invite.copyBtn'),
      warning: t('vaults.invite.warning', { name })
    }),
    [name, t]
  )

  return (
    <div className='space-y-5'>
      <InviteLinkCard invite={invite} copy={copy} IdleIcon={UserPlus} />
    </div>
  )
}
