export default function PdfAttachmentPreview({ preview, fileName, onOpen }) {
  if (!preview) return null

  return (
    <div
      className='flex items-center justify-center px-4 pt-4 bg-bg-tertiary/40 cursor-pointer'
      onClick={onOpen}
    >
      <img
        src={preview.dataUrl}
        alt={fileName}
        width={preview.width}
        height={preview.height}
        draggable={false}
        className='max-w-full h-auto rounded-lg border border-border-primary shadow-sm select-none'
      />
    </div>
  )
}
