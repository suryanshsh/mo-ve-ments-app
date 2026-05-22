'use client'

import { useState } from 'react'
import { usePresentationStore, type PresentationMoment } from '@/stores/presentation'

type SlideEditorProps = {
  moment: PresentationMoment
  slideNumber: number
}

export default function SlideEditor({ moment, slideNumber }: SlideEditorProps) {
  const updateMoment = usePresentationStore((state) => state.updateMoment)
  const [isEditingHeading, setIsEditingHeading] = useState(false)
  const [headingDraft, setHeadingDraft] = useState(moment.slide_heading ?? '')
  const [editingBulletIndex, setEditingBulletIndex] = useState<number | null>(null)
  const [bulletDraft, setBulletDraft] = useState('')
  const bullets = moment.slide_bullets ?? []

  const startHeadingEdit = () => {
    setHeadingDraft(moment.slide_heading ?? '')
    setIsEditingHeading(true)
  }

  const commitHeading = () => {
    updateMoment(moment.id, { slide_heading: headingDraft.trim() || 'Untitled slide' })
    setIsEditingHeading(false)
  }

  const cancelHeading = () => {
    setHeadingDraft(moment.slide_heading ?? '')
    setIsEditingHeading(false)
  }

  const startBulletEdit = (index: number) => {
    setEditingBulletIndex(index)
    setBulletDraft(bullets[index] ?? '')
  }

  const commitBullet = () => {
    if (editingBulletIndex === null) return

    const nextBullets = [...bullets]
    const nextText = bulletDraft.trim()

    if (nextText) {
      nextBullets[editingBulletIndex] = nextText
    } else {
      nextBullets.splice(editingBulletIndex, 1)
    }

    updateMoment(moment.id, { slide_bullets: nextBullets })
    setEditingBulletIndex(null)
    setBulletDraft('')
  }

  const cancelBullet = () => {
    setEditingBulletIndex(null)
    setBulletDraft('')
  }

  const removeBullet = (index: number) => {
    updateMoment(moment.id, {
      slide_bullets: bullets.filter((_, bulletIndex) => bulletIndex !== index),
    })
    setEditingBulletIndex(null)
    setBulletDraft('')
  }

  const addBullet = () => {
    const nextBullets = [...bullets, '']
    updateMoment(moment.id, { slide_bullets: nextBullets })
    setEditingBulletIndex(nextBullets.length - 1)
    setBulletDraft('')
  }

  return (
    <section className="relative aspect-video overflow-hidden rounded-xl bg-[#1E293B] p-6 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
      <span className="absolute right-4 top-4 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white/75">
        {String(slideNumber).padStart(2, '0')}
      </span>

      <div className="flex h-full flex-col justify-center pr-10">
        {isEditingHeading ? (
          <input
            value={headingDraft}
            onChange={(event) => setHeadingDraft(event.target.value)}
            onBlur={commitHeading}
            onKeyDown={(event) => {
              if (event.key === 'Enter') commitHeading()
              if (event.key === 'Escape') cancelHeading()
            }}
            className="mb-5 w-full rounded-md border border-white/15 bg-white/10 px-2 py-1.5 text-base font-semibold text-white outline-none transition-colors placeholder:text-white/35 focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/30 focus:ring-offset-2 focus:ring-offset-[#1E293B]"
            autoFocus
          />
        ) : (
          <button
            type="button"
            onClick={startHeadingEdit}
            className="mb-5 -mx-2 max-w-[88%] rounded-md px-2 py-1 text-left text-base font-semibold leading-snug text-white transition-colors hover:bg-white/10 hover:text-[#F59E0B]"
          >
            {moment.slide_heading || 'Untitled slide'}
          </button>
        )}

        <div className="space-y-3">
          {bullets.map((bullet, index) => (
            <div key={`${moment.id}-${index}`} className="group flex items-start gap-2.5">
              <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#F59E0B]" />
              {editingBulletIndex === index ? (
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <input
                    value={bulletDraft}
                    onChange={(event) => setBulletDraft(event.target.value)}
                    onBlur={commitBullet}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') commitBullet()
                      if (event.key === 'Escape') cancelBullet()
                    }}
                    className="min-w-0 flex-1 rounded-md border border-white/15 bg-white/10 px-2 py-1 text-[13px] leading-5 text-white outline-none transition-colors placeholder:text-white/35 focus:border-[#F59E0B] focus:ring-2 focus:ring-[#F59E0B]/30 focus:ring-offset-2 focus:ring-offset-[#1E293B]"
                    autoFocus
                  />
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => removeBullet(index)}
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-lg leading-none text-white/55 transition-colors hover:bg-white/10 hover:text-white"
                    aria-label="Remove bullet"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => startBulletEdit(index)}
                  className="-mx-2 min-w-0 rounded-md px-2 py-1 text-left text-[13px] leading-5 text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                >
                  {bullet || 'New point'}
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addBullet}
          className="mt-5 w-fit rounded-md px-2 py-1 text-[13px] font-medium text-[#F59E0B] transition-colors hover:bg-white/10 hover:text-amber-300"
        >
          + Add point
        </button>
      </div>
    </section>
  )
}