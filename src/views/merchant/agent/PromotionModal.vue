<template>
  <a-modal
    v-model:visible="visible"
    title="推广码管理"
    :mask-closable="false"
    :esc-to-close="false"
    :width="width >= 500 ? 500 : '100%'"
    :footer="false"
    @close="reset"
  >
    <a-alert v-if="errorMessage" type="error" closable class="mb-3" @close="errorMessage = ''">
      {{ errorMessage }}
    </a-alert>
    <a-descriptions :column="1" bordered>
      <a-descriptions-item label="代理商">{{ agent?.name }}</a-descriptions-item>
      <a-descriptions-item label="推广码">
        <a-typography-text v-if="promotionCode" copyable>{{ promotionCode }}</a-typography-text>
        <span v-else>未签发</span>
      </a-descriptions-item>
      <a-descriptions-item label="状态">
        <a-tag :color="status === 'ACTIVE' ? 'green' : 'red'">
          {{ status === 'ACTIVE' ? '启用' : '禁用' }}
        </a-tag>
      </a-descriptions-item>
    </a-descriptions>
    <a-space class="actions">
      <a-button v-if="!promotionCode" type="primary" :loading="loading" @click="issue">签发推广码</a-button>
      <a-button
        v-else
        :status="status === 'ACTIVE' ? 'danger' : 'normal'"
        :type="status === 'DISABLED' ? 'primary' : 'secondary'"
        :loading="loading"
        @click="toggleStatus"
      >
        {{ status === 'ACTIVE' ? '停用推广码' : '启用推广码' }}
      </a-button>
      <a-button @click="visible = false">关闭</a-button>
    </a-space>
  </a-modal>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import { getErrorMessage } from './utils'
import type { AgentResp, PromotionCodeStatus } from '@/apis/merchant/agent'
import { changeAgentPromotionCodeStatus, issueAgentPromotionCode } from '@/apis/merchant/agent'

const emit = defineEmits<{ (e: 'save-success'): void }>()
const { width } = useWindowSize()
const visible = ref(false)
const agent = ref<AgentResp>()
const promotionCode = ref('')
const status = ref<PromotionCodeStatus>('DISABLED')
const rowVersion = ref(0)
const loading = ref(false)
const errorMessage = ref('')

const reset = () => {
  errorMessage.value = ''
  loading.value = false
}

const applyResult = (data: { promotionCode: string, status: PromotionCodeStatus, rowVersion: number }) => {
  promotionCode.value = data.promotionCode
  status.value = data.status
  rowVersion.value = data.rowVersion
}

const issue = async () => {
  if (!agent.value) return
  try {
    loading.value = true
    errorMessage.value = ''
    const { data } = await issueAgentPromotionCode(agent.value.id, rowVersion.value)
    applyResult(data)
    Message.success('推广码已签发')
    emit('save-success')
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const toggleStatus = async () => {
  if (!agent.value) return
  try {
    loading.value = true
    errorMessage.value = ''
    const nextStatus: PromotionCodeStatus = status.value === 'ACTIVE' ? 'DISABLED' : 'ACTIVE'
    const { data } = await changeAgentPromotionCodeStatus(agent.value.id, nextStatus, rowVersion.value)
    applyResult(data)
    Message.success(nextStatus === 'ACTIVE' ? '推广码已启用' : '推广码已停用')
    emit('save-success')
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    loading.value = false
  }
}

const onOpen = (record: AgentResp) => {
  reset()
  agent.value = record
  promotionCode.value = record.promotionCode || ''
  status.value = record.promotionCodeStatus
  rowVersion.value = record.rowVersion
  visible.value = true
}

defineExpose({ onOpen })
</script>

<style scoped>
.mb-3 { margin-bottom: 12px; }
.actions { margin-top: 20px; width: 100%; justify-content: flex-end; }
</style>
