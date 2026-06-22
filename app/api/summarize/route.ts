import { NextRequest, NextResponse } from 'next/server'
import { YoutubeTranscript } from 'youtube-transcript'
import { groq, MODEL } from '@/lib/groq'

function extractId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([\w-]{11})/,
  ]
  for (const p of patterns) {
    const m = url.match(p)
    if (m) return m[1]
  }
  if (/^[\w-]{11}$/.test(url.trim())) return url.trim()
  return null
}

export async function POST(req: NextRequest) {
  try {
    const { url } = await req.json()
    const id = extractId(url || '')
    if (!id) return NextResponse.json({ error: 'Некорректная ссылка YouTube' }, { status: 400 })
    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'Сервис не настроен (нет GROQ_API_KEY)' }, { status: 503 })
    }

    let transcript
    try {
      transcript = await YoutubeTranscript.fetchTranscript(id)
    } catch {
      return NextResponse.json({ error: 'У видео нет субтитров или они недоступны' }, { status: 422 })
    }
    if (!transcript?.length) {
      return NextResponse.json({ error: 'Субтитры не найдены' }, { status: 422 })
    }

    const fullText = transcript.map(t => t.text).join(' ').slice(0, 14000)

    const system = `Ты — эксперт по конспектированию видео-лекций.
По расшифровке видео составь структурированный конспект.
Отвечай СТРОГО в формате JSON без markdown:
{
  "title": "краткое название темы видео",
  "summary": "краткое резюме в 2-3 предложениях",
  "chapters": [
    { "heading": "Название раздела", "points": ["тезис 1", "тезис 2", "тезис 3"] }
  ],
  "keyTakeaways": ["главный вывод 1", "главный вывод 2", "главный вывод 3"]
}
Пиши на языке видео. Делай 4-7 разделов.`

    const completion = await groq.chat.completions.create({
      model: MODEL,
      temperature: 0.5,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: fullText },
      ],
    })

    const data = JSON.parse(completion.choices[0]?.message?.content || '{}')
    return NextResponse.json({ ...data, videoId: id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Ошибка' }, { status: 500 })
  }
}
