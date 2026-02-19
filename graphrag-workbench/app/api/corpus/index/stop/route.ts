import { NextResponse } from 'next/server'

export async function POST() {
  // Simple no-op: the indexing is a single process launched per stream
  // In the future we can persist PID and kill it. For now just acknowledge.
  return NextResponse.json({ ok: true })
}
