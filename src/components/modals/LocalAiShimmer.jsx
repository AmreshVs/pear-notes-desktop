const LINE_WIDTHS = [94, 100, 82, 58]
const LINE_STAGGER_MS = 180

export default function LocalAiShimmer() {
  const renderLine = (width, index) => (
    <div
      key={width}
      className='h-2.5 rounded-full bg-accent-primary/25 animate-pulse motion-reduce:animate-none'
      style={{ width: `${width}%`, animationDelay: `${index * LINE_STAGGER_MS}ms` }}
    />
  )
  return (
    <div className='space-y-2.5 py-1' aria-hidden='true'>
      {LINE_WIDTHS.map(renderLine)}
    </div>
  )
}
