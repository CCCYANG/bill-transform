<template>
  <div class="app-container">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <span class="title">账单转换工具</span>
        </div>
      </template>
      
      <div class="upload-section">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card class="source-card">
              <template #header>
                <div class="sub-header">
                  <span>源文件 (PDF/Excel)</span>
                  <el-button type="primary" size="small" @click="handleUpload">
                    <el-icon><Upload /></el-icon>
                    上传文件
                  </el-button>
                </div>
              </template>
              <div v-if="!sourceFile" class="empty-state">
                <el-icon class="empty-icon"><Document /></el-icon>
                <p>请上传PDF或Excel格式的账单文件</p>
              </div>
              <div v-else class="file-info">
                <el-icon><Document /></el-icon>
                <span>{{ sourceFile.name }}</span>
                <el-tag size="small" :type="getFileType(sourceFile.name) === 'pdf' ? 'danger' : 'success'">
                  {{ getFileType(sourceFile.name).toUpperCase() }}
                </el-tag>
              </div>
            </el-card>
          </el-col>
          
          <el-col :span="12">
            <el-card class="template-card">
              <template #header>
                <div class="sub-header">
                  <span>目标模板</span>
                  <el-button type="info" size="small" @click="loadTemplate">
                    <el-icon><Refresh /></el-icon>
                    加载模板
                  </el-button>
                </div>
              </template>
              <div v-if="!templateData" class="empty-state">
                <el-icon class="empty-icon"><FolderOpened /></el-icon>
                <p>点击加载模板以查看目标格式</p>
              </div>
              <div v-else class="template-info">
                <el-tag type="info">模板已加载</el-tag>
                <p class="template-path">{{ templatePath }}</p>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <div v-if="sourceFile && templateData" class="preview-section">
        <el-divider content-position="left">
          <el-icon><Edit /></el-icon>
          数据预览与映射
        </el-divider>
        
        <el-tabs v-model="activeTab" class="preview-tabs">
          <el-tab-pane label="源文件数据" name="source">
            <el-table :data="parsedData" border stripe max-height="400">
              <el-table-column prop="field" label="字段" width="150" />
              <el-table-column prop="value" label="值" />
              <el-table-column prop="mapped" label="映射状态" width="100">
                <template #default="{ row }">
                  <el-tag v-if="row.mapped" type="success" size="small">已映射</el-tag>
                  <el-tag v-else type="warning" size="small">未映射</el-tag>
                </template>
              </el-table-column>
            </el-table>
          </el-tab-pane>
          
          <el-tab-pane label="转换结果" name="result">
            <el-table :data="transformedData" border stripe max-height="400">
              <el-table-column prop="field" label="字段" width="150" />
              <el-table-column prop="value" label="值" />
            </el-table>
          </el-tab-pane>
        </el-tabs>
      </div>

      <div class="action-section">
        <el-button 
          type="primary" 
          size="large" 
          :disabled="!canTransform"
          @click="handleTransform"
        >
          <el-icon><ArrowRight /></el-icon>
          开始转换
        </el-button>
        <el-button 
          type="success" 
          size="large" 
          :disabled="!transformedData.length"
          @click="handleExport"
        >
          <el-icon><Download /></el-icon>
          导出Excel
        </el-button>
      </div>
    </el-card>

    <input 
      ref="fileInput" 
      type="file" 
      accept=".pdf,.xlsx,.xls" 
      style="display: none" 
      @change="onFileSelected"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import * as XLSX from 'xlsx'

const fileInput = ref(null)
const sourceFile = ref(null)
const templateData = ref(null)
const templatePath = ref('')
const parsedData = ref([])
const transformedData = ref([])
const activeTab = ref('source')
const templateFields = ref([])

const canTransform = computed(() => {
  return sourceFile.value && templateData.value
})

const getFileType = (filename) => {
  const ext = filename.split('.').pop().toLowerCase()
  return ext
}

const handleUpload = () => {
  fileInput.value.click()
}

const onFileSelected = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  sourceFile.value = file
  const fileType = getFileType(file.name)

  try {
    if (fileType === 'xlsx' || fileType === 'xls') {
      await parseExcelFile(file)
    } else if (fileType === 'pdf') {
      await parsePdfFile(file)
    }
    ElMessage.success('文件解析成功')
  } catch (error) {
    ElMessage.error('文件解析失败: ' + error.message)
    sourceFile.value = null
  }
}

const parseExcelFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
        
        parsedData.value = jsonData[0]?.map((value, index) => ({
          field: `字段${index + 1}`,
          value: value || '',
          mapped: false
        })) || []
        
        resolve()
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}

const parsePdfFile = async (file) => {
  ElMessage.info('PDF解析功能需要配置PDF.js，正在努力开发中...')
  parsedData.value = []
}

const loadTemplate = async () => {
  try {
    const response = await fetch('./template.xls')
    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)
    const workbook = XLSX.read(data, { type: 'array' })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
    
    templateData.value = jsonData
    templateFields.value = jsonData[0] || []
    templatePath.value = './template.xls'
    
    ElMessage.success('模板加载成功')
  } catch (error) {
    ElMessage.error('模板加载失败: ' + error.message)
  }
}

const handleTransform = () => {
  if (!templateFields.value.length) {
    ElMessage.warning('请先加载模板')
    return
  }

  transformedData.value = templateFields.value.map((field, index) => {
    const sourceItem = parsedData.value[index]
    return {
      field: field || `字段${index + 1}`,
      value: sourceItem?.value || ''
    }
  })

  parsedData.value.forEach((item, index) => {
    if (templateFields.value[index]) {
      item.mapped = true
    }
  })

  ElMessage.success('转换完成')
  activeTab.value = 'result'
}

const handleExport = () => {
  if (!transformedData.value.length) {
    ElMessage.warning('没有可导出的数据')
    return
  }

  const ws = XLSX.utils.json_to_sheet(transformedData.value)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, '转换结果')
  XLSX.writeFile(wb, 'converted_bill.xlsx')
  
  ElMessage.success('导出成功')
}
</script>

<style scoped>
.app-container {
  padding: 20px;
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.main-card {
  max-width: 1200px;
  margin: 0 auto;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
}

.card-header .title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.upload-section {
  margin-bottom: 20px;
}

.sub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.empty-state {
  text-align: center;
  padding: 40px 0;
  color: #909399;
}

.empty-icon {
  font-size: 48px;
  margin-bottom: 10px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
}

.template-info {
  text-align: center;
  padding: 10px;
}

.template-path {
  margin-top: 10px;
  font-size: 12px;
  color: #909399;
}

.preview-section {
  margin-top: 20px;
}

.preview-tabs {
  margin-top: 10px;
}

.action-section {
  margin-top: 30px;
  text-align: center;
  display: flex;
  gap: 20px;
  justify-content: center;
}
</style>