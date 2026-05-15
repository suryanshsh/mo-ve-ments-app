import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

export async function POST(request: Request) {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()

  const headersList = await headers()
  const origin = headersList.get('origin') || 'http://localhost:3000'

  return NextResponse.redirect(`${origin}/login`, { status: 302 })
}
