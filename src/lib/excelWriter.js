import ExcelJS from 'exceljs'

const HEADER = ['交易类型', '日期', '一级分类', '二级分类', '收入账户', '金额', '成员', '商家', '项目', '备注']

export async function buildWorkbook({ records }) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet('账单')

  worksheet.columns = HEADER.map((h, i) => ({
    header: h,
    key: h,
    width: i === 7 ? 30 : i === 9 ? 40 : i === 1 ? 20 : i === 4 ? 18 : 12
  }))

  const headerRow = worksheet.getRow(1)
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' }
  }
  headerRow.font = {
    bold: true
  }
  headerRow.alignment = {
    vertical: 'middle',
    horizontal: 'center'
  }

  worksheet.addRows(records)

  return workbook
}

export async function downloadWorkbook(workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
