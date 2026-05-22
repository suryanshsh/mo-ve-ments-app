import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const EXPORTS_BUCKET = 'exports'
const SIGNED_URL_TTL_SECONDS = 5 * 60

type ExportRecord = {
  id: string
  presentation_id: string
  file_path: string
}

const getObjectPath = (filePath: string) =>
  filePath.startsWith(`${EXPORTS_BUCKET}/`)
    ? filePath.slice(EXPORTS_BUCKET.length + 1)
    : filePath

const getFileName = (objectPath: string) => objectPath.split('/').pop() || 'presentation.pptx'

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
    .select('id, presentation_id, file_path')
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

  const objectPath = getObjectPath(record.file_path)
  const fileName = getFileName(objectPath)
  const { data: signedUrlData, error: signedUrlError } = await supabase.storage
    .from(EXPORTS_BUCKET)
    .createSignedUrl(objectPath, SIGNED_URL_TTL_SECONDS, { download: fileName })

  if (signedUrlError || !signedUrlData?.signedUrl) {
    return NextResponse.json({ error: 'Download link could not be created' }, { status: 500 })
  }

  return NextResponse.redirect(signedUrlData.signedUrl)
}