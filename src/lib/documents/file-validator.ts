const MAX_FILE_SIZE = 10 * 1024 * 1024
const ALLOWED_EXTENSIONS = new Set(['pdf', 'docx', 'txt', 'csv', 'md'])
const MAX_FILENAME_LENGTH = 120

const getExtension = (filename: string) => filename.split('.').pop()?.toLowerCase() ?? ''

export function sanitizeFilename(filename: string): string {
  const basename = filename.split(/[\\/]/).pop() ?? ''
  const withoutTraversal = basename.replace(/\.\./g, '')
  const sanitized = withoutTraversal
    .replace(/[^A-Za-z0-9._-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^\.+/, '')
    .slice(0, MAX_FILENAME_LENGTH)

  return sanitized || 'upload'
}

export function validateFile(buffer: Buffer, filename: string): { valid: boolean; error?: string } {
  const safeFilename = sanitizeFilename(filename)
  const extension = getExtension(safeFilename)

  if (!ALLOWED_EXTENSIONS.has(extension)) {
    return { valid: false, error: 'File type not allowed. Accepted: pdf, docx, txt, csv, md' }
  }

  if (buffer.length > MAX_FILE_SIZE) {
    return { valid: false, error: 'File exceeds maximum size of 10MB' }
  }

  if (extension === 'pdf' && buffer.subarray(0, 4).toString('utf8') !== '%PDF') {
    return { valid: false, error: 'Invalid PDF file signature' }
  }

  if (extension === 'docx' && buffer.subarray(0, 4).toString('binary') !== 'PK\x03\x04') {
    return { valid: false, error: 'Invalid DOCX file signature' }
  }

  return { valid: true }
}