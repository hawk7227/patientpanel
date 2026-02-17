// ═══════════════════════════════════════════════════════════════
// SYNC PULL API — Returns records updated since a given timestamp
//
// GET /api/sync/pull?table=patients&since=2024-01-01T00:00:00Z
// Returns: { records: [...], count, timestamp, hasMore }
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Client table name → { supabase table, select fields, page size }
const TABLE_CONFIG: Record<string, { table: string; select: string; pageSize: number; timeColumn?: string }> = {
  patients: {
    table: 'patients',
    select: '*',
    pageSize: 500,
  },
  appointments: {
    table: 'appointments',
    select: '*',
    pageSize: 200,
  },
  clinicalNotes: {
    table: 'clinical_notes',
    select: '*',
    pageSize: 200,
  },
  medications: {
    table: 'drchrono_medications',
    select: '*',
    pageSize: 500,
    timeColumn: 'synced_at',
  },
  allergies: {
    table: 'drchrono_allergies',
    select: '*',
    pageSize: 500,
    timeColumn: 'synced_at',
  },
  messages: {
    table: 'messages',
    select: '*',
    pageSize: 200,
  },
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const table = searchParams.get('table')
    const since = searchParams.get('since') || '2020-01-01T00:00:00Z'

    if (!table || !TABLE_CONFIG[table]) {
      return NextResponse.json(
        { error: `Unknown table: ${table}. Valid: ${Object.keys(TABLE_CONFIG).join(', ')}` },
        { status: 400 }
      )
    }

    const config = TABLE_CONFIG[table]
    const timeCol = config.timeColumn || 'updated_at'

    // Try with the configured time column first, fallback to created_at
    let records: any[] | null = null
    let error: any = null

    const result = await db
      .from(config.table)
      .select(config.select)
      .gt(timeCol, since)
      .order(timeCol, { ascending: true })
      .limit(config.pageSize)

    records = result.data
    error = result.error

    // If time column doesn't exist, try created_at
    if (error && (error.message?.includes('column') || error.code === '42703')) {
      console.log(`[Sync:Pull] ${table}: ${timeCol} failed, trying created_at`)
      const fallback = await db
        .from(config.table)
        .select(config.select)
        .gt('created_at', since)
        .order('created_at', { ascending: true })
        .limit(config.pageSize)

      records = fallback.data
      error = fallback.error
    }

    if (error) {
      console.error(`[Sync:Pull] ${table} error:`, error.message)
      // Return empty instead of 500 — table may not exist yet
      return NextResponse.json({ records: [], count: 0, timestamp: since, hasMore: false })
    }

    const count = records?.length || 0
    const timestamp = count > 0 ? (records as any[])[count - 1].updated_at : since
    const hasMore = count === config.pageSize

    return NextResponse.json({ records: records || [], count, timestamp, hasMore })
  } catch (err: any) {
    console.error('[Sync:Pull] Fatal:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
