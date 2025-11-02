import { cn } from '../utils.js'

export default function Button({
  variant = 'default',
  size = 'md',
  className,
  ...props
}) {
  return (
    <button
      className={cn(base, ...variants[variant], ...sizes[size], className)}
      {...props}
    />
  )
}

const base = `cursor-default border rounded-lg text-sm shadow-xs font-medium
      inline-flex items-center justify-center
      disabled:cursor-not-allowed`

const variants = {
  default: [
    'bg-background text-foreground border border-b-zinc-400/50',
    'active:not-disabled:bg-muted/50 active:not-disabled:border-b-border active:shadow-none',
    'dark:bg-muted dark:border-b-border',
    'disabled:opacity-50 disabled:shadow-none'
  ],
  primary: [
    'text-white bg-gradient-to-b from-[#2890ff] to-[#017bff] border-transparent',
    'active:bg-[#017bff] active:shadow-none'
  ]
}

const sizes = {
  md: ['px-3 h-8']
}
