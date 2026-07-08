import { useState, useEffect, useRef } from 'react'
import { backendApi } from '@pear-notes/core/backend/api.js'
import { insertFileFromFile } from '../lib/fileManager'

export function useFormattingToolbar(editor, noteKey) {
  const [editorState, setEditorState] = useState({
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isStrike: false,
    isHighlight: false,
    isBulletList: false,
    isOrderedList: false,
    isTaskList: false,
    isCodeBlock: false,
    isCode: false,
    isBlockquote: false,
    isLink: false,
    headingLevel: 0,
    textAlign: 'left',
    canUndo: false,
    canRedo: false
  })
  const [showFormatMenu, setShowFormatMenu] = useState(false)
  const [showLinkModal, setShowLinkModal] = useState(false)
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false)
  const [showAudioRecorder, setShowAudioRecorder] = useState(false)
  const formatMenuRef = useRef(null)
  const attachmentButtonRef = useRef(null)

  useEffect(() => {
    if (!editor) return

    const updateState = () => {
      const headingLevel = editor.isActive('heading', { level: 1 })
        ? 1
        : editor.isActive('heading', { level: 2 })
          ? 2
          : editor.isActive('heading', { level: 3 })
            ? 3
            : 0

      const textAlign = editor.isActive({ textAlign: 'left' })
        ? 'left'
        : editor.isActive({ textAlign: 'center' })
          ? 'center'
          : editor.isActive({ textAlign: 'right' })
            ? 'right'
            : editor.isActive({ textAlign: 'justify' })
              ? 'justify'
              : 'left'

      setEditorState({
        isBold: editor.isActive('bold'),
        isItalic: editor.isActive('italic'),
        isUnderline: editor.isActive('underline'),
        isStrike: editor.isActive('strike'),
        isHighlight: editor.isActive('highlight'),
        isBulletList: editor.isActive('bulletList'),
        isOrderedList: editor.isActive('orderedList'),
        isTaskList: editor.isActive('taskList'),
        isCodeBlock: editor.isActive('codeBlock'),
        isCode: editor.isActive('code'),
        isBlockquote: editor.isActive('blockquote'),
        isLink: editor.isActive('link'),
        headingLevel,
        textAlign,
        canUndo: editor.can().undo(),
        canRedo: editor.can().redo()
      })
    }

    updateState()

    editor.on('selectionUpdate', updateState)
    editor.on('transaction', updateState)
    editor.on('update', updateState)

    return () => {
      editor.off('selectionUpdate', updateState)
      editor.off('transaction', updateState)
      editor.off('update', updateState)
    }
  }, [editor])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (formatMenuRef.current && !formatMenuRef.current.contains(event.target)) {
        setShowFormatMenu(false)
      }
    }
    if (showFormatMenu) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFormatMenu])

  const handleSetLink = ({ url, text }) => {
    if (!editor) return

    if (url) {
      const { from, to } = editor.state.selection
      const selectedText = editor.state.doc.textBetween(from, to)

      if (selectedText && text) {
        editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run()
      } else if (selectedText) {
        editor.chain().focus().setLink({ href: url }).run()
      } else if (text) {
        editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run()
      } else {
        editor.chain().focus().setLink({ href: url }).run()
      }
    } else {
      editor.chain().focus().unsetLink().run()
    }
    setShowLinkModal(false)
  }

  const handleHeadingClick = (level) => {
    if (!editor) return
    if (level === 0) {
      editor.chain().focus().setParagraph().run()
    } else {
      editor.chain().focus().toggleHeading({ level }).run()
    }
    setShowFormatMenu(false)
  }

  const getCurrentLink = () => {
    if (!editor) return { url: '', text: '' }
    const attrs = editor.getAttributes('link')
    const selectedText = editor.state.doc.textBetween(
      editor.state.selection.from,
      editor.state.selection.to
    )
    return {
      url: attrs.href || '',
      text: selectedText || attrs.href || ''
    }
  }

  const handleInsertImage = async (files) => {
    if (!editor || !files) return
    const fileList = Array.isArray(files) ? files : [files]

    const { to } = editor.state.selection
    editor.commands.setTextSelection(to)

    for (const file of fileList) {
      try {
        const { link } = await insertFileFromFile({ noteKey, file })
        if (link) {
          editor.chain().focus().insertContent([
            { type: 'image', attrs: { src: link } },
            { type: 'paragraph' }
          ]).run()
        }
      } catch (error) {
        console.error('Error uploading image:', error)
      }
    }
  }

  const handleInsertFile = async (files) => {
    if (!editor || !files) return
    const fileList = Array.isArray(files) ? files : [files]

    const { to } = editor.state.selection
    editor.commands.setTextSelection(to)

    for (const file of fileList) {
      try {
        const { link } = await insertFileFromFile({ noteKey, file })

        if (link) {
          editor.chain().focus().insertContent([
            {
              type: 'fileAttachment',
              attrs: {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                url: link
              }
            },
            { type: 'paragraph' }
          ]).run()
        }
      } catch (error) {
        console.error('Error uploading file:', error)
      }
    }
  }

  const handleInsertAudio = async ({ data, duration }) => {
    if (!editor) return
    try {
      const response = await fetch(data)
      const blob = await response.blob()
      const buffer = await blob.arrayBuffer()
      const fileName = `Audio Recording ${new Date().toLocaleString()}.webm`

      const { link } = await backendApi.insertFile({
        key: noteKey,
        fileName,
        buffer
      })

      if (link) {
        editor.chain().focus().insertContent([
          {
            type: 'audioAttachment',
            attrs: {
              audioData: null,
              url: link,
              duration: duration,
              fileName: fileName
            }
          },
          { type: 'paragraph' }
        ]).run()
      }
    } catch (error) {
      console.error('Error uploading audio:', error)
    }
  }

  const handleToggleCodeBlock = () => {
    if (!editor) return

    if (editor.isActive('codeBlock')) {
      editor.chain().focus().toggleCodeBlock().run()
    } else {
      const { from, to } = editor.state.selection
      const text = editor.state.doc.textBetween(from, to, '\n')

      if (text.trim()) {
        editor.chain().focus().deleteSelection().setCodeBlock().insertContent(text).run()
      } else {
        editor.chain().focus().toggleCodeBlock().run()
      }
    }
  }

  return {
    editorState,
    showFormatMenu,
    setShowFormatMenu,
    showLinkModal,
    setShowLinkModal,
    showAttachmentMenu,
    setShowAttachmentMenu,
    showAudioRecorder,
    setShowAudioRecorder,
    formatMenuRef,
    attachmentButtonRef,
    handleSetLink,
    handleHeadingClick,
    getCurrentLink,
    handleInsertImage,
    handleInsertFile,
    handleInsertAudio,
    handleToggleCodeBlock
  }
}
