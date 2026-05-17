import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const EXPORTS_BUCKET = 'exports'
const SIGNED_URL_TTL_SECONDS = 60 * 60

type ExportRecord = {
  id: string
  presentation_id: string
  file_path: string
  signed_url: string | null
  expires_at: string | null
}

const getObjectPath = (filePath: string) =>
  filePath.startsWith(`${EXPORTS_BUCKET}/`)
    ? filePath.slice(EXPORTS_BUCKET.length + 1)
    : filePath

const getFileName = (objectPath: string) => objectPath.split('/').pop() || 'presentation.pptx'

const isSignedUrlFresh = (exportRecord: ExportRecord) =>
  Boolean(
    exportRecord.signed_url &&
    exportRecord.expires_at &&
    new Date(exportRecord.expires_at).getTime() > Date.now() + 30_000
  )

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.redirect(new URL('/login', _request.url))
  }

  const { data: exportRecord, error: exportError } = await supabase
    .from('exports')
    .select('id, presentation_id, file_path, signed_url, expires_at')
    .eq('id', id)
    .single()

  if (exportError || !exportRecord) {
    return NextResponse.json({ error: 'Export not found' }, { status: 404 })
  }

  const { data: presentation, error: presentationError } = await supabase
    .from('presentations')
    .select('user_id')
    .eq('id', (exportRecord as ExportRecord).presentation_id)
    .single()

  if (presentationError || !presentation || presentation.user_id !== user.id) {
    return NextResponse.json({ error: 'Export not found' }, { status: 404 })
  }

  const record = exportRecord as ExportRecord

  if (isSignedUrlFresh(record) && record.signed_url) {
    return NextResponse.redirect(record.signed_url)
  }

  const objectPath = getObjectPath(record.file_path)
  const fileName = getFileName(objectPath)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS, { download: fileName })

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return NextResponse.json({ error: 'Download link could not be created' }, { status: 500 })
  }

  const expiresAt = new Date(Date.now() + SIGNED_URL_TTL_SECONDS * 1000).toISOString()
  await supabase
    .from('exports')
    .update({ signed_url: signedUrlData.signedUrl, expires_at: expiresAt })
    .eq('id', record.id)

  return NextResponse.redirect(signedUrlData.signedUrl)
}