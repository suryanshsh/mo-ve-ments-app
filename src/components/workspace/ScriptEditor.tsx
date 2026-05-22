'use client'

import { useEffect, useState } from 'react'
import { usePresentationStore, type PresentationMoment } from '@/stores/presentation'

type ScriptEditorProps = {
  moment: PresentationMoment
  isEditing: boolean
  onEditingChange: (isEditing: boolean) => void
}

export default function ScriptEditor({ moment, isEditing, onEditingChange }: ScriptEditorProps) {
  const updateMoment = usePresentationStore((state) => state.updateMoment)
  const [draft, setDraft] = useState(moment.script)

  useEffect(() => {
    if (isEditing) setDraft(moment.script)
  }, [isEditing, moment.script])

  const saveScript = () => {
    updateMoment(moment.id, { script: draft.trim() || moment.script })
    onEditingChange(false)
  }

  const cancelEdit = () => {
    setDraft(moment.script)
    onEditingChange(false)
  }

  return (
    <section className="flex min-h-[320px] flex-col rounded-xl bg-bgAlt p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <span className="text-[11px] font-semibold tracking-[0.16em] text-textLight">🎤 SPEAKER SCRIPT</span>
        {isEditing && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-[9px] border border-border bg-surface px-3 py-1.5 text-xs font-medium text-textMid transition-colors hover:text-text"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={saveScript}
              className="rounded-[9px] bg-accent px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-accent/90"
            >
              Save
            </button>
          </div>
        )}
      </div>

      {isEditing ? (
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          className="min-h-[240px] flex-1 resize-none rounded-[10px] border border-border bg-surface px-4 py-3 text-[14px] leading-8 text-text outline-none transition-colors placeholder:text-textLight focus:border-accent focus:ring-2 focus:ring-accent/25 focus:ring-offset-2 focus:ring-offset-bgAlt"
          autoFocus
        />
      ) : (
        <p className="whitespace-pre-wrap text-[14px] leading-8 text-text">{moment.script}</p>
      )}
    </section>
  )
}