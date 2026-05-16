export type SourceCitation = string | Record<string, unknown>

export type Moment = {
  id?: string | number
  title: string
  emotion: string
  duration_seconds: number
  slide_heading: string
  slide_bullets: string[]
  script: string
  sources: SourceCitation[]
  _warning?: string
  _sourceVerification?: {
    verified: boolean
    verifiedSources: string[]
  }
}

export type SourceDocument = {
  filename: string
  extracted_text?: string | null
  chunks?: unknown
}

const QUOTED_TEXT_PATTERN = /["“”]([^"“”]{3,120})["“”]|'([^']{3,120})'/g
const NUMBER_PATTERN = /\b\d[\d,.]*(?:\.\d+)?\s?(?:%|percent|x|times|k|m|b|million|billion|thousand)?\b/gi
const PROPER_NOUN_PATTERN = /\b[A-Z][A-Za-z0-9&'.-]+(?:\s+(?:[A-Z][A-Za-z0-9&'.-]+|of|for|and|the|in|on)){0,4}/g

const PROPER_NOUN_STOPWORDS = new Set([
  'A',
  'An',
  'And',
  'But',
  'I',
  'If',
  'It',
  'Now',
  'So',
  'That',
  'The',
  'This',
  'Today',
  'We',
  'When',
  'You',
])

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

const uniq = (values: string[]) => Array.from(new Set(values))

const sourceCitationToText = (source: SourceCitation) => {
  if (typeof source === 'string') {
    return source
  }

  const filename = typeof source.filename === 'string' ? source.filename : ''
  const reference = typeof source.reference === 'string' ? source.reference : ''
  const label = typeof source.label === 'string' ? source.label : ''

  return [filename, reference, label].filter(Boolean).join(' ')
}

const normalizeChunks = (chunks: unknown): string[] => {
  if (!Array.isArray(chunks)) {
    return []
  }

  return chunks.flatMap((chunk) => {
    if (typeof chunk === 'string') {
      return chunk
    }

    if (typeof chunk === 'object' && chunk !== null) {
      const record = chunk as Record<string, unknown>
      const text = record.text ?? record.content ?? record.chunk

      if (typeof text === 'string') {
        return text
      }
    }

    return []
  })
}

const getSourceText = (sourceDocument: SourceDocument) =>
  normalizeText([
    sourceDocument.extracted_text ?? '',
    ...normalizeChunks(sourceDocument.chunks),
  ].join('\n'))

const citationMatchesFilename = (citation: string, filename: string) => {
  const normalizedCitation = normalizeText(citation)
  const normalizedFilename = normalizeText(filename)
  const filenameStem = normalizedFilename.replace(/\.[^.]+$/, '')

  return (
    normalizedCitation.includes(normalizedFilename) ||
    (filenameStem.length > 2 && normalizedCitation.includes(filenameStem))
  )
}

const extractRegexMatches = (script: string, pattern: RegExp) => {
  const matches: string[] = []

  for (const match of script.matchAll(pattern)) {
    const value = match[1] ?? match[2] ?? match[0]
    const trimmed = value.trim()

    if (trimmed) {
      matches.push(trimmed)
    }
  }

  return matches
}

const extractProperNouns = (script: string) =>
  extractRegexMatches(script, PROPER_NOUN_PATTERN).filter((phrase) => {
    const firstWord = phrase.split(/\s+/)[0]
    return phrase.length > 2 && !PROPER_NOUN_STOPWORDS.has(firstWord)
  })

const extractKeyPhrases = (script: string) =>
  uniq([
    ...extractRegexMatches(script, QUOTED_TEXT_PATTERN),
    ...extractRegexMatches(script, NUMBER_PATTERN),
    ...extractProperNouns(script),
  ])
    .map((phrase) => normalizeText(phrase))
    .filter((phrase) => phrase.length > 1)
    .slice(0, 16)

export function verifySourceCitations(
  moments: Moment[],
  sourceDocuments: SourceDocument[]
): Moment[] {
  return moments.map((moment) => {
    if (!Array.isArray(moment.sources) || moment.sources.length === 0) {
      return moment
    }

    const keyPhrases = extractKeyPhrases(moment.script)
    const warnings: string[] = []
    const verifiedSources: string[] = []

    for (const source of moment.sources) {
      const citation = sourceCitationToText(source)
      const sourceDocument = sourceDocuments.find((document) =>
        citationMatchesFilename(citation, document.filename)
      )

      if (!sourceDocument) {
        warnings.push(`Citation "${citation}" does not match an uploaded source document.`)
        continue
      }

      const sourceText = getSourceText(sourceDocument)
      const matchedPhrase = keyPhrases.find((phrase) => sourceText.includes(phrase))

      if (keyPhrases.length > 0 && !matchedPhrase) {
        warnings.push(`Citation "${citation}" could not be verified against ${sourceDocument.filename}.`)
        continue
      }

      verifiedSources.push(citation)
    }

    const { _warning, _sourceVerification, ...momentWithoutVerification } = moment

    return {
      ...momentWithoutVerification,
      ...(warnings.length > 0 ? { _warning: warnings.join(' ') } : {}),
      _sourceVerification: {
        verified: warnings.length === 0,
        verifiedSources,
      },
    }
  })
}