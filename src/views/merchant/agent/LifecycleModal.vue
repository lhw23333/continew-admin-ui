<template>
  <a-modal
    v-model:visible="visible"
    :title="targetStatus === 'DISABLED' ? '停用代理商' : '启用代理商'"
    :mask-closable="false"
    :esc-to-close="false"
    :width="width >= 500 ? 500 : '100%'"
    :ok-button-props="targetStatus === 'DISABLED' ? { status: 'danger' } : undefined"
    @before-ok="save"
    @close="reset"
  >
    <a-alert v-if="errorMessage" type="error" closable class="mb-3" @close="errorMessage = ''">
      {{ errorMessage }}
    </a-alert>
    <a-alert :type="targetStatus === 'DISABLED' ? 'warning' : 'info'" class="mb-3">
      {{ targetStatus === 'DISABLED' ? '停用后将立即撤销该代理商账号的现有会话。' : '启用后允许该代理商账号重新登录。' }}
    </a-alert>
    <a-form ref="formRef" :model="form" :rules="rules" auto-label-width>
      <a-form-item label="代理商"><a-input :model-value="agent?.name" disabled /></a-form-item>
      <a-form-item field="reason" label="变更原因">
        <a-textarea v-model="form.reason" :max-length="255" show-word-limit placeholder="请输入变更原因" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import type { FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import { getErrorMessage } from './utils'
import type { AgentResp, AgentStatus } from '@/apis/merchant/agent'
import { changeAgentLifecycle } from '@/apis/merchant/agent'

const emit = defineEmits<{ (e: 'save-success'): void }>()
const { width } = useWindowSize()
const visible = ref(false)
const agent = ref<AgentResp>()
const targetStatus = ref<AgentStatus>('DISABLED')
const formRef = ref<FormInstance>()
const form = reactive({ reason: '' })
const errorMessage = ref('')
const rules: FormInstance['rules'] = { reason: [{ required: true, message: '请输入变更原因' }] }

const reset = () => {
  formRef.value?.resetFields()
  form.reason = ''
  errorMessage.value = ''
}

const save = async () => {
  try {
    errorMessage.value = ''
    const invalid = await formRef.value?.validate()
    if (invalid || !agent.value) return false
    await changeAgentLifecycle(agent.value.id, {
      status: targetStatus.value,
      reason: form.reason.trim(),
      expectedVersion: agent.value.rowVersion,
    })
    Message.success(targetStatus.value === 'DISABLED' ? '已停用' : '已启用')
    emit('save-success')
    return true
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
    return false
  }
}

const onOpen = (record: AgentResp) => {
  reset()
  agent.value = record
  targetStatus.value = record.status === 'ENABLED' ? 'DISABLED' : 'ENABLED'
  visible.value = true
}

defineExpose({ onOpen })
</script>

<style scoped>
.mb-3 { margin-bottom: 12px; }
</style>
