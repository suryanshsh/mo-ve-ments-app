export function chunkText(
  text: string,
  chunkSize: number = 4000,
  overlap: number = 200
): string[] {
  if (!text || text.length === 0) return []
  if (text.length <= chunkSize) return [text]

  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    let end = start + chunkSize

    if (end >= text.length) {
      chunks.push(text.slice(start))
      break
    }

    // Try to split at a sentence boundary (. ! ?) within the last 200 chars of the chunk
    const searchRegion = text.slice(end - 200, end)
    const sentenceEnd = searchRegion.search(/[.!?]\s+(?=[A-Z])|[.!?]$/)

    if (sentenceEnd !== -1) {
      end = end - 200 + sentenceEnd + 1
    }

    chunks.push(text.slice(start, end))
    start = end - overlap
  }

  return chunks
}
