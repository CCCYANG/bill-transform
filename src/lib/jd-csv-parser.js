import * as XLSX from 'xlsx'

function parseAmount (amountStr) {
  if (!amountStr) return 0
  
  // 安全的金额解析和计算函数，用整数运算避免精度问题
  function toCents (value) {
    const numStr = (value || '').replace(/[¥,\s]/g, '')
    if (!numStr) return 0
    const parts = numStr.split('.')
    let cents = 0
    // 整数部分
    cents += (parseInt(parts[0], 10) || 0) * 100
    // 小数部分
    if (parts[1]) {
      const decimals = parts[1].padEnd(2, '0').substring(0, 2)
      cents += parseInt(decimals, 10) || 0
    }
    return cents
  }
  
  function toYuan (cents) {
    return Math.round(cents) / 100
  }
  
  // 处理退款格式，如 "2198.75(已退款320.02)" 或 "27.97(已全额退款)"
  const refundMatch = amountStr.match(/^([\d.,¥-]+)\(已退款([\d.,]+)\)$/)
  if (refundMatch) {
    const totalCents = toCents(refundMatch[1])
    const refundCents = toCents(refundMatch[2])
    return toYuan(totalCents - refundCents)
  }
  
  // 处理全额退款
  const fullRefundMatch = amountStr.match(/^([\d.,¥-]+)\(已全额退款\)$/)
  if (fullRefundMatch) {
    return 0
  }
  
  // 普通金额格式
  return toYuan(toCents(amountStr))
}

export async function parseJdCsv (arrayBuffer) {
  // 使用xlsx读取CSV文件，用type='string'读取完整原始内容
  const csvText = new TextDecoder('utf-8').decode(arrayBuffer)
  const workbook = XLSX.read(csvText, { type: 'string', raw: true, cellDates: false, cellNF: false, cellText: true })
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, raw: true })
  
  const rawLines = jsonData.map(row => row.join('\t')).filter(line => line.trim())
  
  const transactions = []
  
  // 智能查找表头行 - 查找包含"交易时间"的那一行
  let headerRowIndex = -1
  for (let i = 0; i < jsonData.length; i++) {
    const row = jsonData[i]
    if (row && row.length > 0 && row.includes('交易时间')) {
      headerRowIndex = i
      break
    }
  }
  
  if (headerRowIndex === -1 || jsonData.length <= headerRowIndex) {
    return {
      billYear: new Date().getFullYear(),
      billMonth: new Date().getMonth() + 1,
      bankName: '京东',
      transactions,
      rawLines
    }
  }
  
  const headers = jsonData[headerRowIndex]
  const headerMap = {}
  headers.forEach((col, idx) => {
    headerMap[col] = idx
  })
  
  // 从表头之后开始解析数据
  for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
    const row = jsonData[i]
    if (!row || row.length === 0 || !row[0]) continue
    
    // 获取各列数据
    const transDate = (row[headerMap['交易时间']] || '').trim()
    const merchant = row[headerMap['商户名称']] || ''
    const desc = row[headerMap['交易说明']] || ''
    const amountStr = String(row[headerMap['金额']] || '')
    const status = row[headerMap['交易状态']] || ''
    const inOut = row[headerMap['收/支']] || ''
    const jdCategory = row[headerMap['交易分类']] || ''
    
    // 忽略不计收支的交易
    if (inOut === '不计收支') continue
    
    // 解析金额
    const amount = parseAmount(amountStr)
    
    if (!transDate) continue
    
    // 判断交易类型
    let section = 'expense'
    let finalAmount = amount
    
    if (inOut === '收入') {
      section = 'refund'
    } else if (inOut === '支出') {
      section = 'expense'
    } else if (amountStr.includes('已退款') || amountStr.includes('已全额退款') || desc.includes('退款-')) {
      section = 'refund'
      finalAmount = Math.abs(amount)
    }
    
    // 如果金额为0，可能是全额退款，跳过
    if (finalAmount === 0 && !desc.includes('退款-')) continue
    
    const finalDesc = merchant ? `${merchant} - ${desc}` : desc
    
    transactions.push({
      section,
      transDate,
      postDate: transDate,
      desc: finalDesc,
      amount: Math.abs(finalAmount),
      card: '京东',
      jdCategory
    })
  }
  
  return {
    billYear: new Date().getFullYear(),
    billMonth: new Date().getMonth() + 1,
    bankName: '京东',
    transactions,
    rawLines
  }
}
