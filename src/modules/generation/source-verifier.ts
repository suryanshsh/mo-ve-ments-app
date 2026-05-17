export type SourceCitation = string | Record<string, unknown>

export type VerificationStatus = 'verified' | 'partial' | 'uncited' | 'clean'

export type SourceVerification = {
  status: VerificationStatus
  uncitedClaims: string[]
}

export type Moment = {
  id?: string | number
  title: string
  emotion: string
  duration_seconds: number
  slide_heading: string
  slide_bullets: string[]
  script: string
  sources: SourceCitation[]
  _verification?: SourceVerification
}

export type VerifiedMoment = Moment & {
  sources: SourceCitation[]
  _verification: SourceVerification
}

export type SourceDocument = {
  filename: string
  extracted_text?: string | null
  chunks?: unknown
}

const NUMBER_PATTERN = /(?:[$€£]\s*)?\b\d+(?:[,.]\d+)*(?:\.\d+)?\s*(?:%|percent|percentage points?|x|times|k|m|b|mn|bn|million|billion|thousand)?\b/gi
const PROPER_NOUN_PATTERN = /\b[A-Z][A-Za-z0-9&'.-]+(?:\s+(?:[A-Z][A-Za-z0-9&'.-]+|of|for|and|the|in|on|to|with)){0,4}/g

const PROPER_NOUN_STOPWORDS = new Set([
  'A',
  'An',
  'And',
  'But',
  'I',
  'If',
  'It',
  'Let',
  'Now',
  'Our',
  'So',
  'That',
  'The',
  'Then',
  'This',
  'Today',
  'We',
  'When',
  'You',
  'Your',
])

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim()

const uniqueByNormalizedText = (values: string[]) => {
  const seen = new Set<string>()
  const uniqueValues: string[] = []

  for (const value of values) {
    const normalizedValue = normalizeText(value)

    if (!normalizedValue || seen.has(normalizedValue)) {
      continue
    }

    seen.add(normalizedValue)
    uniqueValues.push(value.trim())
  }

  return uniqueValues
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isVerificationMetadataSource = (source: SourceCitation) =>
  isRecord(source) && source.type === 'verification'

const sourceCitationToText = (source: SourceCitation) => {
  if (typeof source === 'string') {
    return source
  }

  const filename = typeof source.filename === 'string' ? source.filename : ''
  const citation = typeof source.citation === 'string' ? source.citation : ''
  const reference = typeof source.reference === 'string' ? source.reference : ''
  const label = typeof source.label === 'string' ? source.label : ''
  const page = typeof source.page === 'string' || typeof source.page === 'number' ? `p.${source.page}` : ''

  return [citation, filename, reference, label, page].filter(Boolean).join(' ')
}

const normalizeChunks = (chunks: unknown): string[] => {
  if (!Array.isArray(chunks)) {
    return []
  }

  return chunks.flatMap((chunk) => {
    if (typeof chunk === 'string') {
      return chunk
    }

    if (isRecord(chunk)) {
      const text = chunk.text ?? chunk.content ?? chunk.chunk

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
    const value = match[0].replace(/\s+/g, ' ').trim()

    if (value) {
      matches.push(value)
    }
  }

  return matches
}

const extractProperNouns = (script: string) =>
  extractRegexMatches(script, PROPER_NOUN_PATTERN).filter((phrase) => {
    const firstWord = phrase.split(/\s+/)[0]
    const normalizedPhrase = normalizeText(phrase)

    return (
      phrase.length > 2 &&
      !PROPER_NOUN_STOPWORDS.has(firstWord) &&
      !normalizedPhrase.startsWith('moment ')
    )
  })

const extractClaims = (script: string) => {
  const numericClaims = uniqueByNormalizedText(extractRegexMatches(script, NUMBER_PATTERN)).slice(0, 16)
  const properNounClaims = uniqueByNormalizedText(extractProperNouns(script)).slice(0, 16)

  return {
    numericClaims,
    properNounClaims,
    claims: uniqueByNormalizedText([...numericClaims, ...properNounClaims]).slice(0, 24),
  }
}

const getClaimSearchVariants = (claim: string) => {
  const normalizedClaim = normalizeText(claim)
  const withoutCurrency = normalizedClaim.replace(/^[^\d]+(?=\d)/, '').trim()
  const withoutSpaces = withoutCurrency.replace(/\s+/g, '')
  const numericCore = withoutCurrency.match(/\d+(?:[,.]\d+)*(?:\.\d+)?/)?.[0] ?? ''

  return uniqueByNormalizedText([
    normalizedClaim,
    withoutCurrency,
    withoutSpaces,
    numericCore,
  ]).filter((variant) => variant.length > 1)
}

const claimAppearsInSourceText = (claim: string, sourceText: string) =>
  getClaimSearchVariants(claim).some((variant) => sourceText.includes(variant))

const findSourceDocument = (citation: string, sourceDocuments: SourceDocument[]) =>
  sourceDocuments.find((sourceDocument) => citationMatchesFilename(citation, sourceDocument.filename))

const toStoredSourceCitation = (
  source: SourceCitation,
  citation: string,
  sourceDocument: SourceDocument | undefined,
  verified: boolean
): Record<string, unknown> => {
  const base = typeof source === 'string' ? {} : { ...source }
  const label = typeof base.label === 'string' && base.label.trim() ? base.label : citation
  const storedSource: Record<string, unknown> = {
    ...base,
    type: 'source',
    label,
    citation,
    verified,
  }

  if (sourceDocument) {
    storedSource.filename = sourceDocument.filename
  }

  return storedSource
}

const toVerificationMetadataSource = (verification: SourceVerification): Record<string, unknown> => ({
  type: 'verification',
  status: verification.status,
  uncitedClaims: verification.uncitedClaims,
})

const selectUncitedClaims = (unverifiedClaims: string[], numericClaims: string[]) => {
  const numericClaimKeys = new Set(numericClaims.map(normalizeText))
  const unverifiedNumericClaims = unverifiedClaims.filter((claim) => numericClaimKeys.has(normalizeText(claim)))
  const preferredClaims = unverifiedNumericClaims.length > 0 ? unverifiedNumericClaims : unverifiedClaims

  return preferredClaims.slice(0, 6)
}

export function verifyMomentSources(
  moments: Moment[],
  sourceDocuments: SourceDocument[]
): VerifiedMoment[] {
  return moments.map((moment) => {
    const sourceEntries = Array.isArray(moment.sources)
      ? moment.sources.filter((source) => !isVerificationMetadataSource(source))
      : []
    const { claims, numericClaims } = extractClaims(moment.script)
    const sourceMatches = sourceEntries.map((source) => {
      const citation = sourceCitationToText(source)
      const sourceDocument = findSourceDocument(citation, sourceDocuments)
      const sourceText = sourceDocument ? getSourceText(sourceDocument) : ''
      const verifiedClaims = claims.filter((claim) => claimAppearsInSourceText(claim, sourceText))

      return {
        source,
        citation,
        sourceDocument,
        verifiedClaims,
      }
    })
    const verifiedClaimKeys = new Set(
      sourceMatches.flatMap((match) => match.verifiedClaims.map(normalizeText))
    )
    const unverifiedClaims = claims.filter((claim) => !verifiedClaimKeys.has(normalizeText(claim)))
    const hasMissingSourceDocument = sourceMatches.some((match) => !match.sourceDocument)
    const status: VerificationStatus = claims.length === 0
      ? 'clean'
      : sourceEntries.length === 0
        ? 'uncited'
        : unverifiedClaims.length === 0 && !hasMissingSourceDocument
          ? 'verified'
          : 'partial'
    const verification: SourceVerification = {
      status,
      uncitedClaims: status === 'verified' || status === 'clean'
        ? []
        : selectUncitedClaims(unverifiedClaims, numericClaims),
    }
    const storedSources = sourceMatches.map((match) =>
      toStoredSourceCitation(
        match.source,
        match.citation,
        match.sourceDocument,
        match.verifiedClaims.length > 0
      )
    )

    return {
      ...moment,
      sources: [...storedSources, toVerificationMetadataSource(verification)],
      _verification: verification,
    }
  })
}