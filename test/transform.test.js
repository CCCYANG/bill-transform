import test from 'node:test'
import assert from 'node:assert/strict'

import { detectBank } from '../src/lib/bank-detector.js'
import { getCreditCardAccount, transform } from '../src/lib/transform.js'

test('maps CCB statements to the CCB credit card account', () => {
  assert.equal(getCreditCardAccount({ bankName: '建设银行' }), '建设银行信用卡')
})

test('uses parsed bank account when transform receives no account option', () => {
  const parsed = {
    bankName: '建设银行',
    transactions: [
      {
        section: 'expense',
        transDate: '2026-05-01 06:00:00',
        desc: '商户 - 测试消费',
        amount: 12.34
      }
    ]
  }

  const result = transform(parsed)

  assert.equal(result.expenses[0].收入账户, '建设银行信用卡')
})

test('detects CGB statements without the website verification line', () => {
  const lines = [
    '信用卡账户信息',
    '账单周期 2025/12/25 - 2026/01/24 个人消费额度 32,000.00',
    '卡号末四位 本期账单金额 最低还款额 最后还款日 入账货币 存款 卡片消费额度',
    '您可通过发现精彩、手机银行、网上银行等官方渠道查询了解利率详情及息费计收规则。'
  ]

  assert.equal(detectBank(lines), '广发银行')
})

test('does not detect CGB from transaction format alone', () => {
  const lines = [
    '信用卡账户信息',
    '2026/01/23 2026/01/24 (消费)拼多多支付-拼多多平台商户 99.69 人民币 99.69 人民币'
  ]

  assert.equal(detectBank(lines), '信用卡')
})
