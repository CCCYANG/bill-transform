import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const SECTIONS = {
  '还款': 'repayment',
  '退款': 'refund',
  '消费': 'expense',
}

async function extractLines(arrayBuffer) {
  const doc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise
  const lines = []
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p)
    const content = await page.getTextContent()
    const items = content.items.slice().sort((a, b) => {
      const ay = -a.transform[5], by = -b.transform[5]
      if (Math.abs(ay - by) > 2) return ay - by
      return a.transform[4] - b.transform[4]
    })
    let cur = []
    let prevY = null
    for (const it of items) {
      if (!it.str) continue
      const y = -it.transform[5]
      if (prevY === null || Math.abs(y - prevY) <= 2) {
        cur.push(it.str)
      } else {
        if (cur.length) lines.push(cur.join(' ').replace(/\s+/g, ' ').trim())
        cur = [it.str]
      }
      prevY = y
    }
    if (cur.length) lines.push(cur.join(' ').replace(/\s+/g, ' ').trim())
  }
  return lines
}

function buildDate(billYear, billMonth, mmdd) {
  const [mm, dd] = mmdd.split('/').map(n => parseInt(n))
  const y = mm > billMonth ? billYear - 1 : billYear
  return `${y}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')} 06:00:00`
}

export async function parseCmbStatement(arrayBuffer) {
  const lines = await extractLines(arrayBuffer)
  const header = lines.find(l => /\d{4}年\d{2}月/.test(l)) || ''
  const ym = header.match(/(\d{4})年(\d{2})月/)
  const billYear = ym ? parseInt(ym[1]) : new Date().getFullYear()
  const billMonth = ym ? parseInt(ym[2]) : new Date().getMonth() + 1

  const re = /^(\d{2}\/\d{2})\s+(?:(\d{2}\/\d{2})\s+)?(.+?)\s+(-?[\d,]+\.\d{2})\s+(\d{4})\s+(-?[\d,]+\.\d{2})(?:\([A-Z]+\))?$/
  const transactions = []
  let section = null

  for (const raw of lines) {
    if (raw.length <= 4 && SECTIONS[raw]) { section = SECTIONS[raw]; continue }
    if (!section) continue
    const m = raw.match(re)
    if (!m) continue
    const [, td, pd, desc, rmb, card] = m
    transactions.push({
      section,
      transDate: buildDate(billYear, billMonth, td),
      postDate: pd ? buildDate(billYear, billMonth, pd) : null,
      desc: desc.trim(),
      amount: parseFloat(rmb.replace(/,/g, '')),
      card,
    })
  }
  return { billYear, billMonth, transactions, rawLines: lines }
}
