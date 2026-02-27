import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const searchParams = request.nextUrl.searchParams
    const parsedLimit = Number.parseInt(searchParams.get('limit') || '50', 10)
    const limit =
      Number.isFinite(parsedLimit) && parsedLimit > 0
        ? Math.min(parsedLimit, 500)
        : 50

    const { data, error } = await supabase
      .from('glucose_readings')
      .select('*')
      .order('measured_at', { ascending: false })
      .limit(limit)

    if (error) {
      return Response.json({ error: error.message }, { status: 500 })
    }

    return Response.json(data ?? [])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error'
    return Response.json({ error: message }, { status: 500 })
  }
}
