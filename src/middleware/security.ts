const TEXT_FIELD_MAX_LENGTH = 10_000
const DOCUMENT_CONTENT_MAX_LENGTH = 50_000

const SCRIPT_TAG_PATTERN = /<script\b[^>]*>[\s\S]*?<\/script>/gi
const HTML_TAG_PATTERN = /<[^>]*>/g
const NULL_BYTE_PATTERN = /\x00/g
const CONTROL_CHARACTER_PATTERN = /[\x01-\x08\x0B\x0C\x0E-\x1F\x7F]/g
const XML_TAG_PATTERN = /^[A-Za-z][A-Za-z0-9._:-]*(?:\s+[A-Za-z_:][A-Za-z0-9._:-]*="[^"]*")*$/

const sanitizeString = (input: string, maxLength: number) =>
  input
    .replace(SCRIPT_TAG_PATTERN, '')
    .replace(HTML_TAG_PATTERN, '')
    .replace(NULL_BYTE_PATTERN, '')
    .replace(CONTROL_CHARACTER_PATTERN, '')
    .trim()
    .slice(0, maxLength)

const escapeXmlContent = (input: string) =>
  input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

export function sanitizeInput(input: string): string {
  return sanitizeString(input, TEXT_FIELD_MAX_LENGTH)
}

export function sanitizeDocumentContent(input: string): string {
  return sanitizeString(input, DOCUMENT_CONTENT_MAX_LENGTH)
}

export function wrapUserContent(content: string, tag: string): string {
  const normalizedTag = tag.trim()

  if (!XML_TAG_PATTERN.test(normalizedTag)) {
    throw new Error(`Invalid XML wrapper tag: ${tag}`)
  }

  const tagName = normalizedTag.split(/\s+/, 1)[0]

  return `<${normalizedTag}>${escapeXmlContent(content)}</${tagName}>`
}

const shouldSkipSanitization = (path: string[]) => {
  const fieldName = path[path.length - 1]?.toLowerCase()

  return fieldName === 'base64'
}

export function sanitizeStructuredInput(input: unknown, path: string[] = []): unknown {
  if (typeof input === 'string') {
    return shouldSkipSanitization(path) ? input : sanitizeInput(input)
  }

  if (Array.isArray(input)) {
    return input.map((item, index) => sanitizeStructuredInput(item, [...path, String(index)]))
  }

  if (input && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [key, sanitizeStructuredInput(value, [...path, key])])
    )
  }

  return input
}