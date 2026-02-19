'use client'

import React, { useEffect, useRef, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Loader2, Plus, Database, GitBranch, Users, Trash2, Zap, ArrowUpDown, Archive, ChevronDown, RotateCcw, Terminal } from 'lucide-react'
// Dialog imports removed (no modal)
import { Badge } from '@/components/ui/badge'
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { ScrollArea } from '@/components/ui/scroll-area'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ColumnDef,
  SortingState,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'

type CorpusState = {
  uploads: { name: string; size: number; mtime: number; type: 'txt'|'pdf'; status?: string }[]
  outputStats?: { entities?: number; relationships?: number; communities?: number; text_units?: number; last_index_time?: string }
  queue: { name: string; status: 'pending'|'processing'|'done'|'error'; message?: string }[]
  kgName?: string
}

export default function CorpusPanel() {
  const [state, setState] = useState<CorpusState>({ uploads: [], queue: [] })
  const [persistedLogs, setPersistedLogs] = useState<{ ts: number; text: string }[]>([])
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [running, setRunning] = useState(false)
  const [liveLogs, setLiveLogs] = useState<string[]>([])
  const [progress, setProgress] = useState<number>(0)
  const [, setStatus] = useState<string>('Idle')
  const [initialLoading, setInitialLoading] = useState(true)
  // OpenAI-only mode
  const sseRef = useRef<EventSource | null>(null)
  const logContainerRef = useRef<HTMLDivElement | null>(null)
  const [stickToBottom, setStickToBottom] = useState(true)
  const [archives, setArchives] = useState<{ name: string; kgName?: string; sizeKB: number }[]>([])
  const [archivesMenuOpen, setArchivesMenuOpen] = useState(false)
  const [startTime, setStartTime] = useState<number | null>(null)

  const loadLogs = React.useCallback(async () => {
    try {
      const res = await fetch('/api/corpus/logs', { cache: 'no-store' })
      if (res.ok) {
        const arr = await res.json()
        const items = Array.isArray(arr) ? arr as Array[{ ts: number; text: string }] : []
        setPersistedLogs(items)
      }
    } catch {}
  }, [])

  const refresh = React.useCallback(async () => {
    const res = await fetch('/api/corpus/state', { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      setState(data)
      setInitialLoading(false)
    }
    await loadLogs()
  }, [loadLogs])

  useEffect(() => { 
    refresh()
  }, [refresh])

  // no-op

  // Clear/refresh logs with graph events
  useEffect(() => {
    const onCleared = () => { setPersistedLogs([]); setLiveLogs([]) }
    const onUpdated = () => { loadLogs() }
    window.addEventListener('graph-data-cleared', onCleared)
    window.addEventListener('graph-data-updated', onUpdated)
    return () => {
      window.removeEventListener('graph-data-cleared', onCleared)
      window.removeEventListener('graph-data-updated', onUpdated)
    }
  }, [loadLogs])


  const onFiles = async (files: FileList | File[]) => {
    const data = new FormData()
    // Normalize to an array of Files and only accept PDFs
    const arrayFiles: File[] = Array.isArray(files)
      ? (files as File[])
      : Array.from(files as FileList)
    const pdfs = arrayFiles.filter(
      (f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
    )
    if (pdfs.length === 0) return
    pdfs.forEach((f) => data.append('files', f))
    setUploading(true)
    try {
      const res = await fetch('/api/corpus/upload', { method: 'POST', body: data })
      if (!res.ok) throw new Error(await res.text())
      await refresh()
    } catch (e) {
      console.warn('upload error', e)
    } finally {
      setUploading(false)
    }
  }

  const startIndex = async () => {
    if (running) return
    setLiveLogs([])
    setProgress(0)
    setStatus('Starting...')
    const es = new EventSource(`/api/corpus/index/stream`)
    sseRef.current = es
    setRunning(true)
    setStartTime(Date.now())
    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        if (msg.type === 'log') setLiveLogs(prev => [...prev, msg.line])
        if (msg.type === 'status') setStatus(msg.message)
        if (msg.type === 'progress') setProgress(Math.max(0, Math.min(100, Number(msg.value) || 0)))
        if (msg.type === 'done') {
          setRunning(false)
          es.close()
          refresh()
          try {
            window.dispatchEvent(new Event('graph-data-updated'))
          } catch {}
          setStartTime(null)
        }
      } catch {}
    }
    es.onerror = () => {
      setRunning(false)
      es.close()
    }
  }

  const stopIndex = async () => {
    try { await fetch('/api/corpus/index/stop', { method: 'POST' }) } catch {}
    if (sseRef.current) { sseRef.current.close(); sseRef.current = null }
    setRunning(false)
  }

  // Archives management
  const refreshArchives = async () => {
    try {
      const res = await fetch('/api/corpus/archive/list', { cache: 'no-store' })
      if (res.ok) {
        const data = await res.json()
        const arr = Array.isArray(data?.archives) ? (data.archives as Array<{ name?: string; sizeKB?: number }>) : []
        setArchives(arr.map(a => ({ name: String(a.name || ''), sizeKB: Number(a.sizeKB || 0) })))
      }
    } catch {}
  }

  const archiveCurrent = async () => {
    try {
      const res = await fetch('/api/corpus/archive/create', { method: 'POST' })
      if (res.ok) {
        await refresh()
        await refreshArchives()
        try { window.dispatchEvent(new Event('graph-data-cleared')) } catch {}
      }
    } catch {}
  }

  const restoreArchive = async (name: string) => {
    try {
      const res = await fetch('/api/corpus/archive/restore', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      if (res.ok) {
        await refresh()
        await refreshArchives()
        try { window.dispatchEvent(new Event('graph-data-updated')) } catch {}
      }
    } catch {}
  }

  const renameArchive = async (from: string) => {
    const to = prompt('Rename archive to:', from)?.trim()
    if (!to || to === from) return
    try {
      const res = await fetch('/api/corpus/archive/rename', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ from, to }) })
      if (res.ok) await refreshArchives()
    } catch {}
  }

  const deleteArchive = async (name: string) => {
    if (!confirm(`Delete archive "${name}"? This cannot be undone.`)) return
    try {
      const res = await fetch('/api/corpus/archive/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) })
      if (res.ok) await refreshArchives()
    } catch {}
  }

  // Track whether user is near bottom (to avoid fighting manual scroll-up)
  useEffect(() => {
    const el = logContainerRef.current
    if (!el) return
    const onScroll = () => {
      const nearBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 8
      setStickToBottom(nearBottom)
    }
    el.addEventListener('scroll', onScroll)
    return () => { el.removeEventListener('scroll', onScroll) }
  }, [])

  // Auto-scroll to bottom initially and when new logs arrive, only if near bottom
  useEffect(() => {
    const el = logContainerRef.current
    if (!el) return
    if (stickToBottom) {
      el.scrollTop = el.scrollHeight
    }
  }, [persistedLogs, liveLogs, running, stickToBottom])

  // Simple JSON syntax highlighting
  const highlightJson = (raw: string) => {
    const escape = (s: string) => s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#39;')

    const colorize = (s: string) =>
      s
        // Keys
        .replace(/(&quot;[^&]*?&quot;)(\s*:\s*)/g, '<span class="text-yellow-300">$1</span>$2')
        // Strings
        .replace(/:&nbsp;?(&quot;[^&]*?&quot;)/g, ': <span class="text-green-300">$1</span>')
        .replace(/(^|\s)(&quot;[^&]*?&quot;)/g, '$1<span class="text-green-300">$2</span>')
        // Numbers
        .replace(/([^\w]|^)(-?\d+(?:\.\d+)?)([^\w]|$)/g, '$1<span class="text-blue-300">$2</span>$3')
        // Booleans/null
        .replace(/\b(true|false|null)\b/g, '<span class="text-fuchsia-300">$1</span>')

    try {
      const obj = JSON.parse(raw)
      const pretty = JSON.stringify(obj, null, 2)
      const html = colorize(escape(pretty))
      return { __html: html }
    } catch {
      const trimmed = raw.trim()
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        // best effort for near-JSON
        const html = colorize(escape(trimmed).replace(/\s/g, '&nbsp;'))
        return { __html: html }
      }
      // Rich-ish highlighting for plain text: color level tokens
      const colorLevels = (sEscaped: string) => sEscaped
        .replace(/([\]\)\s]|\b)(WARN|WARNING)([\s\[(]|\b)/gi, (_, a, w, b) => `${a}<span class="text-orange-400 font-semibold">${w.toUpperCase()}</span>${b}`)
        .replace(/\bERROR\b/gi, '<span class="text-red-400 font-semibold">$&</span>')
        .replace(/\bINFO\b/gi, '<span class="text-blue-300">$&</span>')

      // If the line contains inline JSON after a colon, color only that JSON segment
      const inline = raw.match(/:\s*([\[{].*)$/)
      if (inline) {
        const jsonRaw = inline[1]
        try {
          const parsed = JSON.parse(jsonRaw)
          const pretty = JSON.stringify(parsed, null, 2)
          const jsonHtml = colorize(escape(pretty))
          const prefix = raw.slice(0, raw.indexOf(jsonRaw))
          const coloredPrefix = colorLevels(escape(prefix))
          return { __html: coloredPrefix + jsonHtml }
        } catch {
          // Not valid JSON on this line — fall through to level-only coloring
        }
      }
      // No JSON — just color levels
      return { __html: colorLevels(escape(raw)) }
    }
  }

  return (
    <div className="w-full h-full flex flex-col">
      <div className="px-4 py-2 border-b">
        <div className="flex items-center justify-between mb-2 pb-0">
          <div>
            <div className="text-sm font-medium">Corpus</div>
            <div className="text-xs text-muted-foreground">GraphRAG index management</div>
            <div className="mt-1 text-xs">
              <span className="text-muted-foreground">Loaded KG: </span>
              <span className="font-medium">{state.kgName && state.kgName.trim() ? state.kgName : '(none)'}</span>
              <Button
                variant="ghost"
                size="sm"
                className="ml-2 h-6 px-2 text-[11px]"
                onClick={async () => {
                  const next = prompt('Rename current KG to:', state.kgName || '')?.trim()
                  if (next === null || next === undefined) return
                  try {
                    const res = await fetch('/api/corpus/kg/rename', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: next }) })
                    if (res.ok) await refresh()
                  } catch {}
                }}
              >Rename</Button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!running ? (
              <Button size="sm" onClick={startIndex}>
                <Zap className="h-4 w-4 mr-1" />
                Run Index
              </Button>
            ) : (
              <Button size="sm" onClick={stopIndex} variant="destructive">Stop</Button>
            )}
            <div className="flex items-center">
              <Button size="sm" variant="outline" onClick={archiveCurrent} title="Archive current KG">
                <Archive className="h-4 w-4" />
              </Button>
              <DropdownMenu open={archivesMenuOpen} onOpenChange={(o) => { setArchivesMenuOpen(o); if (o) refreshArchives() }}>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="ml-1" title="Manage archives">
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-96 p-2">
                  <div className="flex items-center justify-between px-1 pb-2">
                    <DropdownMenuLabel className="p-0">Archives</DropdownMenuLabel>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.preventDefault(); e.stopPropagation(); refreshArchives() }} title="Refresh list">
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button onClick={(e)=>{ e.preventDefault(); archiveCurrent() }} className="w-full mb-2">
                    <Archive className="h-4 w-4 mr-2" /> Archive current
                  </Button>
                  <DropdownMenuSeparator />
                  {archives.length === 0 ? (
                    <div className="text-xs text-muted-foreground p-3 text-center">No archives</div>
                  ) : (
                    <ScrollArea className="max-h-64">
                      <div className="space-y-2 pr-2">
                        {archives.map(a => (
                          <div key={a.name} className="rounded-md border p-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <div className="text-sm font-medium truncate" title={a.kgName || a.name}>{a.kgName || a.name}</div>
                                <div className="text-[11px] text-muted-foreground">{a.sizeKB.toFixed(1)} KB</div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Button size="sm" onClick={() => restoreArchive(a.name)}>Restore</Button>
                                <Button size="sm" variant="secondary" onClick={() => renameArchive(a.name)}>Rename</Button>
                                <Button size="sm" variant="destructive" onClick={() => deleteArchive(a.name)}>Delete</Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        
        {/* OpenAI-only indexing (settings.yaml) */}
      </div>

      {(running || persistedLogs.length > 0 || liveLogs.length > 0) && (
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            {(() => {
              const hasIndex = !!state.outputStats && ((state.outputStats.entities ?? 0) + (state.outputStats.relationships ?? 0) + (state.outputStats.communities ?? 0) + (state.outputStats.text_units ?? 0) > 0)
              const pct = running ? progress : hasIndex ? 100 : 0
              const elapsed = startTime ? Math.max(0, Math.floor((Date.now() - startTime) / 1000)) : 0
              const indicatorClass = !running && hasIndex ? 'bg-green-600' : undefined
              const rootClass = !running && hasIndex ? 'bg-green-600/20' : undefined
              return (
                <>
                  <Progress value={pct} className={`w-full ${rootClass || ''}`} indicatorClassName={indicatorClass} />
                  <div className="text-xs text-muted-foreground whitespace-nowrap">
                    {running ? `${pct}% • ${elapsed}s` : hasIndex ? 'Indexed' : 'No index present'}
                  </div>
                  {running && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                </>
              )
            })()}
          </div>
        </div>
      )}

      {/* Indexed overview (full width, polished) */}
      <div className="p-4 border-b">
        <Card className="w-full">
          <CardHeader className="pb-2">
            <div>
              <CardTitle className="text-sm">Indexed Overview</CardTitle>
              <CardDescription className="mt-1 text-xs">
                {initialLoading ? (
                  <Skeleton className="h-3 w-32" />
                ) : state.outputStats?.last_index_time ? (
                  <>Last indexed: {state.outputStats.last_index_time}</>
                ) : (
                  <>Never indexed</>
                )}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {initialLoading ? (
              <div className="grid grid-cols-2 gap-4">
                {[
                  'Entities',
                  'Relationships',
                  'Communities',
                  'Text Units',
                ].map((label, index) => (
                  <div key={index} className="rounded-md bg-card border p-3 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-md bg-primary/10 flex items-center justify-center">
                      <Skeleton className="h-4 w-4 rounded" />
                    </div>
                    <div className="min-w-0">
                      <Skeleton className="h-3 w-20 mb-1" />
                      <Skeleton className="h-4 w-10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : state.outputStats && ((state.outputStats.entities ?? 0) + (state.outputStats.relationships ?? 0) + (state.outputStats.communities ?? 0) + (state.outputStats.text_units ?? 0) > 0) ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md bg-card border p-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <Database className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Entities</div>
                    <div className="text-base tabular-nums whitespace-nowrap">{state.outputStats.entities ?? 0}</div>
                  </div>
                </div>
                <div className="rounded-md bg-card border p-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <GitBranch className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Relationships</div>
                    <div className="text-base tabular-nums whitespace-nowrap">{state.outputStats.relationships ?? 0}</div>
                  </div>
                </div>
                <div className="rounded-md bg-card border p-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <Users className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Communities</div>
                    <div className="text-base tabular-nums whitespace-nowrap">{state.outputStats.communities ?? 0}</div>
                  </div>
                </div>
                <div className="rounded-md bg-card border p-3 flex items-center gap-3">
                  <div className="h-8 w-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
                    <Database className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Text Units</div>
                    <div className="text-base tabular-nums whitespace-nowrap">{state.outputStats.text_units ?? 0}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-xs text-muted-foreground">
                No index found. Use the Dataset card to add PDFs and click &quot;Run Index&quot; to build the knowledge graph.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Dataset card (PDF drop zone + table) */}
      <div className="p-4 border-b">
        <Card 
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const dt = e.dataTransfer;
            if (dt?.files?.length) {
              const files = Array.from(dt.files).filter((f) =>
                f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf')
              )
              if (files.length > 0) onFiles(files)
            }
          }}
          className={`${dragOver ? 'ring-2 ring-primary/50' : ''}`}
        >
          <CardHeader className="pb-2 flex flex-row items-start justify-between">
            <div>
              <CardTitle className="text-sm">Dataset</CardTitle>
              <CardDescription>Drop PDF files here (.pdf only){uploading && <span className="ml-2">• Uploading…</span>}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Input id="dataset-file-input" type="file" multiple accept=".pdf" className="hidden" onChange={(e) => e.target.files && onFiles(e.target.files)} />
              <Button size="sm" onClick={() => document.getElementById('dataset-file-input')?.click()}>
                <Plus className="h-4 w-4 mr-1" /> Add PDFs
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-56 overflow-y-auto">
              <FilesDataTable
                rows={state.uploads.filter((f) => f.type === 'pdf')}
                onRemove={async (name) => {
                  try {
                    await fetch('/api/corpus/remove', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ name }),
                    })
                    refresh()
                  } catch {}
                }}
              />
              {state.uploads.filter((f) => f.type === 'pdf').length === 0 && (
                <div className="text-xs text-muted-foreground">No PDFs in input/ yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 p-4 min-h-0 flex flex-col">
        {/* Index logs card (bottom) fills the remaining height */}
        <Card className="border rounded-md flex-1 min-h-0 flex flex-col">
          <CardHeader className="py-1.5">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Terminal className="h-4 w-4" />
              Terminal Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 p-0 bg-neutral-950 text-neutral-200">
            <div ref={logContainerRef} className="h-full overflow-auto no-scrollbar">
              <div className="p-3 text-[11px] font-mono leading-relaxed">
                {(() => {
                  const merged = [...persistedLogs.map(e => ({ ts: e.ts, text: e.text })), ...liveLogs.map(l => ({ ts: Date.now(), text: l }))]
                  if (merged.length === 0) return <div className="text-neutral-500">No logs yet.</div>
                  return merged.map((e, i) => {
                    const n = i + 1
                    const trimmed = e.text.trim()
                    return (
                      <div key={`${i}-${e.ts}`} className="grid grid-cols-[48px_1fr] gap-2 whitespace-nowrap">
                        <span className="text-neutral-500 text-right tabular-nums select-none pr-2">{n}</span>
                        <span className="text-neutral-200 whitespace-pre" dangerouslySetInnerHTML={highlightJson(trimmed)} />
                      </div>
                    )
                  })
                })()}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Archive management handled via split button dropdown above */}
    </div>
  )
}

// Data table for files (shadcn + TanStack)
type UploadRow = {
  name: string
  size: number
  mtime: number
  type: 'txt' | 'pdf'
  status?: string
}

function formatKB(bytes: number) {
  return `${(bytes / 1024).toFixed(1)} KB`
}

function StatusBadge({ status }: { status?: string }) {
  const s = (status || 'pending') as string
  if (s === 'indexed' || s === 'ready') {
    return <Badge className="text-[10px] bg-green-600 text-white border-transparent">indexed</Badge>
  }
  if (s === 'scanning') {
    return <Badge className="text-[10px] border-orange-500 text-orange-400" variant="outline">scanning</Badge>
  }
  if (s === 'removed') {
    return <Badge className="text-[10px]" variant="destructive">removed</Badge>
  }
  return <Badge className="text-[10px] border-amber-500 text-amber-500" variant="outline">requires indexing</Badge>
}

function FilesDataTable({
  rows,
  onRemove,
}: {
  rows: UploadRow[]
  onRemove: (name: string) => Promise<void>
}) {
  const columns = React.useMemo<ColumnDef<UploadRow, unknown>[]>(
    () => [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="px-0"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            File
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => (
          <a
            className="hover:underline"
            href={`/api/corpus/file?name=${encodeURIComponent(row.original.name)}`}
            target="_blank"
            rel="noreferrer"
          >
            {row.original.name}
          </a>
        ),
        sortingFn: 'alphanumeric',
      },
      {
        accessorKey: 'size',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="px-0"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Size
            <ArrowUpDown className="ml-1 h-3 w-3" />
          </Button>
        ),
        cell: ({ row }) => <span className="text-muted-foreground">{formatKB(row.original.size)}</span>,
        sortingFn: 'basic',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            size="icon"
            variant="outline"
            className="h-6 w-6"
            title="Remove from dataset"
            onClick={() => onRemove(row.original.name)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        ),
      },
    ],
    [onRemove]
  )

  const [sorting, setSorting] = React.useState<SortingState>([])
  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  return (
    <Table>
      <TableHeader>
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id}>
                {header.isPlaceholder
                  ? null
                  : flexRender(header.column.columnDef.header, header.getContext())}
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody>
        {table.getRowModel().rows?.length ? (
          table.getRowModel().rows.map((row) => (
            <TableRow key={row.id} data-state={row.getIsSelected() && 'selected'}>
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={columns.length} className="h-24 text-center text-xs text-muted-foreground">
              No results.
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  )
}
