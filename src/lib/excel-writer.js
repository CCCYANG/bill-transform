import ExcelJS from 'exceljs'

const EXPENSE_HEADER = ['交易类型', '日期', '一级分类', '二级分类', '支出账户', '金额', '成员', '商家', '项目', '备注']
const INCOME_HEADER = ['交易类型', '日期', '一级分类', '二级分类', '收入账户', '金额', '成员', '商家', '项目', '备注']
const TRANSFER_HEADER = ['交易类型', '日期', '转出账户', '转入账户', '金额', '成员', '商家', '项目', '备注']

export async function buildWorkbook ({ expenses, incomes, transfers }) {
  const workbook = new ExcelJS.Workbook()
  
  const expenseSheet = workbook.addWorksheet('支出')
  addSheetData(expenseSheet, expenses, EXPENSE_HEADER, 'expense')
  
  const incomeSheet = workbook.addWorksheet('收入')
  addSheetData(incomeSheet, incomes, INCOME_HEADER, 'income')
  
  const transferSheet = workbook.addWorksheet('转账')
  addSheetHeaderOnly(transferSheet, TRANSFER_HEADER)
  
  return workbook
}

function addSheetHeaderOnly (worksheet, header) {
  worksheet.columns = header.map((h, i) => ({
    header: h,
    key: h,
    width: i === 7 ? 30 : i === 9 ? 40 : i === 1 ? 20 : i === 4 ? 18 : 12
  }))

  const headerRow = worksheet.getRow(1)
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC6EFCE' }
  }
  headerRow.font = {
    bold: true,
    color: { argb: 'FF006100' }
  }
  headerRow.alignment = {
    vertical: 'middle',
    horizontal: 'center'
  }
}

function addSheetData (worksheet, data, header, type) {
  worksheet.columns = header.map((h, i) => ({
    header: h,
    key: h,
    width: i === 7 ? 30 : i === 9 ? 40 : i === 1 ? 20 : i === 4 ? 18 : 12
  }))

  const headerRow = worksheet.getRow(1)
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFC6EFCE' }
  }
  headerRow.font = {
    bold: true,
    color: { argb: 'FF006100' }
  }
  headerRow.alignment = {
    vertical: 'middle',
    horizontal: 'center'
  }

  data.forEach(row => {
    if (type === 'expense') {
      worksheet.addRow([
        row.交易类型,
        row.日期,
        row.一级分类,
        row.二级分类,
        row.收入账户,
        row.金额,
        row.成员,
        row.商家,
        row.项目,
        row.备注
      ])
    } else {
      worksheet.addRow([
        row.交易类型,
        row.日期,
        row.一级分类,
        row.二级分类,
        row.收入账户,
        row.金额,
        row.成员,
        row.商家,
        row.项目,
        row.备注
      ])
    }
  })
}

export async function downloadWorkbook (workbook, filename) {
  const buffer = await workbook.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
