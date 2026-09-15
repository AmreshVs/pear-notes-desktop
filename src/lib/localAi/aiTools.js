export const AI_TOOL_GROUPS = [
  { id: 'edit', labelKey: 'localAi.writingTools.editGroup' },
  { id: 'understand', labelKey: 'localAi.writingTools.understandGroup' },
  { id: 'note', labelKey: 'localAi.writingTools.noteGroup' }
]

const REWRITE_TOOL_MODES = ['fixGrammar', 'rewrite', 'makeShorter', 'makeProfessional', 'makeFriendly']

const tool = (mode, scope, group, labelKey) => ({ id: `${scope}:${mode}`, mode, scope, group, labelKey })

export function buildAiTools({ summarizeReady, translateReady, hasSelection }) {
  const tools = []
  if (hasSelection && summarizeReady) {
    for (const mode of REWRITE_TOOL_MODES) {
      tools.push(tool(mode, 'selection', 'edit', `localAi.${mode}.menuLabel`))
    }
    tools.push(
      tool('summarizeNote', 'selection', 'understand', 'localAi.summarizeSelection.menuLabel'),
      tool('keyPoints', 'selection', 'understand', 'localAi.keyPointsSelection.menuLabel')
    )
  }
  if (hasSelection && translateReady) {
    tools.push(tool('translate', 'selection', 'understand', 'localAi.translateSelection.menuLabel'))
  }
  if (summarizeReady) {
    tools.push(
      tool('summarizeNote', 'note', 'note', 'localAi.summarizeNote.menuLabel'),
      tool('suggestTitle', 'note', 'note', 'localAi.suggestTitle.menuLabel'),
      tool('keyPoints', 'note', 'note', 'localAi.keyPoints.menuLabel')
    )
  }
  if (translateReady) {
    tools.push(tool('translate', 'note', 'note', 'localAi.translate.actionLabel'))
  }
  return tools
}
