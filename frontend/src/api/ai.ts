import { ApiError } from './types'

/** AI endpoints use { success, message, data } (not the usual code/msg envelope). */

export interface AiStatusData {
  status?: string
  model?: string
  timestamp?: number
  error?: string
}

interface AiEnvelope<T> {
  success?: boolean
  message?: string
  data?: T
}

async function parseAi<T>(res: Response): Promise<T> {
  let payload: AiEnvelope<T>
  try {
    payload = (await res.json()) as AiEnvelope<T>
  } catch {
    throw new ApiError(res.status, res.statusText || 'Invalid JSON response')
  }
  if (!payload.success) {
    throw new ApiError(res.ok ? 500 : res.status, payload.message || 'AI 服务异常')
  }
  return payload.data as T
}

export async function fetchAiStatus(): Promise<AiStatusData> {
  const res = await fetch('/api/ai/status')
  return parseAi<AiStatusData>(res)
}

export async function postAiChat(question: string): Promise<string> {
  const body = new URLSearchParams()
  body.set('question', question)
  const res = await fetch('/api/ai/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const data = await parseAi<string>(res)
  return typeof data === 'string' ? data : String(data ?? '')
}
