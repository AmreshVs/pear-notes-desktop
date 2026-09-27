const IS_MAC = typeof navigator !== 'undefined' && /mac/i.test(navigator.platform)

export default function TitleBar({ ...props }) {
  if (!IS_MAC) return null

  return (
    <nav
      className='flex [-webkit-app-region:drag] pl-20 pr-3 h-11 bg-bg-secondary border-b border-border-primary'
      {...props}
    ></nav>
  )
}
