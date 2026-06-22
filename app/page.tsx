'use client'
import { useState, useEffect } from 'react'
import { remaining, canUse, recordUse, FREE_LIMIT } from '@/lib/freemium'

const UPGRADE_URL = process.env.NEXT_PUBLIC_STRIPE_URL || '#'

interface Chapter { heading: string; points: string[] }
interface Result { title: string; summary: string; chapters: Chapter[]; keyTakeaways: string[]; videoId: string }

export default function Home() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [left, setLeft] = useState<number | null>(null)

  useEffect(() => { setLeft(remaining()) }, [])

  async function run() {
    if (!url.trim()) return
    if (!canUse()) { setError('limit'); return }
    setLoading(true); setError(''); setResult(null)
    const res = await fetch('/api/summarize', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Ошибка'); setLoading(false); return }
    recordUse(); setLeft(remaining()); setResult(data); setLoading(false)
  }

  function copyAll() {
    if (!result) return
    let out = `${result.title}\n\n${result.summary}\n\n`
    result.chapters.forEach(c => {
      out += `## ${c.heading}\n` + c.points.map(p => `- ${p}`).join('\n') + '\n\n'
    })
    out += `## Главные выводы\n` + result.keyTakeaways.map(k => `- ${k}`).join('\n')
    navigator.clipboard.writeText(out)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between max-w-5xl mx-auto">
        <div className="flex items-center gap-2"><span className="text-2xl">🎬</span><span className="font-bold text-xl">StudyConspect</span></div>
        {left !== null && <span className="text-zinc-400 text-sm">Осталось: <span className="text-orange-400 font-semibold">{left}</span>/{FREE_LIMIT}</span>}
      </header>

      <div className="max-w-2xl mx-auto px-6 pt-12 pb-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-bold mb-4">Конспект из<br /><span className="text-orange-400">YouTube видео</span></h1>
        <p className="text-zinc-400 text-lg">Вставьте ссылку — получите структурированный конспект с разделами и выводами.</p>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-20 space-y-5">
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-4">
          <input value={url} onChange={e => setUrl(e.target.value)}
            placeholder="https://youtube.com/watch?v=..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-3 outline-none focus:border-orange-500" />
          <button onClick={run} disabled={loading || !url.trim()}
            className="w-full bg-orange-600 hover:bg-orange-700 font-semibold py-3 rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2">
            {loading ? <><span className="animate-spin">⟳</span> Анализирую видео...</> : 'Сделать конспект →'}
          </button>
          {error === 'limit' ? (
            <div className="bg-zinc-800 rounded-xl p-5 text-center">
              <p className="font-semibold mb-2">Лимит исчерпан</p>
              <p className="text-zinc-400 text-sm mb-4">Безлимит — $9/мес</p>
              <a href={UPGRADE_URL} className="inline-block bg-orange-600 hover:bg-orange-700 font-semibold px-6 py-3 rounded-xl">Перейти на Pro →</a>
            </div>
          ) : error ? <p className="text-red-400 text-sm">{error}</p> : null}
        </div>

        {result && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 space-y-5">
            <div className="flex justify-between items-start gap-4">
              <h2 className="text-2xl font-bold">{result.title}</h2>
              <button onClick={copyAll} className="text-orange-400 text-sm hover:text-orange-300 shrink-0">Копировать всё</button>
            </div>
            <p className="text-zinc-300 bg-zinc-800 rounded-xl p-4">{result.summary}</p>
            {result.chapters?.map((c, i) => (
              <div key={i} className="border-t border-zinc-800 pt-4">
                <h3 className="font-semibold text-orange-300 mb-2">{c.heading}</h3>
                <ul className="space-y-1">{c.points?.map((p, j) => <li key={j} className="text-zinc-300 text-sm flex gap-2"><span className="text-zinc-600">•</span>{p}</li>)}</ul>
              </div>
            ))}
            {result.keyTakeaways?.length > 0 && (
              <div className="border-t border-zinc-800 pt-4">
                <h3 className="font-semibold mb-2">🎯 Главные выводы</h3>
                <ul className="space-y-1">{result.keyTakeaways.map((k, i) => <li key={i} className="text-zinc-300 text-sm flex gap-2"><span className="text-orange-400">✓</span>{k}</li>)}</ul>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
