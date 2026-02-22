import { NextRequest, NextResponse } from 'next/server'
import path from 'node:path'
import fs from 'node:fs/promises'

export async function GET(req: NextRequest) {
    try {
        const root = process.cwd()
        const logPath = path.join(root, 'logs_history.log')
        const raw = await fs.readFile(logPath, 'utf-8').catch(() => '')

        const lines = raw.split(/\r?\n/).filter(line => line.trim().length > 0)
        const items = lines.map(line => {
            const parts = line.split('\t')
            if (parts.length >= 2) {
                return {
                    ts: new Date(parts[0]).getTime(),
                    text: parts.slice(1).join('\t')
                }
            }
            return {
                ts: Date.now(),
                text: line
            }
        })

        return NextResponse.json(items)
    } catch (e: any) {
        return NextResponse.json([], { status: 200 })
    }
}
