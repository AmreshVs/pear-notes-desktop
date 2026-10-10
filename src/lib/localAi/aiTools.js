import { LOCAL_AI_FEATURE } from '@pear-notes/core/store/services/localAiCatalog.js'

export const AI_TOOL_GROUPS = [
  { id: 'ask', labelKey: 'localAi.ask.group' },
  { id: 'edit', labelKey: 'localAi.writingTools.editGroup' },
  { id: 'understand', labelKey: 'localAi.writingTools.understandGroup' },
  { id: 'note', labelKey: 'localAi.writingTools.noteGroup' }
]

const REWRITE_TOOL_MODES = [
  'fixGrammar',
  'cleanUp',
  'rewrite',
  'makeShorter',
  'makeProfessional',
  'makeFriendly',
  'myStyle'
]

const WRITING = LOCAL_AI_FEATURE.SUMMARIZE_RECORDINGS
const TRANSLATE = LOCAL_AI_FEATURE.TRANSLATE_NOTES

const tool = (mode, scope, group, labelKey, feature) => ({
  id: `${scope}:${mode}`,
  mode,
  scope,
  group,
  labelKey,
  feature
})

export function buildAiTools({ hasSelection }) {
  if (hasSelection) {
    return [
      tool('ask', 'selection', 'ask', 'localAi.ask.menuLabelSelection', WRITING),
      ...REWRITE_TOOL_MODES.map((mode) =>
        tool(mode, 'selection', 'edit', `localAi.${mode}.menuLabel`, WRITING)
      ),
      tool(
        'summarizeNote',
        'selection',
        'understand',
        'localAi.summarizeSelection.menuLabel',
        WRITING
      ),
      tool('keyPoints', 'selection', 'understand', 'localAi.keyPointsSelection.menuLabel', WRITING),
      tool(
        'translate',
        'selection',
        'understand',
        'localAi.translateSelection.menuLabel',
        TRANSLATE
      )
    ]
  }
  return [
    tool('ask', 'note', 'ask', 'localAi.ask.menuLabelNote', WRITING),
    tool('summarizeNote', 'note', 'note', 'localAi.summarizeNote.menuLabel', WRITING),
    tool('suggestTitle', 'note', 'note', 'localAi.suggestTitle.menuLabel', WRITING),
    tool('keyPoints', 'note', 'note', 'localAi.keyPoints.menuLabel', WRITING),
    tool('translate', 'note', 'note', 'localAi.translate.actionLabel', TRANSLATE)
  ]
}
