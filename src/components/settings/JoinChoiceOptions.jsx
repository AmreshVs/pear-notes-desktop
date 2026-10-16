import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'

import { MAX_VAULTS } from '@pear-notes/core/constant.js'

import { JOIN_CHOICE } from '../../hooks/useJoinChoice'

function ChoiceOption({ selected, disabled, title, description, onSelect }) {
  return (
    <button
      type='button'
      role='radio'
      aria-checked={selected}
      disabled={disabled}
      onClick={onSelect}
      className={`w-full flex items-start gap-3 p-4 rounded-xl border text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${selected ? 'border-accent-primary bg-accent-primary/10' : 'border-border-primary hover:bg-overlay-subtle'}`}
    >
      <span className='flex-1 min-w-0'>
        <span className='block text-sm font-bold text-text-primary'>{title}</span>
        <span className='block text-xs text-text-tertiary leading-relaxed mt-0.5'>
          {description}
        </span>
      </span>
      {selected && <Check className='w-4 h-4 text-accent-primary shrink-0 mt-0.5' />}
    </button>
  )
}

export default function JoinChoiceOptions({ vaultName, choice, canKeepSeparate, onSelect }) {
  const { t } = useTranslation()

  return (
    <div role='radiogroup' aria-label={t('vaults.join.choiceLabel')} className='space-y-2'>
      <p className='text-sm font-bold text-text-primary text-left'>
        {t('vaults.join.choiceLabel')}
      </p>
      <p className='text-xs text-text-tertiary leading-relaxed text-left'>
        {t('vaults.join.choiceDesc', { name: vaultName })}
      </p>
      <ChoiceOption
        selected={choice === JOIN_CHOICE.separate}
        disabled={!canKeepSeparate}
        title={t('vaults.join.keepTitle')}
        description={
          canKeepSeparate
            ? t('vaults.join.keepDesc', { name: vaultName })
            : t('vaults.limitReached', { max: MAX_VAULTS })
        }
        onSelect={() => onSelect(JOIN_CHOICE.separate)}
      />
      <ChoiceOption
        selected={choice === JOIN_CHOICE.combine}
        title={t('vaults.join.combineTitle')}
        description={t('vaults.join.combineDesc', { name: vaultName })}
        onSelect={() => onSelect(JOIN_CHOICE.combine)}
      />
    </div>
  )
}
