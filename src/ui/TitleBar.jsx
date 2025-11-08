export default function TitleBar({ ...props }) {
  return (
    <nav
      className='flex [-webkit-app-region:drag] pl-4 pr-3 h-11'
      style={{
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-primary)',
        boxShadow: 'var(--shadow-xs)'
      }}
      {...props}
    >
      <div className='w-24 pb-1 flex items-center'>
        <pear-ctrl></pear-ctrl>
      </div>
    </nav>
  )
}
