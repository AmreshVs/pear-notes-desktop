export default function TitleBar({ ...props }) {
  return (
    <nav
      className='flex [-webkit-app-region:drag] pl-4 pr-3 h-11 bg-bg-secondary border-b border-border-primary'
      {...props}
    >
      <div className='w-24 pb-1 flex items-center'>
        <pear-ctrl></pear-ctrl>
      </div>
    </nav>
  )
}
