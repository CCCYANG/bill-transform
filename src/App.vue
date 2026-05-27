<template>
  <div class="app-container">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <span class="title">账单转换工具</span>
          <span class="subtitle">招商银行信用卡 PDF → 记账模板</span>
        </div>
      </template>

      <div class="upload-section">
        <el-upload
          drag
          :auto-upload="false"
          :show-file-list="false"
          accept=".pdf"
          :on-change="onFileChange"
        >
          <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
          <div class="el-upload__text">将 PDF 拖到此处，或<em>点击上传</em></div>
          <template #tip>
            <div class="el-upload__tip">仅支持招商银行信用卡 PDF 对账单</div>
          </template>
        </el-upload>
        <div v-if="sourceFile" class="file-info">
          <el-icon><Document /></el-icon>
          <span>{{ sourceFile.name }}</span>
          <el-tag type="info" size="small">{{ (sourceFile.size / 1024).toFixed(1) }} KB</el-tag>
          <el-tag v-if="parsed" type="success" size="small">
            共 {{ parsed.transactions.length }} 笔
          </el-tag>
        </div>
      </div>

      <div v-if="result" class="preview-section">
        <el-divider content-position="left">
          <el-icon><Edit /></el-icon>
          预览（{{ totalCount }} 条）
        </el-divider>

        <div class="batch-action-section">
          <span class="batch-label">批量设置成员：</span>
          <el-select v-model="batchMember" size="small" style="width: 160px" @change="handleBatchMemberChange">
            <el-option label="宝宝的憨憨" value="宝宝的憨憨" />
            <el-option label="憨憨的宝宝" value="憨憨的宝宝" />
          </el-select>
        </div>

        <el-table :data="result.records" border stripe height="430" size="small">
          <el-table-column prop="交易类型" label="交易类型" width="80">
            <template #default="{ row }">
              <el-tag :type="row.交易类型 === '收入' ? 'success' : 'danger'" size="small">
                {{ row.交易类型 }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="日期" label="日期" width="160" sortable />
          <el-table-column prop="一级分类" label="一级分类" width="100" />
          <el-table-column prop="二级分类" label="二级分类" width="100" />
          <el-table-column prop="收入账户" label="收入账户" width="140" />
          <el-table-column prop="金额" label="金额" width="90" align="right" />
          <el-table-column prop="成员" label="成员" width="140">
            <template #default="{ row }">
              <el-select v-model="row.成员" size="small" style="width: 100%">
                <el-option label="宝宝的憨憨" value="宝宝的憨憨" />
                <el-option label="憨憨的宝宝" value="憨憨的宝宝" />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column prop="商家" label="商家" min-width="180" show-overflow-tooltip />
          <el-table-column prop="项目" label="项目" width="120" />
          <el-table-column prop="备注" label="备注" min-width="240" show-overflow-tooltip />
        </el-table>
      </div>

      <div class="action-section">
        <el-button
          type="success"
          size="large"
          :disabled="!result"
          @click="handleExport"
        >
          <el-icon><Download /></el-icon>
          导出 Excel
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { UploadFilled, Document, Edit, Download } from '@element-plus/icons-vue'
import { parseCmbStatement } from './lib/pdfParser.js'
import { transform } from './lib/transform.js'
import { buildWorkbook, downloadWorkbook } from './lib/excelWriter.js'

const sourceFile = ref(null)
const parsed = ref(null)
const result = ref(null)
const batchMember = ref('宝宝的憨憨')

const totalCount = computed(() => {
  if (!result.value) return 0
  return result.value.records.length
})

const onFileChange = async (file) => {
  const raw = file.raw
  if (!raw) return
  sourceFile.value = raw
  parsed.value = null
  result.value = null
  try {
    const buf = await raw.arrayBuffer()
    const p = await parseCmbStatement(buf)
    if (!p.transactions.length) throw new Error('未识别到任何交易记录')
    parsed.value = p
    result.value = transform(p)
    result.value.records.forEach(record => {
      record.成员 = '宝宝的憨憨'
    })
    ElMessage.success(`解析成功，共 ${p.transactions.length} 笔交易`)
  } catch (e) {
    ElMessage.error('解析失败：' + e.message)
    console.error(e)
  }
}

const handleBatchMemberChange = (value) => {
  if (!result.value) return
  result.value.records.forEach(record => {
    record.成员 = value
  })
  ElMessage.success(`已将所有成员设置为「${value}」`)
}

const handleExport = async () => {
  if (!result.value) return
  try {
    const wb = await buildWorkbook(result.value)
    const ym = parsed.value ? `${parsed.value.billYear}${String(parsed.value.billMonth).padStart(2, '0')}` : ''
    await downloadWorkbook(wb, `招行信用卡_${ym}_导入.xlsx`)
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
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}
.main-card {
  max-width: 1200px;
  margin: 0 auto;
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
  gap: 8px;
}
.batch-label {
  font-size: 14px;
  color: #606266;
}
.action-section {
  margin-top: 24px;
  text-align: center;
}
</style>
