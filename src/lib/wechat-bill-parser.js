import * as XLSX from 'xlsx'

function parseAmount (value) {
  if (!value) return 0
  const numStr = String(value).replace(/[¥,\s]/g, '')
  return parseFloat(numStr) || 0
}

function toStr (value) {
  if (value === null || value === undefined) return ''
  if (value instanceof Date) {
    const y = value.getFullYear()
    const m = String(value.getMonth() + 1).padStart(2, '0')
    const d = String(value.getDate()).padStart(2, '0')
    const h = String(value.getHours()).padStart(2, '0')
    const mi = String(value.getMinutes()).padStart(2, '0')
    const s = String(value.getSeconds()).padStart(2, '0')
    return `${y}-${m}-${d} ${h}:${mi}:${s}`
  }
  return String(value).trim()
}

export async function parseWechatBill (arrayBuffer) {
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), {
    type: 'array',
    cellDates: true,
    cellNF: false,
    cellText: false
  })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true })

  const rawLines = jsonData.map(row => row.map(c => toStr(c)).join('\t')).filter(line => line.trim())

  const transactions = []

  // 查找表头行
  let headerRowIndex = -1
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i]
    if (row && row.length > 0) {
      const rowStr = row.map(c => toStr(c)).join('')
      if (rowStr.includes('交易时间') && rowStr.includes('收/支')) {
        headerRowIndex = i
        break
      }
    }
  }

  if (headerRowIndex === -1 || jsonData.length <= headerRowIndex) {
    return {
      billYear: new Date().getFullYear(),
      billMonth: new Date().getMonth() + 1,
      bankName: '微信',
      transactions,
      rawLines
    }
  }

  const headers = jsonData[headerRowIndex]
  const headerMap = {}
  headers.forEach((col, idx) => {
    const colStr = toStr(col)
    if (colStr) {
      headerMap[colStr] = idx
    }
  })

  const transDateIdx = headerMap['交易时间']
  const inOutIdx = headerMap['收/支']
  const amountIdx = headerMap['金额(元)'] ?? headerMap['金额']
  const merchantIdx = headerMap['交易对方']
  const productIdx = headerMap['商品']
  const typeIdx = headerMap['交易类型']
  const statusIdx = headerMap['当前状态']
  const paymentIdx = headerMap['支付方式']

  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i]
    if (!row || row.length === 0) continue

    const transDate = toStr(row[transDateIdx])
    const inOut = toStr(row[inOutIdx])
    const amountStr = toStr(row[amountIdx])
    const merchant = toStr(row[merchantIdx])
    const product = toStr(row[productIdx])
    const type = toStr(row[typeIdx])
    const status = toStr(row[statusIdx])
    const payment = toStr(row[paymentIdx])

    if (!transDate || !amountStr || transDate === '/') continue

    // 跳过中性交易（收/支为空或/）
    if (!inOut || inOut === '/') continue

    const amount = parseAmount(amountStr)
    if (amount === 0) continue

    let section = 'expense'
    const finalAmount = amount

    if (inOut === '收入') {
      section = 'refund'
    } else if (inOut === '支出') {
      section = 'expense'
    }

    // 构建交易描述
    let desc = merchant
    if (product && product !== '/' && product !== merchant) {
      desc = `${merchant} - ${product}`
    }
    if (!desc) desc = type

    // 将支付方式附加到描述中，便于分类
    const card = payment && payment !== '/' ? payment : '微信'

    transactions.push({
      section,
      transDate,
      postDate: transDate,
      desc,
      amount: Math.abs(finalAmount),
      card,
      jdCategory: type
    })
  }

  let billYear = new Date().getFullYear()
  let billMonth = new Date().getMonth() + 1

  if (transactions.length > 0) {
    const firstDate = transactions[0].transDate
    const dateMatch = firstDate.match(/(\d{4})[-/](\d{2})/)
    if (dateMatch) {
      billYear = parseInt(dateMatch[1])
      billMonth = parseInt(dateMatch[2])
    }
  }

  return {
    billYear,
    billMonth,
    bankName: '微信',
    transactions,
    rawLines
  }
}
