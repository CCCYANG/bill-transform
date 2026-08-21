import { getAllowedExpenseCategories } from './categories.js'

const BATCH_SIZE = 40
const MODEL = 'deepseek-chat'

function buildAllowlistText () {
  return getAllowedExpenseCategories()
    .map(({ c1, c2 }) => `${c1}/${c2}`)
    .join('、')
}

function buildAllowedSet () {
  return new Set(getAllowedExpenseCategories().map(({ c1, c2 }) => `${c1}\0${c2}`))
}

function extractJsonArray (text) {
  const raw = String(text || '').trim()
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  const candidate = fenced ? fenced[1].trim() : raw
  const start = candidate.indexOf('[')
  const end = candidate.lastIndexOf(']')
  if (start < 0 || end < start) throw new Error('AI 返回中未找到 JSON 数组')
  return JSON.parse(candidate.slice(start, end + 1))
}

async function classifyBatch (batch, { apiKey, chatUrl }) {
  const allowlist = buildAllowlistText()
  const payload = batch.map(({ id, desc }) => ({ id, desc }))

  const body = {
    model: MODEL,
    temperature: 0.1,
    messages: [
      {
        role: 'system',
        content: [
          '你是记账分类助手。根据交易说明，为每笔支出选择最合适的一级/二级分类。',
          '只能从下列允许列表中选择，禁止编造分类：',
          allowlist,
          '注意：仅当说明含糊（如仅有支付宝/财付通/微信转账收款人姓名）时用购物/日用品；餐饮/食品/店名能看出就餐的归餐饮/三餐；不要轻易使用其他/坏账。',
          '只返回 JSON 数组，不要其它说明。格式：[{"id":"...","c1":"一级","c2":"二级"}]'
        ].join('\n')
      },
      {
        role: 'user',
        content: JSON.stringify(payload)
      }
    ]
  }

  const res = await fetch(chatUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify(body)
  })

  if (!res.ok) {
    const errText = await res.text().catch(() => '')
    throw new Error(`DeepSeek 请求失败 (${res.status}): ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  const content = data?.choices?.[0]?.message?.content
  const parsed = extractJsonArray(content)
  if (!Array.isArray(parsed)) throw new Error('AI 返回格式无效')

  const allowed = buildAllowedSet()
  const results = []
  for (const row of parsed) {
    if (!row || row.id == null) continue
    const c1 = String(row.c1 || '').trim()
    const c2 = String(row.c2 || '').trim()
    if (!allowed.has(`${c1}\0${c2}`)) continue
    results.push({ id: String(row.id), c1, c2 })
  }
  return results
}

/**
 * @param {{ id: string, desc: string }[]} items
 * @param {{ apiKey: string, chatUrl: string, onProgress?: (done: number, total: number) => void }} options
 * @returns {Promise<{ id: string, c1: string, c2: string }[]>}
 */
export async function classifyExpensesWithAI (items, { apiKey, chatUrl, onProgress }) {
  if (!items.length) return []
  if (!apiKey) throw new Error('缺少 DeepSeek API Key')

  const all = []
  const totalBatches = Math.ceil(items.length / BATCH_SIZE)

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batchIndex = Math.floor(i / BATCH_SIZE) + 1
    const batch = items.slice(i, i + BATCH_SIZE)
    const part = await classifyBatch(batch, { apiKey, chatUrl })
    all.push(...part)
    if (onProgress) onProgress(batchIndex, totalBatches)
  }

  return all
}
