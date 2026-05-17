import 'server-only'

import pptxgen from 'pptxgenjs'

export type Presentation = {
  title: string
  audience: string | null
  target_duration: string | null
  total_duration: string | null
}

export type Moment = {
  position: number
  title: string
  emotion: string
  duration_seconds: number
  slide_heading: string | null
  slide_bullets: string[]
  script: string
}

const SLIDE_WIDTH = 10
const SLIDE_HEIGHT = 5.625
const BACKGROUND = '1E293B'
const WHITE = 'FFFFFF'
const LIGHT_GRAY = 'CBD5E1'
const MUTED_GRAY = '94A3B8'
const ORANGE = 'F59E0B'
const FONT_FACE = 'Arial'

const EMOTION_COLORS: Record<string, string> = {
  hook: '60A5FA',
  empathy: 'F97316',
  build: 'F59E0B',
  reveal: '34D399',
  proof: '22C55E',
  close: 'FB923C',
}

const EMOTION_LABELS: Record<string, string> = {
  hook: 'Hook',
  empathy: 'Empathy',
  build: 'Build',
  reveal: 'Reveal',
  proof: 'Proof',
  close: 'Close',
}

const normalizeBullets = (bullets: unknown) =>
  Array.isArray(bullets)
    ? bullets.filter((bullet): bullet is string => typeof bullet === 'string' && bullet.trim().length > 0).map((bullet) => bullet.trim())
    : []

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, ' ').trim()

const getSubtitle = (presentation: Presentation) => {
  const audience = presentation.audience?.trim() || 'General audience'
  const duration = presentation.total_duration?.trim() || presentation.target_duration?.trim() || 'Flexible duration'

  return `Audience: ${audience} | Duration: ${duration}`
}

const getEmotionLabel = (emotion: string) => EMOTION_LABELS[emotion] ?? normalizeWhitespace(emotion || 'Moment')

const addBackground = (slide: pptxgen.Slide) => {
  slide.background = { color: BACKGROUND }
}

const addTitleSlide = (pptx: pptxgen, presentation: Presentation) => {
  const slide = pptx.addSlide()
  addBackground(slide)

  slide.addText(normalizeWhitespace(presentation.title || 'Untitled presentation'), {
    x: 0.75,
    y: 2.05,
    w: SLIDE_WIDTH - 1.5,
    h: 0.7,
    fontFace: FONT_FACE,
    fontSize: 36,
    bold: true,
    color: WHITE,
    align: 'center',
    margin: 0,
    fit: 'shrink',
  })

  slide.addText(getSubtitle(presentation), {
    x: 0.75,
    y: 2.9,
    w: SLIDE_WIDTH - 1.5,
    h: 0.35,
    fontFace: FONT_FACE,
    fontSize: 18,
    color: LIGHT_GRAY,
    align: 'center',
    margin: 0,
    fit: 'shrink',
  })
}

const addBullet = (slide: pptxgen.Slide, bullet: string, index: number, fontSize: number) => {
  const y = 1.72 + index * 0.52

  slide.addText('\u2022', {
    x: 0.85,
    y,
    w: 0.25,
    h: 0.28,
    fontFace: FONT_FACE,
    fontSize,
    bold: true,
    color: ORANGE,
    margin: 0,
  })

  slide.addText(normalizeWhitespace(bullet), {
    x: 1.18,
    y: y - 0.02,
    w: 7.95,
    h: 0.42,
    fontFace: FONT_FACE,
    fontSize,
    color: WHITE,
    transparency: 20,
    margin: 0,
    fit: 'shrink',
    breakLine: false,
    wrap: true,
  })
}

const addMomentSlide = (
  pptx: pptxgen,
  moment: Moment,
  momentIndex: number,
  totalSlideCount: number
) => {
  const slide = pptx.addSlide()
  const bullets = normalizeBullets(moment.slide_bullets).slice(0, 6)
  const bulletFontSize = bullets.length > 4 ? 16 : 18
  const emotion = moment.emotion.toLowerCase()
  const emotionColor = EMOTION_COLORS[emotion] ?? MUTED_GRAY
  const slideNumber = momentIndex + 2

  addBackground(slide)

  slide.addText(normalizeWhitespace(moment.slide_heading || moment.title || `Moment ${moment.position}`), {
    x: 0.75,
    y: 0.55,
    w: 8.5,
    h: 0.85,
    fontFace: FONT_FACE,
    fontSize: 28,
    bold: true,
    color: WHITE,
    margin: 0,
    fit: 'shrink',
  })

  bullets.forEach((bullet, index) => addBullet(slide, bullet, index, bulletFontSize))

  slide.addText(getEmotionLabel(emotion), {
    x: 0.75,
    y: SLIDE_HEIGHT - 0.48,
    w: 2.2,
    h: 0.2,
    fontFace: FONT_FACE,
    fontSize: 10,
    bold: true,
    color: emotionColor,
    margin: 0,
  })

  slide.addText(`${slideNumber} / ${totalSlideCount}`, {
    x: SLIDE_WIDTH - 1.35,
    y: SLIDE_HEIGHT - 0.48,
    w: 0.6,
    h: 0.2,
    fontFace: FONT_FACE,
    fontSize: 10,
    color: MUTED_GRAY,
    align: 'right',
    margin: 0,
  })

  if (moment.script.trim()) {
    slide.addNotes(moment.script.trim())
  }
}

const toBuffer = (value: string | ArrayBuffer | Blob | Uint8Array) => {
  if (Buffer.isBuffer(value)) {
    return value
  }

  if (value instanceof ArrayBuffer) {
    return Buffer.from(value)
  }

  if (value instanceof Uint8Array) {
    return Buffer.from(value)
  }

  if (typeof value === 'string') {
    return Buffer.from(value, 'binary')
  }

  throw new Error('PPTX generation returned an unsupported output type')
}

export async function generatePptx(presentation: Presentation, moments: Moment[]): Promise<Buffer> {
  const pptx = new pptxgen()
  pptx.layout = 'LAYOUT_16x9'
  pptx.author = 'Mo(ve)ments'
  pptx.company = 'Mo(ve)ments'
  pptx.subject = presentation.title
  pptx.title = presentation.title
  pptx.theme = {
    headFontFace: FONT_FACE,
    bodyFontFace: FONT_FACE,
  }

  addTitleSlide(pptx, presentation)

  const totalSlideCount = moments.length + 1
  moments.forEach((moment, index) => addMomentSlide(pptx, moment, index, totalSlideCount))

  const output = await pptx.write({ outputType: 'nodebuffer' })
  return toBuffer(output)
}