export default function SettingsToggle({ on, onClick, disabled, label }) {
  return (
    <button
      role='switch'
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`relative w-12 h-7 rounded-full transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${on ? 'bg-accent-primary' : 'bg-bg-tertiary border border-border-primary'}`}
    >
      <span
        className={`absolute top-1 left-1 w-5 h-5 rounded-full bg-text-primary transition-transform ${on ? 'translate-x-5' : ''}`}
      />
    </button>
  )
}
