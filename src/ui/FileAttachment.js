import { Node, mergeAttributes } from '@tiptap/core'
import { ReactNodeViewRenderer } from '@tiptap/react'
import FileAttachmentView from './FileAttachmentView'

export default Node.create({
  name: 'fileAttachment',

  group: 'block',

  atom: true,

  addAttributes() {
    return {
      fileName: {
        default: null
      },
      fileSize: {
        default: null
      },
      fileType: {
        default: null
      },
      fileData: {
        default: null
      },
      url: {
        default: null
      }
    }
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-file-attachment]'
      }
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-file-attachment': '' })]
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileAttachmentView)
  },

  addCommands() {
    return {
      setFileAttachment:
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
