const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt', 'csv', 'md'] as const

type AllowedExtension = (typeof ALLOWED_EXTENSIONS)[number]

function getExtension(filename: string): AllowedExtension {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (!ext || !ALLOWED_EXTENSIONS.includes(ext as AllowedExtension)) {
    throw new Error(`Unsupported file type: .${ext}. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}`)
  }
  return ext as AllowedExtension
}

export function isAllowedExtension(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase()
  return !!ext && ALLOWED_EXTENSIONS.includes(ext as AllowedExtension)
}

export async function extractText(buffer: Buffer, filename: string): Promise<string> {
  const ext = getExtension(filename)

  switch (ext) {
    case 'pdf': {
      const { PDFParse } = await import('pdf-parse')
      // pdfjs-dist rejects Buffer; pass ArrayBuffer directly
      const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
      const parser = new PDFParse({ data: ab })

      try {
        const result = await parser.getText()
        return result.text
      } finally {
        await parser.destroy()
      }
    }
    case 'docx': {
      const { extractRawText } = await import('mammoth')
      const result = await extractRawText({ buffer })
      return result.value
    }
    case 'txt':
    case 'csv':
    case 'md': {
      return buffer.toString('utf-8')
    }
  }
}
