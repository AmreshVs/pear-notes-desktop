import { useTranslation } from 'react-i18next'
import { useDispatch, useSelector } from 'react-redux'

import {
  combineHeldMerge,
  dismissHeldMerge,
  getHeldMerge
} from '@pear-notes/core/store/slices/syncSlice.js'

import OutdatedDevicesModal from './OutdatedDevicesModal'

export default function HeldMergeModal() {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const heldMerge = useSelector(getHeldMerge)

  return (
    <OutdatedDevicesModal
      devices={heldMerge?.blocking}
      descriptionKey='heldMerge.description'
      confirmLabel={t('heldMerge.combineAnyway')}
      cancelLabel={t('heldMerge.combineLater')}
      onConfirm={() => dispatch(combineHeldMerge())}
      onCancel={() => dispatch(dismissHeldMerge())}
    />
  )
}
