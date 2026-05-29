import test from 'node:test'
import assert from 'node:assert/strict'

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
