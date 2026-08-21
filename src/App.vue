<template>
  <div class="app-container">
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <div class="header-title">
            <span class="title">账单转换工具</span>
            <el-button class="settings-btn" text @click="settingsVisible = true">
              <el-icon><setting /></el-icon>
              设置
            </el-button>
          </div>
          <div class="step-nav">
            <div 
              class="step-item" 
              :class="{ active: currentStep === 0, done: currentStep > 0 }"
              @click="currentStep = 0"
            >
              <div class="step-circle">
                <el-icon v-if="currentStep > 0"><check /></el-icon>
                <span v-else>1</span>
              </div>
              <span class="step-label">上传文件</span>
            </div>
            <div class="step-line" :class="{ active: currentStep > 0 }"></div>
            <div 
              class="step-item" 
              :class="{ active: currentStep === 1, done: currentStep > 1 }"
              @click="currentStep = 1"
            >
              <div class="step-circle">
                <el-icon v-if="currentStep > 1"><check /></el-icon>
                <span v-else>2</span>
              </div>
              <span class="step-label">预览转换</span>
            </div>
          </div>
        </div>
      </template>
      
      <div class="main-content">
        <div v-show="currentStep === 0" class="upload-section">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-card class="source-card">
                <template #header>
                  <div class="sub-header">
                    <span>源文件 (支持批量上传)</span>
                    <el-button type="primary" size="small" @click="handleUpload">
                      <el-icon><upload /></el-icon>
                      上传文件
                    </el-button>
                    <el-button
                      v-if="uploadedFiles.length"
                      type="danger"
                      size="small"
                      @click="clearAllFiles"
                    >
                      <el-icon><delete /></el-icon>
                      清空
                    </el-button>
                  </div>
                </template>
                <div v-if="uploadedFiles.length === 0" class="empty-state">
                  <el-icon class="empty-icon"><document /></el-icon>
                  <p>请上传PDF、Excel或CSV格式的账单文件</p>
                  <p class="supported-formats">支持：招商银行、广发银行、建设银行、京东、微信账单</p>
                  <p class="supported-formats">支持批量上传，可多次选择文件</p>
                </div>
                <div v-else class="file-list">
                  <div v-for="(item, index) in uploadedFiles" :key="item.id" class="file-item">
                    <div class="file-info">
                      <el-icon>
                        <component :is="getFileIcon(item.type)" />
                      </el-icon>
                      <span>{{ item.name }}</span>
                      <el-tag size="small" :type="getFileTypeTag(item.name)">
                        {{ item.type.toUpperCase() }}
                      </el-tag>
                      <el-tag v-if="item.bankName" size="small" type="info">
                        {{ item.bankName }}
                      </el-tag>
                      <el-tag v-if="item.status === 'success'" size="small" type="success">
                        {{ item.transactionCount }}笔
                      </el-tag>
                      <el-tag v-if="item.status === 'error'" size="small" type="danger">
                        解析失败
                      </el-tag>
                      <el-tag v-if="item.status === 'loading'" size="small" type="warning">
                        解析中...
                      </el-tag>
                    </div>
                    <el-button type="text" size="small" @click="removeFile(index)">
                      <el-icon><close /></el-icon>
                    </el-button>
                  </div>
                  <div class="file-summary">
                    <el-tag size="small" type="info">
                      共 {{ uploadedFiles.length }} 个文件，{{ totalTransactionCount }} 笔交易
                    </el-tag>
                  </div>
                </div>
              </el-card>
            </el-col>
          
            <el-col :span="12">
              <el-card class="template-card">
                <template #header>
                  <div class="sub-header">
                    <span>目标模板</span>
                    <el-button type="info" size="small" @click="loadTemplate">
                      <el-icon><refresh /></el-icon>
                      加载模板
                    </el-button>
                  </div>
                </template>
                <div v-if="!templateData" class="empty-state">
                  <el-icon class="empty-icon"><folder-opened /></el-icon>
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

        <div v-show="currentStep === 1" class="preview-section">
          <el-tabs v-model="activeTab" class="preview-tabs">
            <el-tab-pane label="源文件数据" name="source">
              <el-table
                :data="allTransactions"
                border
                stripe
                max-height="1000"
              >
                <el-table-column prop="sourceFile" label="来源文件" width="200" />
                <el-table-column prop="transDate" label="日期" width="150" />
                <el-table-column prop="desc" label="交易说明" />
                <el-table-column prop="amount" label="金额" width="120" />
                <el-table-column prop="section" label="类型" width="100">
                  <template #default="{ row }">
                    <el-tag :type="getSectionTag(row.section)" size="small">
                      {{ getSectionLabel(row.section) }}
                    </el-tag>
                  </template>
                </el-table-column>
              </el-table>
            </el-tab-pane>
          
            <el-tab-pane label="转换结果" name="result">
              <div class="result-toolbar">
                <div class="toolbar-switches">
                  <el-switch
                    v-model="enableDedup"
                    :disabled="!hasDuplicates"
                    active-text="智能去重"
                    inactive-text="显示全部"
                    @change="handleDedupChange"
                  />
                  <el-switch
                    v-model="smartClassifyEnabled"
                    :disabled="!hasDeepseekApiKey"
                    active-text="智能分类"
                    inactive-text="仅规则"
                    @change="onSmartClassifyToggle"
                  />
                  <span v-if="!hasDeepseekApiKey" class="toolbar-hint">请先在设置中配置 API Key</span>
                </div>
                <el-alert
                  v-if="dedupCount > 0"
                  type="success"
                  :closable="false"
                  size="small"
                  style="margin-left: 10px; flex: 1"
                >
                  已自动去重 {{ dedupCount }} 条重复支出记录，保留信息更完整的一条
                </el-alert>
              </div>
              <el-tabs v-model="resultTab" class="result-tabs">
                <el-tab-pane name="expenses">
                  <template #label>
                    支出
                    <el-badge v-if="duplicateExpenseCount > 0" :value="duplicateExpenseCount" type="danger" />
                  </template>
                  <el-table
                    :data="transformedData.expenses"
                    border
                    stripe
                    max-height="1000"
                    :row-class-name="duplicateRowClass"
                  >
                    <el-table-column prop="日期" label="日期" width="150" />
                    <el-table-column label="一级分类" width="140">
                      <template #default="{ row }">
                        <el-select
                          v-model="row.一级分类"
                          size="small"
                          filterable
                          @change="onExpenseCategory1Change(row)"
                        >
                          <el-option
                            v-for="c1 in expenseCategory1Options"
                            :key="c1"
                            :label="c1"
                            :value="c1"
                          />
                        </el-select>
                      </template>
                    </el-table-column>
                    <el-table-column label="二级分类" width="150">
                      <template #default="{ row }">
                        <el-select v-model="row.二级分类" size="small" filterable>
                          <el-option
                            v-for="c2 in expenseCategory2Options(row.一级分类)"
                            :key="c2"
                            :label="c2"
                            :value="c2"
                          />
                        </el-select>
                      </template>
                    </el-table-column>
                    <el-table-column prop="商家" label="商家" />
                    <el-table-column prop="金额" label="金额" width="100" />
                    <el-table-column label="状态" width="100">
                      <template #default="{ row }">
                        <el-tag v-if="row._isDuplicate" type="danger" size="small">重复</el-tag>
                        <el-tag v-else-if="row._aiClassified" type="warning" size="small">AI</el-tag>
                      </template>
                    </el-table-column>
                    <el-table-column prop="备注" label="备注" width="200" />
                    <el-table-column label="操作" width="80" fixed="right">
                      <template #default="{ $index }">
                        <el-button type="text" size="small" @click="deleteRecord('expenses', $index)">删除</el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                </el-tab-pane>
                <el-tab-pane label="收入" name="incomes">
                  <el-table
                    :data="transformedData.incomes"
                    border
                    stripe
                    max-height="1000"
                  >
                    <el-table-column prop="日期" label="日期" width="150" />
                    <el-table-column label="一级分类" width="140">
                      <template #default="{ row }">
                        <el-select
                          v-model="row.一级分类"
                          size="small"
                          filterable
                          @change="onIncomeCategory1Change(row)"
                        >
                          <el-option
                            v-for="c1 in incomeCategory1Options"
                            :key="c1"
                            :label="c1"
                            :value="c1"
                          />
                        </el-select>
                      </template>
                    </el-table-column>
                    <el-table-column label="二级分类" width="150">
                      <template #default="{ row }">
                        <el-select v-model="row.二级分类" size="small" filterable>
                          <el-option
                            v-for="c2 in incomeCategory2Options(row.一级分类)"
                            :key="c2"
                            :label="c2"
                            :value="c2"
                          />
                        </el-select>
                      </template>
                    </el-table-column>
                    <el-table-column prop="商家" label="商家" />
                    <el-table-column prop="金额" label="金额" width="100" />
                    <el-table-column prop="备注" label="备注" width="200" />
                    <el-table-column label="操作" width="80" fixed="right">
                      <template #default="{ $index }">
                        <el-button type="text" size="small" @click="deleteRecord('incomes', $index)">删除</el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                </el-tab-pane>
                <el-tab-pane label="转账" name="transfers">
                  <el-table
                    :data="transformedData.transfers"
                    border
                    stripe
                    max-height="1000"
                  >
                    <el-table-column prop="日期" label="日期" width="150" />
                    <el-table-column prop="商家" label="商家" />
                    <el-table-column prop="金额" label="金额" width="100" />
                    <el-table-column prop="备注" label="备注" width="200" />
                    <el-table-column label="操作" width="80" fixed="right">
                      <template #default="{ $index }">
                        <el-button type="text" size="small" @click="deleteRecord('transfers', $index)">删除</el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                </el-tab-pane>
              </el-tabs>
            </el-tab-pane>
          </el-tabs>
        </div>

        <div v-show="currentStep === 0" class="action-section">
          <el-button 
            type="primary" 
            size="large" 
            :disabled="!canTransform"
            @click="currentStep = 1"
          >
            下一步
            <el-icon><arrow-right /></el-icon>
          </el-button>
        </div>

        <div v-show="currentStep === 1" class="action-section">
          <el-button 
            size="large" 
            @click="currentStep = 0"
          >
            <el-icon><arrow-left /></el-icon>
            上一步
          </el-button>
          <el-button 
            type="primary" 
            size="large" 
            :disabled="!canTransform"
            @click="handleTransform"
          >
            <el-icon><arrow-right /></el-icon>
            开始转换
          </el-button>
          <el-button 
            type="success" 
            size="large" 
            :disabled="!hasTransformedData"
            @click="handleExport"
          >
            <el-icon><download /></el-icon>
            导出Excel
          </el-button>
        </div>
      </div>
    </el-card>

    <input 
      ref="fileInput" 
      type="file" 
      accept=".pdf,.xlsx,.xls,.csv" 
      multiple 
      style="display: none" 
      @change="onFilesSelected"
    />

    <el-dialog v-model="settingsVisible" title="设置" width="480px">
      <el-form label-width="110px">
        <el-form-item label="DeepSeek Key">
          <el-input
            v-model="deepseekApiKey"
            type="password"
            show-password
            placeholder="sk-..."
            clearable
          />
        </el-form-item>
        <el-alert
          type="info"
          :closable="false"
          title="API Key 只保存在本机浏览器。配置后可在「转换结果」中开启智能分类。"
        />
      </el-form>
      <template #footer>
        <el-button @click="settingsVisible = false">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox, ElLoading } from 'element-plus'
import * as XLSX from 'xlsx'
import { Check, Upload, Delete, Document, Close, FolderOpened, Refresh, ArrowRight, ArrowLeft, Download, Setting } from '@element-plus/icons-vue'

import { parseWechatBill } from './lib/wechat-bill-parser.js'
import { parseJdCsv } from './lib/jd-csv-parser.js'
import { parseCmbStatement } from './lib/pdf-parser.js'
import { transform } from './lib/transform.js'
import { buildWorkbook, downloadWorkbook } from './lib/excel-writer.js'
import { CATEGORY_MAP, INCOME_CATEGORY_MAP } from './lib/categories.js'
import { classifyExpensesWithAI } from './lib/ai-classify.js'
import {
  getSmartClassifyEnabled,
  setSmartClassifyEnabled,
  getDeepseekApiKey,
  setDeepseekApiKey,
  getDeepseekChatUrl
} from './lib/settings.js'

const fileInput = ref(null)
const uploadedFiles = ref([])
const templateData = ref(null)
const templatePath = ref('')
const templateFields = ref([])
const transformedData = ref({ expenses: [], incomes: [], transfers: [] })
const activeTab = ref('source')
const resultTab = ref('expenses')
const enableDedup = ref(false)
const dedupCount = ref(0)
const mergedResult = ref(null)
const currentStep = ref(0)
const settingsVisible = ref(false)
const deepseekApiKey = ref(getDeepseekApiKey())
const smartClassifyEnabled = ref(!!getDeepseekApiKey() && getSmartClassifyEnabled())

const expenseCategory1Options = Object.keys(CATEGORY_MAP)
const incomeCategory1Options = Object.keys(INCOME_CATEGORY_MAP)

const expenseCategory2Options = (c1) => CATEGORY_MAP[c1] || []
const incomeCategory2Options = (c1) => INCOME_CATEGORY_MAP[c1] || []

const hasDeepseekApiKey = computed(() => !!(deepseekApiKey.value || getDeepseekApiKey()).trim())

const onExpenseCategory1Change = (row) => {
  const options = expenseCategory2Options(row.一级分类)
  if (!options.includes(row.二级分类)) {
    row.二级分类 = options[0] || ''
  }
  row._aiClassified = false
  row._fromDefaultCategory = false
}

const onIncomeCategory1Change = (row) => {
  const options = incomeCategory2Options(row.一级分类)
  if (!options.includes(row.二级分类)) {
    row.二级分类 = options[0] || ''
  }
}

const onSmartClassifyToggle = (on) => {
  if (on && !hasDeepseekApiKey.value) {
    smartClassifyEnabled.value = false
    ElMessage.warning('请先在设置中配置 DeepSeek API Key')
    return
  }
  setSmartClassifyEnabled(on)
}

const saveSettings = () => {
  setDeepseekApiKey(deepseekApiKey.value)
  deepseekApiKey.value = getDeepseekApiKey()
  if (!deepseekApiKey.value) {
    smartClassifyEnabled.value = false
    setSmartClassifyEnabled(false)
  }
  settingsVisible.value = false
  ElMessage.success('设置已保存')
}

const totalTransactionCount = computed(() => {
  return uploadedFiles.value.reduce((sum, item) => {
    return sum + (item.transactionCount || 0)
  }, 0)
})

const allTransactions = computed(() => {
  const transactions = []
  uploadedFiles.value.forEach(file => {
    if (file.transactions) {
      file.transactions.forEach(t => {
        transactions.push({
          ...t,
          sourceFile: file.name
        })
      })
    }
  })
  transactions.sort((a, b) => {
    return a.transDate.localeCompare(b.transDate)
  })
  return transactions
})

const canTransform = computed(() => {
  return uploadedFiles.value.length > 0 && 
         templateData.value && 
         totalTransactionCount.value > 0 &&
         uploadedFiles.value.every(f => f.status !== 'loading')
})

const hasTransformedData = computed(() => {
  return transformedData.value.expenses.length > 0 || 
         transformedData.value.incomes.length > 0 || 
         transformedData.value.transfers.length > 0
})

const duplicateExpenseCount = computed(() => {
  return transformedData.value.expenses.filter(e => e._isDuplicate).length
})

const hasDuplicates = computed(() => {
  if (enableDedup.value) return dedupCount.value > 0
  return duplicateExpenseCount.value > 0
})

const duplicateRowClass = ({ row }) => {
  return row._isDuplicate ? 'duplicate-row' : ''
}

const getFileType = (filename) => {
  const ext = filename.split('.').pop().toLowerCase()
  return ext
}

const getFileTypeTag = (filename) => {
  const ext = getFileType(filename)
  if (ext === 'pdf') return 'danger'
  if (ext === 'csv') return 'warning'
  return 'success'
}

const getFileIcon = (type) => {
  if (type === 'pdf') return Document
  if (type === 'csv') return FolderOpened
  return FolderOpened
}

const getSectionLabel = (section) => {
  const map = { expense: '支出', refund: '收入', repayment: '转账' }
  return map[section] || section
}

const getSectionTag = (section) => {
  const map = { expense: 'danger', refund: 'success', repayment: 'info' }
  return map[section] || 'warning'
}

const handleUpload = () => {
  fileInput.value.click()
}

const onFilesSelected = async (event) => {
  const files = Array.from(event.target.files)
  if (files.length === 0) return

  for (const file of files) {
    const existingIndex = uploadedFiles.value.findIndex(f => f.name === file.name)
    if (existingIndex !== -1) {
      ElMessage.warning(`文件 "${file.name}" 已存在，将跳过`)
      continue
    }

    const fileType = getFileType(file.name)
    const fileId = Date.now() + Math.random()
    const fileItem = {
      id: fileId,
      name: file.name,
      type: fileType,
      bankName: '',
      status: 'loading',
      transactionCount: 0,
      transactions: []
    }
    uploadedFiles.value.push(fileItem)

    try {
      let result = null
      if (fileType === 'xlsx' || fileType === 'xls') {
        result = await parseExcelFile(file)
      } else if (fileType === 'csv') {
        result = await parseCsvFile(file)
      } else if (fileType === 'pdf') {
        result = await parsePdfFile(file)
      }

      const idx = uploadedFiles.value.findIndex(f => f.id === fileId)
      if (idx === -1) continue

      const updatedItem = { ...uploadedFiles.value[idx] }
      if (result && result.transactions) {
        updatedItem.bankName = result.bankName || '未知'
        updatedItem.transactionCount = result.transactions.length
        updatedItem.transactions = result.transactions
        updatedItem.status = 'success'
        uploadedFiles.value.splice(idx, 1, updatedItem)
        ElMessage.success(`文件 "${file.name}" 解析成功，共 ${result.transactions.length} 笔交易`)
      } else {
        updatedItem.status = 'success'
        uploadedFiles.value.splice(idx, 1, updatedItem)
      }
    } catch (error) {
      const idx = uploadedFiles.value.findIndex(f => f.id === fileId)
      if (idx !== -1) {
        const updatedItem = { ...uploadedFiles.value[idx] }
        updatedItem.status = 'error'
        uploadedFiles.value.splice(idx, 1, updatedItem)
      }
      ElMessage.error(`文件 "${file.name}" 解析失败: ${error.message}`)
    }
  }

  event.target.value = ''
}

const removeFile = (index) => {
  const file = uploadedFiles.value[index]
  uploadedFiles.value.splice(index, 1)
  ElMessage.info(`已移除文件 "${file.name}"`)
}

const clearAllFiles = () => {
  uploadedFiles.value = []
  transformedData.value = { expenses: [], incomes: [], transfers: [] }
  ElMessage.info('已清空所有文件')
}

const parseExcelFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result
        
        if (file.name.includes('微信')) {
          resolve(await parseWechatBill(arrayBuffer))
        } else {
          ElMessage.warning(`文件 "${file.name}" 不是微信账单格式`)
          resolve({ transactions: [], bankName: '未知' })
        }
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}

const parseCsvFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result
        
        if (file.name.includes('京东')) {
          resolve(await parseJdCsv(arrayBuffer))
        } else {
          ElMessage.warning(`文件 "${file.name}" 不是京东账单格式`)
          resolve({ transactions: [], bankName: '未知' })
        }
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}

const parsePdfFile = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target.result
        resolve(await parseCmbStatement(arrayBuffer))
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = () => reject(new Error('读取文件失败'))
    reader.readAsArrayBuffer(file)
  })
}

const loadTemplate = async () => {
  try {
    const templatePath = `${import.meta.env.BASE_URL}template.xls`.replace(/\/+/g, '/')
    const response = await fetch(templatePath)
    if (!response.ok) {
      throw new Error(`Failed to fetch template: ${response.status} ${response.statusText}`)
    }
    const blob = await response.blob()
    const arrayBuffer = await blob.arrayBuffer()
    const data = new Uint8Array(arrayBuffer)
    const workbook = XLSX.read(data, { type: 'array' })
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
    const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
    
    templateData.value = jsonData
    templateFields.value = jsonData[0] || []
    
    ElMessage.success('模板加载成功')
  } catch (error) {
    ElMessage.error('模板加载失败: ' + error.message)
  }
}

const handleTransform = async () => {
  if (totalTransactionCount.value === 0) {
    ElMessage.warning('没有可转换的交易数据')
    return
  }

  const mergedTransactions = []
  uploadedFiles.value.forEach(file => {
    if (file.transactions) {
      mergedTransactions.push(...file.transactions.map(t => ({
        ...t,
        source: file.bankName,
        sourceFile: file.name
      })))
    }
  })

  mergedResult.value = {
    billYear: new Date().getFullYear(),
    billMonth: new Date().getMonth() + 1,
    bankName: '合并账单',
    transactions: mergedTransactions
  }

  applyTransform()

  const enabled = smartClassifyEnabled.value && hasDeepseekApiKey.value
  if (enabled) {
    await applySmartClassify(getDeepseekApiKey())
  } else if (smartClassifyEnabled.value && !hasDeepseekApiKey.value) {
    ElMessage.warning('已开启智能分类，请先在设置中配置 DeepSeek API Key')
  }

  ElMessage.success(`转换完成，共 ${mergedTransactions.length} 笔交易`)
  activeTab.value = 'result'
}

const applyTransform = () => {
  const result = transform(mergedResult.value, { enableDedup: enableDedup.value })
  transformedData.value = {
    expenses: result.expenses,
    incomes: result.incomes,
    transfers: result.transfers
  }
  dedupCount.value = result.dedupCount || 0
}

const applySmartClassify = async (apiKey) => {
  const expenses = transformedData.value.expenses
  const candidates = []
  expenses.forEach((row, index) => {
    if (row._fromDefaultCategory) {
      candidates.push({
        id: String(index),
        desc: row.备注 || row.商家 || ''
      })
    }
  })

  if (!candidates.length) return

  const loading = ElLoading.service({
    lock: true,
    text: `智能分类中… 0/${Math.ceil(candidates.length / 40)}`,
    background: 'rgba(0, 0, 0, 0.35)'
  })

  try {
    const results = await classifyExpensesWithAI(candidates, {
      apiKey,
      chatUrl: getDeepseekChatUrl(),
      onProgress: (done, total) => {
        loading.setText(`智能分类中… ${done}/${total}`)
      }
    })

    let applied = 0
    for (const item of results) {
      const idx = Number(item.id)
      if (!Number.isInteger(idx) || !expenses[idx]) continue
      expenses[idx].一级分类 = item.c1
      expenses[idx].二级分类 = item.c2
      expenses[idx]._aiClassified = true
      applied += 1
    }

    if (applied > 0) {
      ElMessage.success(`智能分类完成，更新 ${applied} 笔`)
    } else {
      ElMessage.info('智能分类未更新任何记录')
    }
  } catch (error) {
    ElMessage.error('智能分类失败: ' + (error.message || String(error)))
  } finally {
    loading.close()
  }
}

const handleDedupChange = (val) => {
  if (!mergedResult.value) return
  applyTransform()
  if (val && dedupCount.value > 0) {
    ElMessage.success(`已去重 ${dedupCount.value} 条重复记录`)
  }
}

const deleteRecord = async (type, index) => {
  try {
    await ElMessageBox.confirm(
      '确定要删除这条记录吗？删除后将无法恢复。',
      '确认删除',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    transformedData.value[type].splice(index, 1)
    ElMessage.success('记录已删除')
  } catch {
    ElMessage.info('已取消删除')
  }
}

const handleExport = async () => {
  if (!hasTransformedData.value) {
    ElMessage.warning('没有可导出的数据')
    return
  }

  const transferCount = transformedData.value.transfers.length
  const expenseCount = transformedData.value.expenses.length
  const incomeCount = transformedData.value.incomes.length

  try {
    const workbook = await buildWorkbook(transformedData.value)
    const filename = `合并账单_${new Date().toISOString().slice(0, 10)}.xlsx`
    await downloadWorkbook(workbook, filename)
    
    let msg = `导出成功：支出 ${expenseCount} 笔，收入 ${incomeCount} 笔`
    if (transferCount > 0) {
      msg += `（转账 ${transferCount} 笔已忽略）`
    }
    ElMessage.success(msg)
  } catch (error) {
    ElMessage.error('导出失败: ' + error.message)
  }
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

.card-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 4px 0;
}

.header-title {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-title .title {
  font-size: 26px;
  font-weight: 700;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.settings-btn {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
}

.step-nav {
  display: flex;
  align-items: center;
  gap: 12px;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.step-item:hover .step-circle {
  transform: scale(1.1);
}

.step-circle {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: #e4e7ed;
  color: #909399;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  font-weight: 600;
  transition: all 0.3s ease;
}

.step-item.active .step-circle {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.step-item.done .step-circle {
  background: #67c23a;
  color: #fff;
}

.step-label {
  font-size: 13px;
  color: #909399;
  white-space: nowrap;
  transition: color 0.3s ease;
}

.step-item.active .step-label {
  color: #667eea;
  font-weight: 500;
}

.step-item.done .step-label {
  color: #67c23a;
}

.step-line {
  width: 80px;
  height: 2px;
  background: #e4e7ed;
  border-radius: 1px;
  margin-bottom: 22px;
  transition: background 0.3s ease;
}

.step-line.active {
  background: linear-gradient(90deg, #67c23a, #667eea);
}

.upload-section {
  margin-bottom: 20px;
}

.upload-section :deep(.el-row) {
  display: flex;
}

.upload-section :deep(.el-col) {
  display: flex;
}

.upload-section :deep(.source-card),
.upload-section :deep(.template-card) {
  flex: 1;
}

.sub-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
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

.supported-formats {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 5px;
}

.file-list {
  max-height: 300px;
  overflow-y: auto;
}

.file-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background: #f5f7fa;
  border-radius: 4px;
  margin-bottom: 8px;
}

.file-item .file-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  flex-wrap: wrap;
}

.file-summary {
  padding: 10px 0;
  text-align: center;
  border-top: 1px solid #ebeef5;
  margin-top: 10px;
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

.result-tabs {
  margin-top: 10px;
}

.action-section {
  margin-top: 20px;
  text-align: center;
  display: flex;
  gap: 20px;
  justify-content: center;
}

:deep(.duplicate-row) {
  background-color: #fef0f0 !important;
}

.result-toolbar {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
}

.toolbar-switches {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
}

.toolbar-hint {
  font-size: 12px;
  color: #909399;
}
</style>
