export type AgentEdit = {
  momentId: number
  field: 'script' | 'slide'
  value: unknown
}

const SCRIPT_TAG_PATTERN = /<newscript\b([^>]*)>([\s\S]*?)<\/newscript>/gi
const SLIDE_TAG_PATTERN = /<newslide\b([^>]*)>([\s\S]*?)<\/newslide>/gi
const STRAY_EDIT_TAG_PATTERN = /<\/?new(?:script|slide)\b[^>]*>/gi
const MOMENT_ID_PATTERN = /moment_id\s*=\s*["']?(\d+)["']?/i

const getMomentId = (attributes: string) => {
  const match = attributes.match(MOMENT_ID_PATTERN)
  if (!match) return null

  const momentId = Number.parseInt(match[1], 10)
  return Number.isFinite(momentId) && momentId > 0 ? momentId : null
}

const parseSlideValue = (rawValue: string) => {
  try {
    const parsed = JSON.parse(rawValue.trim())

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return null
    }

    const record = parsed as Record<string, unknown>
    const slideHeading = record.slide_heading
    const slideBullets = record.slide_bullets

    if (typeof slideHeading !== 'string' || !Array.isArray(slideBullets)) {
      return null
    }

    const validBullets = slideBullets.filter((bullet): bullet is string => typeof bullet === 'string')

    return {
      slide_heading: slideHeading,
      slide_bullets: validBullets,
    }
  } catch {
    return null
  }
}

export function parseAgentEdits(response: string): {
  cleanText: string
  edits: AgentEdit[]
} {
  const edits: AgentEdit[] = []

  for (const match of response.matchAll(SCRIPT_TAG_PATTERN)) {
    const momentId = getMomentId(match[1] ?? '')
    const script = (match[2] ?? '').trim()

    if (momentId && script) {
      edits.push({
        momentId,
        field: 'script',
        value: script,
      })
    }
  }

  for (const match of response.matchAll(SLIDE_TAG_PATTERN)) {
    const momentId = getMomentId(match[1] ?? '')
    const slide = parseSlideValue(match[2] ?? '')

    if (momentId && slide) {
      edits.push({
        momentId,
        field: 'slide',
        value: slide,
      })
    }
  }

  const cleanText = response
    .replace(SCRIPT_TAG_PATTERN, '')
    .replace(SLIDE_TAG_PATTERN, '')
    .replace(STRAY_EDIT_TAG_PATTERN, '')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return { cleanText, edits }
}