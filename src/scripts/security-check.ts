import { promises as fs } from 'fs'
import path from 'path'

const ROOT = process.cwd()
const SEARCH_DIRS = ['src/app', 'src/components']
const EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx'])
const SECRET_KEYS = [
  'ANTHROPIC_API_KEY',
  'STRIPE_SECRET_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'LEMON_SQUEEZY_API_KEY',
  'LEMON_SQUEEZY_WEBHOOK_SECRET',
]

type Finding = {
  file: string
  reason: string
}

const walk = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        return walk(fullPath)
      }

      if (entry.isFile() && EXTENSIONS.has(path.extname(entry.name))) {
        return [fullPath]
      }

      return []
    })
  )

  return files.flat()
}

const isClientComponent = (source: string) => {
  const firstStatement = source
    .replace(/^\uFEFF/, '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('//'))

  return firstStatement === "'use client'" || firstStatement === '"use client"'
}

const getLineNumber = (source: string, search: string) => {
  const index = source.indexOf(search)

  if (index === -1) return 1

  return source.slice(0, index).split('\n').length
}

const main = async () => {
  const files = (await Promise.all(
    SEARCH_DIRS.map((dir) => walk(path.join(ROOT, dir)))
  )).flat()
  const findings: Finding[] = []

  for (const file of files) {
    const source = await fs.readFile(file, 'utf8')

    if (!isClientComponent(source)) continue

    if (source.includes('process.env')) {
      findings.push({
        file,
        reason: `process.env usage in client component at line ${getLineNumber(source, 'process.env')}`,
      })
    }

    for (const key of SECRET_KEYS) {
      if (source.includes(key)) {
        findings.push({
          file,
          reason: `${key} referenced in client component at line ${getLineNumber(source, key)}`,
        })
      }
    }
  }

  if (findings.length === 0) {
    console.log('Security check passed: no environment variable usage found in client components.')
    return
  }

  console.error('Security check failed:')
  for (const finding of findings) {
    console.error(`- ${path.relative(ROOT, finding.file)}: ${finding.reason}`)
  }

  process.exitCode = 1
}

main().catch((error) => {
  console.error('Security check failed to run:', error)
  process.exitCode = 1
})