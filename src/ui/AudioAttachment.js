import { mergeAttributes, Node } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'

import AudioAttachmentView from './AudioAttachmentView'

export default Node.create({
  name: 'audioAttachment',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      audioData: {
        default: null
      },
      duration: {
        default: 0
      },
      url: {
        default: null
      },
      fileName: {
        default: null
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-audio-attachment]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-audio-attachment': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(AudioAttachmentView)
  },

  addCommands() {
    return {
      setAudioAttachment:
        (attributes) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: attributes
          })
        }
    }
  }
})
