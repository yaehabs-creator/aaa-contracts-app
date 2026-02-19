import { NextResponse } from 'next/server'
import fs from 'node:fs/promises'
import path from 'node:path'

export async function POST(req: Request) {
  try {
    const { name } = await req.json().catch(() => ({})) as { name?: string }
    if (!name || /[\\/]/.test(name)) return NextResponse.json({ error: 'Invalid name' }, { status: 400 })
    const root = process.cwd()
    const target = path.join(root, 'archives', name)
    await fs.rm(target, { recursive: true, force: true })
    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Failed to delete archive'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

