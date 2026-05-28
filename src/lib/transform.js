import { classify, classifyIncome } from './categories.js'
import dayjs from 'dayjs'

const ACCOUNT = '招商银行信用卡'

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
  const { creditCardAccount = ACCOUNT } = options
  const expenses = []
  const incomes = []
  const transfers = []

  for (const t of parsed.transactions) {
    const merchant = extractMerchant(t.desc)
    const remark = t.desc
    const transDate = ensureDate(t.transDate)

    if (t.section === 'repayment') {
      transfers.push({
        交易类型: '转账',
        日期: transDate,
        一级分类: '',
        二级分类: '',
        收入账户: creditCardAccount,
        金额: t.amount,
        成员: '',
        商家: merchant,
        项目: '',
        备注: remark,
        _isTransfer: true
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
        收入账户: creditCardAccount,
        金额: Math.abs(t.amount),
        成员: '',
        商家: merchant,
        项目: '',
        备注: remark
      })
      continue
    }

    const [c1, c2] = classify(merchant, t.jdCategory)
    expenses.push({
      交易类型: '支出',
      日期: transDate,
      一级分类: c1,
      二级分类: c2,
      收入账户: creditCardAccount,
      金额: t.amount,
      成员: '',
      商家: merchant,
      项目: '',
      备注: remark
    })
  }

  // 使用dayjs进行日期排序
  expenses.sort((a, b) => compareDates(a.日期, b.日期))
  incomes.sort((a, b) => compareDates(a.日期, b.日期))
  transfers.sort((a, b) => compareDates(a.日期, b.日期))

  return { expenses, incomes, transfers }
}
