import { NodeSelection } from '@tiptap/pm/state'

export function insertUploadedNode(view, node) {
  const { selection, tr } = view.state
  if (!(selection instanceof NodeSelection)) {
    view.dispatch(tr.replaceSelectionWith(node))
    return
  }
  tr.insert(selection.to, node)
  view.dispatch(tr.setSelection(NodeSelection.create(tr.doc, selection.to)))
}
