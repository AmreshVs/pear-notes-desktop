import { NodeViewWrapper } from '@tiptap/react'
import { useSelector } from 'react-redux'
import { getHyperdriveAddress } from '../store/slices/uiSlice'

export default function ImageView({ node }) {
  const { src, alt, title } = node.attrs
  const resolvedUrl = useSelector((state) => (src && src.startsWith('http://hyperdrive') ? getHyperdriveAddress(state, src) : src))

  return (
    <NodeViewWrapper className="inline-block relative">
      <img
        src={resolvedUrl}
        alt={alt}
        title={title}
        className="max-w-full h-auto rounded-lg"
      />
    </NodeViewWrapper>
  )
}
