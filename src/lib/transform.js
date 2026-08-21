import dayjs from 'dayjs'

import { classify, classifyIncome } from './categories.js'

const CREDIT_CARD_ACCOUNTS = {
  京东: '京东白条',
  招商银行: '招商银行信用卡',
  广发银行: '广发银行信用卡',
  建设银行: '建设银行信用卡',
  微信: '微信钱包'
}

const DEFAULT_ACCOUNT = '信用卡'

export function getCreditCardAccount (parsed = {}) {
  return CREDIT_CARD_ACCOUNTS[parsed.bankName] || DEFAULT_ACCOUNT
}

function extractMerchant (desc) {
  const idx = desc.indexOf('-')
  if (idx > 0) return desc.slice(idx + 1).trim()
  return desc.trim()
}

/**
 * 确保日期是字符串格式
 */
function ensureDate (dateVal) {
  if (!dateVal) return ''
  if (typeof dateVal === 'string') return dateVal
  return String(dateVal)
}

/**
 * 使用dayjs进行日期比较
 */
function compareDates (dateA, dateB) {
  const aStr = ensureDate(dateA)
  const bStr = ensureDate(dateB)
  const dA = dayjs(aStr)
  const dB = dayjs(bStr)
  return dA.isValid() && dB.isValid() ? dA.valueOf() - dB.valueOf() : aStr.localeCompare(bStr)
}

export function transform (parsed, options = {}) {
  const { creditCardAccount = getCreditCardAccount(parsed), enableDedup = false } = options
  const expenses = []
  const incomes = []
  const transfers = []

  for (const t of parsed.transactions) {
    const merchant = extractMerchant(t.desc)
    const remark = t.desc
    const transDate = ensureDate(t.transDate)
    const account = getCreditCardAccount({ bankName: t.source || parsed.bankName }) || creditCardAccount

    if (t.section === 'repayment') {
      transfers.push({
        交易类型: '转账',
        日期: transDate,
        一级分类: '',
        二级分类: '',
        收入账户: account,
        金额: t.amount,
        成员: '',
        商家: merchant,
        项目: '',
        备注: remark,
        _isTransfer: true,
        _source: t.source || account,
        _sourceFile: t.sourceFile || ''
      })
      continue
    }

    if (t.section === 'refund') {
      const [c1, c2] = classifyIncome(remark)
      incomes.push({
        交易类型: '收入',
        日期: transDate,
        一级分类: c1,
        二级分类: c2,
        收入账户: account,
        金额: Math.abs(t.amount),
        成员: '',
        商家: merchant,
        项目: '',
        备注: remark,
        _source: t.source || account,
        _sourceFile: t.sourceFile || ''
      })
      continue
    }

    const { category: [c1, c2], fromDefault } = classify(remark, t.jdCategory)
    expenses.push({
      交易类型: '支出',
      日期: transDate,
      一级分类: c1,
      二级分类: c2,
      收入账户: account,
      金额: t.amount,
      成员: '',
      商家: merchant,
      项目: '',
      备注: remark,
      _source: t.source || account,
      _sourceFile: t.sourceFile || '',
      _hasCategory: !!t.jdCategory,
      _fromDefaultCategory: fromDefault
    })
  }

  // 使用dayjs进行日期排序
  expenses.sort((a, b) => compareDates(a.日期, b.日期))
  incomes.sort((a, b) => compareDates(a.日期, b.日期))
  transfers.sort((a, b) => compareDates(a.日期, b.日期))

  const markedExpenses = markDuplicateExpenses(expenses)

  let resultExpenses = markedExpenses
  let dedupCount = 0

  if (enableDedup) {
    const { expenses: deduped, removed } = deduplicateExpenses(markedExpenses)
    resultExpenses = deduped
    dedupCount = removed
  }

  return { expenses: resultExpenses, incomes, transfers, dedupCount }
}

function getDateKey (dateStr) {
  if (!dateStr) return ''
  const d = dayjs(dateStr)
  if (!d.isValid()) {
    const match = dateStr.match(/(\d{4})[-/](\d{2})[-/](\d{2})/)
    return match ? `${match[1]}-${match[2]}-${match[3]}` : ''
  }
  return d.format('YYYY-MM-DD')
}

function longestCommonSubstring (s1, s2) {
  if (!s1 || !s2) return ''
  const arr1 = Array.from(s1)
  const arr2 = Array.from(s2)
  const m = arr1.length
  const n = arr2.length
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  let maxLen = 0
  let endIdx = 0
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (arr1[i - 1] === arr2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1
        if (dp[i][j] > maxLen) {
          maxLen = dp[i][j]
          endIdx = i
        }
      }
    }
  }
  return arr1.slice(endIdx - maxLen, endIdx).join('')
}

function hasMerchantOverlap (m1, m2) {
  if (!m1 || !m2) return false
  if (m1 === m2) return true
  const common = longestCommonSubstring(m1, m2)
  return Array.from(common).length >= 2
}

function markDuplicateExpenses (expenses) {
  for (const exp of expenses) {
    exp._isDuplicate = false
  }

  const groups = {}
  for (let i = 0; i < expenses.length; i++) {
    const exp = expenses[i]
    const dateKey = getDateKey(exp.日期)
    const amount = exp.金额
    if (!dateKey || amount === 0) continue
    const key = `${dateKey}_${amount}`
    if (!groups[key]) groups[key] = []
    groups[key].push(i)
  }

  Object.values(groups).forEach(indices => {
    if (indices.length <= 1) return

    const marked = new Set()
    for (let a = 0; a < indices.length; a++) {
      if (marked.has(indices[a])) continue
      const group = [indices[a]]
      for (let b = a + 1; b < indices.length; b++) {
        if (marked.has(indices[b])) continue
        const m1 = expenses[indices[a]].商家 || ''
        const m2 = expenses[indices[b]].商家 || ''
        const f1 = expenses[indices[a]]._sourceFile || ''
        const f2 = expenses[indices[b]]._sourceFile || ''
        if (f1 && f2 && f1 === f2) continue
        if (hasMerchantOverlap(m1, m2)) {
          group.push(indices[b])
          marked.add(indices[b])
        }
      }
      if (group.length > 1) {
        marked.add(indices[a])
        group.forEach(idx => {
          expenses[idx]._isDuplicate = true
        })
      }
    }
  })

  return expenses
}

const SOURCE_PRIORITY = {
  '微信钱包': 1,
  '京东白条': 2,
  '招商银行信用卡': 3,
  '广发银行信用卡': 4,
  '建设银行信用卡': 5,
  '信用卡': 6
}

function getSourceScore (source) {
  return SOURCE_PRIORITY[source] ?? 99
}

function calcMerchantQuality (merchant) {
  if (!merchant) return 0
  const chars = Array.from(merchant)
  let score = chars.length
  if (/公司/.test(merchant)) score += 2
  if (/店|铺|专柜/.test(merchant)) score += 1
  if (/商城|平台|超市/.test(merchant)) score += 1
  return score
}

function calcExpenseQuality (exp) {
  let score = 0
  score += calcMerchantQuality(exp.商家 || '')
  score += (exp.备注 || '').length * 0.5
  if (exp._hasCategory) score += 3
  if (exp.一级分类) score += 1
  if (exp.二级分类) score += 1
  score += (100 - getSourceScore(exp._source)) * 0.1
  return score
}

function deduplicateExpenses (expenses) {
  const groups = {}
  for (let i = 0; i < expenses.length; i++) {
    const exp = expenses[i]
    const dateKey = getDateKey(exp.日期)
    const amount = exp.金额
    if (!dateKey || amount === 0) continue
    const key = `${dateKey}_${amount}`
    if (!groups[key]) groups[key] = []
    groups[key].push(i)
  }

  const toRemove = new Set()

  Object.values(groups).forEach(indices => {
    if (indices.length <= 1) return

    const visited = new Set()
    for (let a = 0; a < indices.length; a++) {
      if (visited.has(indices[a])) continue
      const dupGroup = [indices[a]]
      for (let b = a + 1; b < indices.length; b++) {
        if (visited.has(indices[b])) continue
        const m1 = expenses[indices[a]].商家 || ''
        const m2 = expenses[indices[b]].商家 || ''
        const f1 = expenses[indices[a]]._sourceFile || ''
        const f2 = expenses[indices[b]]._sourceFile || ''
        if (f1 && f2 && f1 === f2) continue
        if (hasMerchantOverlap(m1, m2)) {
          dupGroup.push(indices[b])
          visited.add(indices[b])
        }
      }
      if (dupGroup.length > 1) {
        visited.add(indices[a])
        let bestIdx = dupGroup[0]
        let bestScore = calcExpenseQuality(expenses[bestIdx])
        for (let i = 1; i < dupGroup.length; i++) {
          const s = calcExpenseQuality(expenses[dupGroup[i]])
          if (s > bestScore) {
            bestScore = s
            bestIdx = dupGroup[i]
          }
        }
        dupGroup.forEach(idx => {
          if (idx !== bestIdx) {
            toRemove.add(idx)
            expenses[idx]._isDuplicate = true
            expenses[idx]._keptIndex = bestIdx
          } else {
            expenses[idx]._isDuplicate = false
          }
        })
      }
    }
  })

  const filtered = expenses.filter((_, i) => !toRemove.has(i))
  return { expenses: filtered, removed: toRemove.size }
}
