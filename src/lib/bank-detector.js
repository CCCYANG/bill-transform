export function detectBank (lines) {
  const fullText = lines.join(' ')
  if (fullText.includes('微信支付') || fullText.includes('微信支付账单')) return '微信'
  if (fullText.includes('招商银行')) return '招商银行'
  const hasCgbWebsite = fullText.includes('cgbchina.com.cn')
  const hasCgbAppText = fullText.includes('发现精彩')
  if (hasCgbWebsite || hasCgbAppText) return '广发银行'
  if (fullText.includes('中国建设银行') || fullText.includes('龙卡信用卡')) return '建设银行'
  return '信用卡'
}
