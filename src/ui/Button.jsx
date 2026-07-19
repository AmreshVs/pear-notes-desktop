import { cn } from '@pear-notes/core/utils.js'

export default function Button({ variant = 'default', size = 'md', className, ...props }) {
  return <button className={cn(base, ...variants[variant], ...sizes[size], className)} {...props} />
}

const base = `cursor-default border rounded-lg text-sm shadow-xs font-medium
      inline-flex items-center justify-center
      disabled:cursor-not-allowed`

const variants = {
  default: [
    'bg-bg-primary text-text-primary border-border-primary',
    'active:not-disabled:bg-bg-secondary active:not-disabled:border-border-secondary active:shadow-none',
    'dark:bg-bg-secondary dark:border-border-secondary',
    'disabled:opacity-50 disabled:shadow-none'
  ],
  primary: [
    'text-accent-on-primary bg-accent-primary border-transparent',
    'active:bg-accent-primary-hover active:shadow-none'
  ]
}

const sizes = {
  md: ['px-3 h-8']
}
