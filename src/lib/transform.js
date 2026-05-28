import { classify } from './categories.js'

const ACCOUNT = '招商银行信用卡'

function extractMerchant (desc) {
  const idx = desc.indexOf('-')
  if (idx > 0) return desc.slice(idx + 1).trim()
  return desc.trim()
}

export function transform (parsed, options = {}) {
  const { creditCardAccount = ACCOUNT } = options
  const expenses = []
  const incomes = []
  const transfers = []

  for (const t of parsed.transactions) {
    const merchant = extractMerchant(t.desc)
    const remark = t.desc

    if (t.section === 'repayment') {
      transfers.push({
        交易类型: '转账',
        日期: t.transDate,
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
      incomes.push({
        交易类型: '收入',
        日期: t.transDate,
        一级分类: '其他',
        二级分类: '退款',
        收入账户: creditCardAccount,
        金额: Math.abs(t.amount),
        成员: '',
        商家: merchant,
        项目: '',
        备注: remark
      })
      continue
    }

    const [c1, c2] = classify(merchant)
    expenses.push({
      交易类型: '支出',
      日期: t.transDate,
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

  expenses.sort((a, b) => a.日期.localeCompare(b.日期))
  incomes.sort((a, b) => a.日期.localeCompare(b.日期))
  transfers.sort((a, b) => a.日期.localeCompare(b.日期))

  return { expenses, incomes, transfers }
}
