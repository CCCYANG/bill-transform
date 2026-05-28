import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import workerUrl from 'pdfjs-dist/legacy/build/pdf.worker.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

const SECTIONS = {
  '还款': 'repayment',
  '退款': 'refund',
  '消费': 'expense'
}

async function extractLines (arrayBuffer) {
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

function buildDate (ymd) {
  const [y, m, d] = ymd.split('/').map(n => parseInt(n))
  return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')} 06:00:00`
}

function detectBank (lines) {
  const fullText = lines.join(' ')
  if (fullText.includes('招商银行')) return '招商银行'
  if (fullText.includes('cgbchina.com.cn')) return '广发银行'
  if (fullText.includes('ccb.com.cn')) return '建设银行'
  return '信用卡'
}

export async function parseCmbStatement (arrayBuffer) {
  const lines = await extractLines(arrayBuffer)
  
  const bankName = detectBank(lines)
  
  let billYear = new Date().getFullYear()
  let billMonth = new Date().getMonth() + 1
  
  const header = lines.find(l => /\d{4}\/\d{2}\/\d{2}.*-.*\d{4}\/\d{2}\/\d{2}/.test(l))
  if (header) {
    const ym = header.match(/(\d{4})\/(\d{2})\/\d{2}/)
    if (ym) {
      billYear = parseInt(ym[1])
      billMonth = parseInt(ym[2])
    }
  }

  const transactions = []
  
  const cmbRe = /^(\d{2}\/\d{2})\s+(?:(\d{2}\/\d{2})\s+)?(.+?)\s+(-?[\d,]+\.\d{2})\s+(\d{4})\s+(-?[\d,]+\.\d{2})(?:\([A-Z]+\))?$/
  const cgbRe = /^(\d{4}\/\d{2}\/\d{2})\s+(\d{4}\/\d{2}\/\d{2})\s+\((消费|退款|还款)\)(.+?)\s+(-?[\d,]+\.\d{2})\s+人民币\s+(-?[\d,]+\.\d{2})\s+人民币$/
  
  let section = null

  for (const raw of lines) {
    if (raw.length <= 4 && SECTIONS[raw]) {
      section = SECTIONS[raw]
      continue
    }
    
    let m = raw.match(cmbRe)
    if (m) {
      if (!section) continue
      const [, td, pd, desc, rmb, card] = m
      const [mm, dd] = td.split('/').map(n => parseInt(n))
      const y = mm > billMonth ? billYear - 1 : billYear
      const transDate = `${y}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')} 06:00:00`
      
      transactions.push({
        section,
        transDate,
        postDate: pd ? `${y}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')} 06:00:00` : null,
        desc: desc.trim(),
        amount: parseFloat(rmb.replace(/,/g, '')),
        card
      })
      continue
    }
    
    m = raw.match(cgbRe)
    if (m) {
      const [, td, pd, type, desc, rmb] = m
      const sectionMap = { '消费': 'expense', '退款': 'refund', '还款': 'repayment' }
      transactions.push({
        section: sectionMap[type] || 'expense',
        transDate: buildDate(td),
        postDate: buildDate(pd),
        desc: desc.trim(),
        amount: parseFloat(rmb.replace(/,/g, '')),
        card: ''
      })
      continue
    }
  }
  
  return { billYear, billMonth, bankName, transactions, rawLines: lines }
}
