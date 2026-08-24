<template>
  <a-modal v-model:visible="visible" title="转派审核任务" :ok-loading="loading" :mask-closable="false" @before-ok="submit">
    <a-form ref="formRef" :model="form" layout="vertical">
      <a-form-item label="目标用户 ID" field="targetUserId" :rules="[{ required: true, message: '请输入目标审核用户 ID' }]">
        <a-input v-model="form.targetUserId" placeholder="仅可转派给同租户、同商户范围内的启用审核员" />
      </a-form-item>
      <a-form-item label="转派原因" field="reason" :rules="[{ required: true, message: '请输入转派原因' }]">
        <a-textarea v-model="form.reason" :max-length="2000" show-word-limit :auto-size="{ minRows: 3, maxRows: 6 }" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { type FormInstance, Message } from '@arco-design/web-vue'
import type { WorkflowTaskDetail } from '@/apis/merchant/workflow'
import { transferWorkflowTask } from '@/apis/merchant/workflow'

const emit = defineEmits<{ success: [] }>()
const visible = ref(false)
const loading = ref(false)
const detail = ref<WorkflowTaskDetail>()
const formRef = ref<FormInstance>()
const form = reactive({ targetUserId: '', reason: '' })

function onOpen(value: WorkflowTaskDetail) {
  detail.value = value
  form.targetUserId = ''
  form.reason = ''
  visible.value = true
}

async function submit() {
  const errors = await formRef.value?.validate()
  if (errors || !detail.value) return false
  loading.value = true
  try {
    await transferWorkflowTask(detail.value.task.taskId, form.targetUserId.trim(), detail.value.business.businessVersion, form.reason.trim())
    Message.success('任务已转派')
    emit('success')
    return true
  } finally {
    loading.value = false
  }
}

defineExpose({ onOpen })
</script>
