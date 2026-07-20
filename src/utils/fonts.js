export function getFontFamilyValue(family) {
  switch (family) {
    case 'Outfit':
      return '"Outfit", system-ui, -apple-system, sans-serif'
    case 'Lora':
      return '"Lora", serif'
    case 'Newsreader':
      return '"Newsreader", serif'
    case 'IBM Plex Mono':
      return '"IBM Plex Mono", monospace'
    case 'Serif':
      return 'ui-serif, Georgia, Cambria, "Times New Roman", Times, serif'
    case 'Mono':
      return 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
    case 'System':
      return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    case 'Inter':
    default:
      return '"Inter", system-ui, -apple-system, sans-serif'
  }
}

export function getFontClass(family) {
  switch (family) {
    case 'Outfit':
      return 'font-sans'
    case 'Lora':
    case 'Newsreader':
    case 'Serif':
      return 'font-serif'
    case 'IBM Plex Mono':
    case 'Mono':
      return 'font-mono'
    case 'System':
    case 'Inter':
    default:
      return 'font-sans'
  }
}
