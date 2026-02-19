'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, Send, Sparkles } from 'lucide-react'

type Message = {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface ChatPanelProps {
  onHighlightNodes?: (ids: string[]) => void
}

export default function ChatPanel({ onHighlightNodes }: ChatPanelProps) {
  const MODEL = 'gpt-4o-mini-2024-07-18'
  // removed unused loading state
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)
  const [stickToBottom, setStickToBottom] = useState(true)
  const [queryMode, setQueryMode] = useState<'drift'|'local'|'global'|'basic'>('drift')
  const [logs, setLogs] = useState<{ type: string; text: string }[]>([])
  const [steps, setSteps] = useState<Record<string, 'idle'|'running'|'done'>>({})
  const [expectedOutputTokens] = useState<number>(256)
  const [assumedContextTokens] = useState<number>(800)
  const [showLogs, setShowLogs] = useState<boolean>(false)
  const [runAnchorIndex, setRunAnchorIndex] = useState<number | null>(null)
  

  useEffect(() => {}, [])

  useEffect(() => {
    if (!stickToBottom) return
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, busy, stickToBottom])

  const handleViewportScroll = () => {
    const el = viewportRef.current
    if (!el) return
    const nearBottom = (el.scrollHeight - el.clientHeight - el.scrollTop) < 40
    setStickToBottom(nearBottom)
  }

  const canSend = useMemo(() => {
    return !!input.trim() && !busy
  }, [input, busy])

  // Cost estimation (OpenAI pricing per 1M tokens)
  const estimated = useMemo(() => {
    const charCount = (input || '').length
    const inputTokens = Math.ceil(charCount / 4)
    const totalPromptTokens = inputTokens + assumedContextTokens
    const openaiInPerM = 0.05 // $ per 1M tokens
    const openaiOutPerM = 0.40
    const inputCost = (totalPromptTokens / 1_000_000) * openaiInPerM
    const outputCost = (expectedOutputTokens / 1_000_000) * openaiOutPerM
    const total = inputCost + outputCost
    return { inputTokens, totalPromptTokens, inputCost, outputCost, total }
  }, [input, expectedOutputTokens, assumedContextTokens])

  const send = async () => {
    if (!canSend) return
    const q = input.trim()
    setInput("")
    const next = [...messages, { role: 'user', content: q } as Message]
    setMessages(next)
    setRunAnchorIndex(next.length - 1)
    setLogs([])
    setSteps({})
    setBusy(true)

    try {
      const res = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          
          maxTokens: expectedOutputTokens,
          apiKey: undefined,
          history: next.filter(m => m.role !== 'system'),
          method: queryMode,
        }),
      })
      if (!res.ok || !res.body) throw new Error(await res.text())

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      const applyStep = (name: string, status: 'idle'|'running'|'done') => {
        setSteps(s => ({ ...s, [name]: status }))
      }

      const pushLog = (type: string, text: string) => {
        setLogs(l => [...l, { type, text }])
      }

      let assistantIndex: number | null = null
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let idx
        while ((idx = buffer.indexOf('\n\n')) !== -1) {
          const chunk = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 2)
          const lines = chunk.split('\n')
          let event = 'message'
          let data = ''
          for (const line of lines) {
            if (line.startsWith('event:')) event = line.slice(6).trim()
            if (line.startsWith('data:')) data += line.slice(5).trim()
          }
          if (!data) continue
          try {
            const payload = JSON.parse(data)
            if (event === 'status') {
              pushLog('status', payload.message)
            } else if (event === 'drift-log') {
              pushLog('drift', payload.line)
            } else if (event === 'warning') {
              pushLog('warn', payload.message)
            } else if (event === 'step-start') {
              applyStep(payload.name, 'running')
            } else if (event === 'step-end') {
              applyStep(payload.name, 'done')
            } else if (event === 'highlights') {
              const ids: string[] = payload.ids || []
              if (ids.length && onHighlightNodes) onHighlightNodes(ids)
              pushLog('info', `Highlights: ${ids.length} entities`)
            } else if (event === 'answer-chunk') {
              const chunkText: string = payload.text || ''
              if (!chunkText) break
              setMessages(prev => {
                const list = [...prev]
                if (assistantIndex === null) {
                  assistantIndex = list.length
                  list.push({ role: 'assistant', content: chunkText })
                } else {
                  const existing = list[assistantIndex]
                  list[assistantIndex] = { ...existing, content: (existing?.content || '') + chunkText }
                }
                return list
              })
            } else if (event === 'answer') {
              const answer: string = payload.text || 'No response.'
              const ids: string[] = payload.highlights || []
              if (ids.length && onHighlightNodes) onHighlightNodes(ids)
              if (assistantIndex === null) {
                setMessages(m => [...m, { role: 'assistant', content: answer }])
              } else {
                // finalize streamed message with the final answer content
                setMessages(prev => {
                  const list = [...prev]
                  list[assistantIndex!] = { role: 'assistant', content: answer }
                  return list
                })
              }
            } else if (event === 'error') {
              pushLog('error', payload.message || 'Unknown error')
            } else if (event === 'done') {
              // no-op
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      setMessages(m => [...m, { role: 'assistant', content: `Error: ${msg}` }])
    } finally {
      setBusy(false)
    }
  }

  const clearChat = () => {
    setMessages([])
    if (onHighlightNodes) onHighlightNodes([])
  }

  return (
    <>
    <div className="w-full h-full flex flex-col">
      <div className="p-4 border-b flex items-center gap-3">
        <div className="flex-1">
          <div className="text-sm font-medium">Chat</div>
          <div className="text-xs text-muted-foreground">Query with GraphRAG drift + OpenAI</div>
        </div>
        <Button variant="outline" size="sm" onClick={clearChat}>Clear</Button>
      </div>

      <div className="p-4 border-b flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="text-xs px-2 py-1 border rounded bg-card">Model: {MODEL}</div>
          {/* No key UI; server reads root .env */}
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          Est. cost: ${estimated.total.toFixed(4)} (in {estimated.totalPromptTokens} + out {expectedOutputTokens} tk)
        </div>
      </div>

      {/* Query mode selector under model and cost */}
      <div className="px-4 py-2 border-b flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Mode:</span>
        {(['drift','local','global','basic'] as const).map(m => (
          <button
            key={m}
            onClick={() => setQueryMode(m)}
            className={`text-xs px-2 py-1 rounded border ${queryMode===m ? 'bg-primary text-primary-foreground' : 'bg-card hover:bg-muted'}`}
            title={`GraphRAG ${m} query`}
          >{m}</button>
        ))}
      </div>

      {/* Advanced toggles removed in OpenAI-only mode */}

      <ScrollArea className="flex-1 p-4" viewportRef={viewportRef} onViewportScroll={handleViewportScroll}>
        <div className="space-y-3">
          {messages.length === 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Sparkles className="h-4 w-4" /> Get started</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-sm text-muted-foreground">
                  Ask about entities, relationships, or communities in the knowledge graph.
                </div>
              </CardContent>
            </Card>
          )}
          {messages.map((m, i) => (
            <React.Fragment key={i}>
              <div className={`rounded-md p-3 border ${m.role === 'user' ? 'bg-accent/40' : 'bg-card'}`}>
                <div className="text-xs text-muted-foreground mb-1">{m.role}</div>
                <div className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</div>
              </div>
              {runAnchorIndex === i && Object.keys(steps).length > 0 && (
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Run Steps</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-xs">
                    {[
                      { key: 'query', label: `${queryMode[0].toUpperCase()+queryMode.slice(1)} search: collect relevant graph context` },
                      { key: 'extract-highlights', label: 'Extract entity IDs from query output' },
                      { key: 'build-context', label: 'Build compact knowledge graph context' },
                      { key: 'emit-answer', label: `Display ${queryMode} response` },
                    ].map(step => (
                        <div key={step.key} className="flex items-center gap-2">
                          {steps[step.key as keyof typeof steps] === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
                          {steps[step.key as keyof typeof steps] === 'done' && <span className="inline-block h-2 w-2 rounded-full bg-green-500" />}
                          <span>{step.label}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2">
                      <button className="text-xs underline text-muted-foreground" onClick={() => setShowLogs(!showLogs)}>
                        {showLogs ? 'Hide terminal output' : 'Show terminal output'}
                      </button>
                    </div>
                    {showLogs && (
                      <div className="mt-2 max-h-40 overflow-auto border rounded p-2 bg-muted/20">
                        {logs.map((l, idx) => (
                          <div key={idx} className="font-mono text-[11px] whitespace-pre-wrap">
                            <span className="text-muted-foreground">[{l.type}]</span> {l.text}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </React.Fragment>
          ))}
          {runAnchorIndex === null && Object.keys(steps).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Run Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  {[
                    { key: 'query', label: `${queryMode[0].toUpperCase()+queryMode.slice(1)} search: collect relevant graph context` },
                    { key: 'extract-highlights', label: 'Extract entity IDs from query output' },
                    { key: 'build-context', label: 'Build compact knowledge graph context' },
                    { key: 'emit-answer', label: `Display ${queryMode} response` },
                  ].map(s => (
                    <div key={s.key} className="flex items-center gap-2">
                      {steps[s.key as keyof typeof steps] === 'running' && <Loader2 className="h-3 w-3 animate-spin" />}
                      {steps[s.key as keyof typeof steps] === 'done' && <span className="inline-block h-2 w-2 rounded-full bg-green-500" />}
                      <span>{s.label}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-2">
                  <button className="text-xs underline text-muted-foreground" onClick={() => setShowLogs(!showLogs)}>
                    {showLogs ? 'Hide terminal output' : 'Show terminal output'}
                  </button>
                </div>
                {showLogs && (
                  <div className="mt-2 max-h-40 overflow-auto border rounded p-2 bg-muted/20">
                    {logs.map((l, i) => (
                      <div key={i} className="font-mono text-[11px] whitespace-pre-wrap">
                        <span className="text-muted-foreground">[{l.type}]</span> {l.text}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
          {busy && (
            <div className="text-xs text-muted-foreground flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Thinking…</div>
          )}
          <div ref={endRef} />
        </div>
      </ScrollArea>

      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask a question about the graph…"
            className="min-h-10 h-10 resize-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                send()
              }
            }}
          />
          <Button onClick={send} disabled={!canSend} className="h-10 px-3">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>

    {/* No key dialog in OpenAI-only mode */}
    </>
  )
}
