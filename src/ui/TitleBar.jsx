export default function TitleBar({ ...props }) {
  return (
    <nav
      className='flex bg-muted border-b dark:bg-background [-webkit-app-region:drag] pl-4 pr-3 h-12'
      {...props}
    >
      <div className='w-24 pb-1 flex items-center'>
        <pear-ctrl></pear-ctrl>
      </div>
    </nav>
  )
}
