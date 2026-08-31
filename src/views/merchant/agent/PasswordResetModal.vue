<template>
  <a-modal
    v-model:visible="visible"
    title="重置代理商密码"
    :mask-closable="false"
    :esc-to-close="false"
    :width="width >= 500 ? 500 : '100%'"
    @before-ok="save"
    @close="reset"
  >
    <a-alert v-if="errorMessage" type="error" closable class="mb-3" @close="errorMessage = ''">
      {{ errorMessage }}
    </a-alert>
    <a-alert type="warning" class="mb-3">重置后将撤销会话，并要求用户首次登录立即修改密码。</a-alert>
    <a-form ref="formRef" :model="form" :rules="rules" auto-label-width>
      <a-form-item field="temporaryPassword" label="临时密码">
        <a-input-password v-model="form.temporaryPassword" autocomplete="new-password" />
      </a-form-item>
      <a-form-item field="confirmPassword" label="确认密码">
        <a-input-password v-model="form.confirmPassword" autocomplete="new-password" />
      </a-form-item>
      <a-form-item field="reason" label="重置原因">
        <a-textarea v-model="form.reason" :max-length="255" show-word-limit />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import type { FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import { getErrorMessage } from './utils'
import type { AgentResp } from '@/apis/merchant/agent'
import { resetAgentPassword } from '@/apis/merchant/agent'
import { encryptByRsa } from '@/utils/encrypt'

const emit = defineEmits<{ (e: 'save-success'): void }>()
const { width } = useWindowSize()
const visible = ref(false)
const agent = ref<AgentResp>()
const formRef = ref<FormInstance>()
const errorMessage = ref('')
const form = reactive({ temporaryPassword: '', confirmPassword: '', reason: '' })
const rules: FormInstance['rules'] = {
  temporaryPassword: [{ required: true, message: '请输入临时密码' }],
  confirmPassword: [
    { required: true, message: '请再次输入临时密码' },
    { validator: (value, callback) => callback(value === form.temporaryPassword ? undefined : '两次密码不一致') },
  ],
  reason: [{ required: true, message: '请输入重置原因' }],
}

const reset = () => {
  formRef.value?.resetFields()
  Object.assign(form, { temporaryPassword: '', confirmPassword: '', reason: '' })
  errorMessage.value = ''
}

const save = async () => {
  try {
    errorMessage.value = ''
    const invalid = await formRef.value?.validate()
    if (invalid || !agent.value) return false
    await resetAgentPassword(agent.value.id, {
      temporaryPassword: encryptByRsa(form.temporaryPassword) || '',
      confirmPassword: encryptByRsa(form.confirmPassword) || '',
      reason: form.reason.trim(),
    })
    Message.success('密码已重置')
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
  visible.value = true
}

defineExpose({ onOpen })
</script>

<style scoped>
.mb-3 { margin-bottom: 12px; }
</style>
