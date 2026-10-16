import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { Laptop } from 'lucide-react'

import { formatVaultInvite } from '@pear-notes/core/utils.js'

import { useInviteLink } from '../../hooks/useInviteLink'

import InviteLinkCard from './InviteLinkCard'

export default function AddDevicePanel({ name }) {
  const { t } = useTranslation()
  const format = useCallback((invite) => formatVaultInvite(invite, name), [name])
  const invite = useInviteLink(format)
  const requestedRef = useRef(false)
  const { isGenerated, isLoading, generate } = invite

  useEffect(() => {
    if (requestedRef.current || isGenerated || isLoading) return
    requestedRef.current = true
    generate()
  }, [generate, isGenerated, isLoading])

  const copy = useMemo(
    () => ({
      idleTitle: t('sync.add.idleTitle', { name }),
      idleDesc: t('sync.add.idleDesc', { name }),
      generateBtn: t('sync.add.generateBtn'),
      readyTitle: t('sync.add.readyTitle'),
      qrTitle: t('sync.add.qrTitle'),
      qrDescription: t('sync.add.qrDescription'),
      codeLabel: t('sync.add.codeLabel'),
      copyBtn: t('sync.add.copyBtn'),
      warning: t('sync.add.warning', { name })
    }),
    [name, t]
  )

  return <InviteLinkCard invite={invite} copy={copy} IdleIcon={Laptop} />
}
