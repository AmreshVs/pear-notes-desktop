import { useTranslation } from 'react-i18next'
import { AlertTriangle, Check } from 'lucide-react'

import { IMAGE_DETAILS_TYPE } from '@pear-notes/core/store/services/imageDetails.js'

const CARD_CLASS = 'rounded-xl bg-bg-tertiary/40 border border-overlay-soft'

export default function ImageDetailsPreview({ details, imageUrl, keepPhoto, onKeepPhotoChange }) {
  const { t } = useTranslation()
  const isNotes = details.type === IMAGE_DETAILS_TYPE.NOTES

  return (
    <div className='flex flex-col gap-3 max-h-[26rem] overflow-y-auto custom-scrollbar select-text'>
      {details.fields.length > 0 && (
        <div className='flex gap-3 items-stretch'>
          {imageUrl && (
            <img
              src={imageUrl}
              alt={t('localAi.details.photoAlt')}
              className='w-24 shrink-0 rounded-xl object-cover border border-overlay-soft bg-bg-tertiary/40'
            />
          )}
          <dl className={`${CARD_CLASS} flex-1 min-w-0 overflow-hidden`}>
            {details.fields.map(([key, value]) => (
              <div
                key={key}
                className='flex justify-between gap-3 px-4 py-2.5 border-b border-overlay-soft last:border-b-0 text-sm'
              >
                <dt className='text-text-tertiary shrink-0'>
                  {t(`localAi.details.fields.${key}`)}
                </dt>
                <dd className='font-bold text-text-primary text-right break-words min-w-0'>
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {details.items.length > 0 && (
        <div className={`${CARD_CLASS} py-2`}>
          {!isNotes && (
            <p className='px-4 pt-1 pb-1.5 text-xs font-bold text-text-tertiary'>
              {t('localAi.details.fields.items')}
            </p>
          )}
          <ul>
            {details.items.map((item, index) => (
              <li
                key={index}
                className={`flex justify-between gap-3 px-4 py-1.5 text-sm ${item.charge ? 'text-text-tertiary' : 'text-text-primary'}`}
              >
                <span className='min-w-0 break-words'>{item.label}</span>
                {item.amount && <span className='shrink-0 tabular-nums'>{item.amount}</span>}
              </li>
            ))}
          </ul>
          {details.check && (
            <div className='flex justify-between gap-3 mx-4 mt-1.5 pt-2.5 border-t border-overlay-soft text-sm font-bold'>
              {details.check.addsUp ? (
                <>
                  <span className='text-text-primary'>{t('localAi.details.check.addsUp')}</span>
                  <Check className='w-4 h-4 text-accent-success shrink-0' aria-hidden='true' />
                </>
              ) : (
                <>
                  <span className='text-accent-warning-text'>
                    {t('localAi.details.check.mismatch', { amount: details.check.itemsTotal })}
                  </span>
                  <AlertTriangle
                    className='w-4 h-4 text-accent-warning-text shrink-0'
                    aria-hidden='true'
                  />
                </>
              )}
            </div>
          )}
        </div>
      )}

      <button
        type='button'
        role='switch'
        aria-checked={keepPhoto}
        onClick={() => onKeepPhotoChange(!keepPhoto)}
        className={`${CARD_CLASS} w-full flex items-center justify-between gap-4 px-4 py-3 text-left transition-all hover:bg-bg-tertiary/60`}
      >
        <span className='text-sm font-bold text-text-primary'>
          {t('localAi.details.keepPhoto')}
        </span>
        <span
          className={`relative shrink-0 w-10 h-6 rounded-full transition-colors ${
            keepPhoto ? 'bg-accent-primary' : 'bg-overlay-strong'
          }`}
        >
          <span
            className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${
              keepPhoto ? 'left-[18px]' : 'left-0.5'
            }`}
          />
        </span>
      </button>
    </div>
  )
}
