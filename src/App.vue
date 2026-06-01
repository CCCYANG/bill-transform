<template>
  <div class="app-container">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <span class="title">账单转换工具</span>
          <span class="subtitle">信用卡 PDF / 京东 CSV → 记账模板</span>
        </div>
      </template>

      <div class="upload-section">
        <el-upload
          drag
          :auto-upload="false"
          :show-file-list="false"
          accept=".pdf,.csv"
          :on-change="onFileChange"
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">将 PDF 或 CSV 拖到此处，或<em>点击上传</em></div>
          <template #tip>
            <div class="el-upload__tip">支持多家银行信用卡 PDF 对账单、京东账单 CSV</div>
          </template>
        </el-upload>
        <div v-if="sourceFile" class="file-info">
          <el-icon><document /></el-icon>
          <span>{{ sourceFile.name }}</span>
          <el-tag type="info" size="small">{{ (sourceFile.size / 1024).toFixed(1) }} KB</el-tag>
          <el-tag v-if="parsed" type="success" size="small">
            共 {{ totalCount }} 笔
          </el-tag>
        </div>
      </div>

      <div v-if="isLoading" class="loading-section">
        <div class="loading-content">
          <el-icon class="is-loading" style="font-size: 48px;"><loading /></el-icon>
          <div class="loading-text">正在解析文件，请稍候...</div>
        </div>
      </div>

      <div v-else-if="result" class="preview-section">
        <el-divider content-position="left">
          <el-icon><edit /></el-icon>
          预览
        </el-divider>

        <div class="batch-action-section">
          <div class="batch-item">
            <span class="batch-label">批量设置成员：</span>
            <el-select
              v-model="batchMember"
              size="small"
              style="width: 160px"
              @change="handleBatchMemberChange"
            >
              <el-option label="宝宝的憨憨" value="宝宝的憨憨" />
              <el-option label="憨憨的宝宝" value="憨憨的宝宝" />
            </el-select>
          </div>
          <div class="batch-item">
            <span class="batch-label">日期筛选：</span>
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始"
              end-placeholder="结束"
              size="small"
              style="width: 280px"
            />
          </div>
        </div>

        <el-tabs v-model="activeTab" type="border-card">
          <el-tab-pane :label="`支出 (${expenses.length})`" name="expenses">
            <el-table
              :data="expenses"
              border
              stripe
              height="380"
              size="small"
            >
              <el-table-column prop="交易类型" label="交易类型" width="80">
                <template #default="{ row }">
                  <el-tag type="danger" size="small">{{ row.交易类型 }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column
                prop="日期"
                label="日期"
                width="160"
                sortable
              />
              <el-table-column prop="一级分类" label="一级分类" width="100" />
              <el-table-column prop="二级分类" label="二级分类" width="100" />
              <el-table-column prop="收入账户" label="支出账户" width="140" />
              <el-table-column
                prop="金额"
                label="金额"
                width="90"
                align="right"
              />
              <el-table-column prop="成员" label="成员" width="140">
                <template #default="{ row }">
                  <el-select v-model="row.成员" size="small" style="width: 100%">
                    <el-option label="宝宝的憨憨" value="宝宝的憨憨" />
                    <el-option label="憨憨的宝宝" value="憨憨的宝宝" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column
                prop="商家"
                label="商家"
                min-width="180"
                show-overflow-tooltip
              />
              <el-table-column prop="项目" label="项目" width="120" />
              <el-table-column
                prop="备注"
                label="备注"
                min-width="240"
                show-overflow-tooltip
              />
            </el-table>
          </el-tab-pane>
          <el-tab-pane :label="`收入 (${incomes.length})`" name="incomes">
            <el-table
              :data="incomes"
              border
              stripe
              height="380"
              size="small"
            >
              <el-table-column prop="交易类型" label="交易类型" width="80">
                <template #default="{ row }">
                  <el-tag type="success" size="small">{{ row.交易类型 }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column
                prop="日期"
                label="日期"
                width="160"
                sortable
              />
              <el-table-column prop="一级分类" label="一级分类" width="100" />
              <el-table-column prop="二级分类" label="二级分类" width="100" />
              <el-table-column prop="收入账户" label="收入账户" width="140" />
              <el-table-column
                prop="金额"
                label="金额"
                width="90"
                align="right"
              />
              <el-table-column prop="成员" label="成员" width="140">
                <template #default="{ row }">
                  <el-select v-model="row.成员" size="small" style="width: 100%">
                    <el-option label="宝宝的憨憨" value="宝宝的憨憨" />
                    <el-option label="憨憨的宝宝" value="憨憨的宝宝" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column
                prop="商家"
                label="商家"
                min-width="180"
                show-overflow-tooltip
              />
              <el-table-column prop="项目" label="项目" width="120" />
              <el-table-column
                prop="备注"
                label="备注"
                min-width="240"
                show-overflow-tooltip
              />
            </el-table>
          </el-tab-pane>
          <el-tab-pane :label="`转账 (${transfers.length})`" name="transfers">
            <div class="transfer-notice">
              <el-alert
                title="转账数据仅展示，不做导入"
                type="warning"
                :closable="false"
                show-icon
              />
            </div>
            <el-table
              :data="transfers"
              border
              stripe
              height="380"
              size="small"
            >
              <el-table-column prop="交易类型" label="交易类型" width="80">
                <template #default="{ row }">
                  <el-tag type="warning" size="small">{{ row.交易类型 }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column
                prop="日期"
                label="日期"
                width="160"
                sortable
              />
              <el-table-column label="转出账户" width="140" />
              <el-table-column prop="收入账户" label="转入账户" width="140" />
              <el-table-column
                prop="金额"
                label="金额"
                width="90"
                align="right"
              />
              <el-table-column prop="成员" label="成员" width="140" />
              <el-table-column label="商家" min-width="180" />
              <el-table-column label="项目" width="120" />
              <el-table-column label="备注" min-width="240" />
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>

      <div v-if="showDebug && rawLines.length" class="debug-section">
        <el-divider content-position="left">
          <el-icon><document /></el-icon>
          原始内容（前 100 行）
        </el-divider>
        <el-card class="debug-card">
          <pre>{{ rawLines.slice(0, 100).join('\n') }}</pre>
        </el-card>
      </div>

      <div class="action-section">
        <el-button
          type="success"
          size="large"
          :disabled="!result"
          @click="handleExport"
        >
          <el-icon><download /></el-icon>
          导出 Excel
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, Document, Edit, Download, Loading } from '@element-plus/icons-vue'
import { parseCmbStatement } from './lib/pdf-parser.js'
import { parseJdCsv } from './lib/jd-csv-parser.js'
import { getCreditCardAccount, transform } from './lib/transform.js'
import { buildWorkbook, downloadWorkbook } from './lib/excel-writer.js'

const sourceFile = ref(null)
const parsed = ref(null)
const result = ref(null)
const activeTab = ref('expenses')
const batchMember = ref('宝宝的憨憨')
const isLoading = ref(false)
const dateRange = ref([])
const showDebug = ref(false)
const rawLines = ref([])

const allRecords = computed(() => {
  if (!result.value) return []
  return [...result.value.expenses, ...result.value.incomes, ...result.value.transfers]
})

const minDate = computed(() => {
  const dates = allRecords.value.map(r => new Date(r.日期))
  return dates.length ? new Date(Math.min(...dates)) : null
})

const maxDate = computed(() => {
  const dates = allRecords.value.map(r => new Date(r.日期))
  return dates.length ? new Date(Math.max(...dates)) : null
})

const filteredExpenses = computed(() => {
  if (!result.value) return []
  if (!dateRange.value || dateRange.value.length !== 2) return result.value.expenses
  const [start, end] = dateRange.value
  return result.value.expenses.filter(r => {
    const d = new Date(r.日期)
    return d >= start && d <= end
  })
})

const filteredIncomes = computed(() => {
  if (!result.value) return []
  if (!dateRange.value || dateRange.value.length !== 2) return result.value.incomes
  const [start, end] = dateRange.value
  return result.value.incomes.filter(r => {
    const d = new Date(r.日期)
    return d >= start && d <= end
  })
})

const filteredTransfers = computed(() => {
  if (!result.value) return []
  if (!dateRange.value || dateRange.value.length !== 2) return result.value.transfers
  const [start, end] = dateRange.value
  return result.value.transfers.filter(r => {
    const d = new Date(r.日期)
    return d >= start && d <= end
  })
})

const expenses = filteredExpenses
const incomes = filteredIncomes
const transfers = filteredTransfers

const totalCount = computed(() => {
  if (!result.value) return 0
  return result.value.expenses.length + result.value.incomes.length + result.value.transfers.length
})

const onFileChange = async (file) => {
  const raw = file.raw
  if (!raw) return
  sourceFile.value = raw
  parsed.value = null
  result.value = null
  rawLines.value = []
  dateRange.value = []
  isLoading.value = true
  try {
    const buf = await raw.arrayBuffer()
    const fileName = raw.name.toLowerCase()
    
    let p
    if (fileName.endsWith('.csv')) {
      // CSV 文件，使用京东 CSV 解析器
      p = await parseJdCsv(buf)
    } else if (fileName.endsWith('.pdf')) {
      // PDF 文件，使用 PDF 解析器
      p = await parseCmbStatement(buf)
    } else {
      throw new Error('不支持的文件格式，请上传 PDF 或 CSV 文件')
    }
    
    rawLines.value = p.rawLines || []
    if (!p.transactions.length) {
      showDebug.value = true
      throw new Error('未识别到任何交易记录，请查看原始内容')
    }
    parsed.value = p
    // 根据不同的账单类型设置默认账户
    const account = getCreditCardAccount(p)
    result.value = transform(p, { creditCardAccount: account })
    result.value.expenses.forEach(record => {
      record.成员 = '宝宝的憨憨'
    })
    result.value.incomes.forEach(record => {
      record.成员 = '宝宝的憨憨'
    })
    // 设置默认日期范围为最大日期区间
    await new Promise(resolve => setTimeout(resolve, 0))
    if (minDate.value && maxDate.value) {
      dateRange.value = [minDate.value, maxDate.value]
    }
    ElMessage.success(`解析成功，共 ${p.transactions.length} 笔交易`)
  } catch (e) {
    ElMessage.error('解析失败：' + e.message)
    console.error(e)
  } finally {
    isLoading.value = false
  }
}

const handleBatchMemberChange = (value) => {
  if (!result.value) return
  result.value.expenses.forEach(record => {
    record.成员 = value
  })
  result.value.incomes.forEach(record => {
    record.成员 = value
  })
  ElMessage.success(`已将所有成员设置为「${value}」`)
}

const handleExport = async () => {
  if (!result.value) return
  try {
    const filteredResult = {
      expenses: filteredExpenses.value,
      incomes: filteredIncomes.value,
      transfers: filteredTransfers.value
    }
    const wb = await buildWorkbook(filteredResult)
    const bankName = parsed.value?.bankName || '信用卡'
    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`
    await downloadWorkbook(wb, `${bankName}_${dateStr}_${timeStr}.xlsx`)
    ElMessage.success('导出成功')
  } catch (e) {
    ElMessage.error('导出失败：' + e.message)
    console.error(e)
  }
}
</script>

<style scoped>
.app-container {
  padding: 24px;
  min-height: 100vh;
  width: 100%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.main-card {
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}
.card-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.card-header .title {
  font-size: 22px;
  font-weight: 600;
  color: #303133;
}
.card-header .subtitle {
  font-size: 13px;
  color: #909399;
}
.upload-section { margin-bottom: 16px; }
.file-info {
  margin-top: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #f5f7fa;
  border-radius: 4px;
}
.preview-section { margin-top: 16px; }
.batch-action-section {
  margin-bottom: 12px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}
.batch-item {
  display: flex;
  align-items: center;
  gap: 8px;
}
.batch-label {
  font-size: 14px;
  color: #606266;
}
.loading-section {
  margin-top: 24px;
  padding: 48px;
  background: #f5f7fa;
  border-radius: 8px;
  text-align: center;
}
.loading-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}
.loading-text {
  font-size: 16px;
  color: #606266;
}
.transfer-notice {
  margin-bottom: 12px;
}
.debug-section {
  margin-top: 16px;
}
.debug-card {
  max-height: 400px;
  overflow-y: auto;
}
.debug-card pre {
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  margin: 0;
}
.action-section {
  margin-top: 24px;
  text-align: center;
}
</style>
