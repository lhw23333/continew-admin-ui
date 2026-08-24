<template>
  <a-modal v-model:visible="visible" title="提交审核动作" :ok-loading="loading" :mask-closable="false" @before-ok="submit">
    <a-alert type="warning" class="mb-4">审核意见会进入不可变审计记录，请勿填写完整证件号、银行卡号、手机号或永久链接。</a-alert>
    <a-form ref="formRef" :model="form" layout="vertical">
      <a-form-item label="审核动作" field="action" :rules="[{ required: true, message: '请选择审核动作' }]">
        <a-select v-model="form.action" placeholder="请选择">
          <a-option v-for="action in actions" :key="action" :value="action">{{ reviewActionLabel(action) }}</a-option>
        </a-select>
      </a-form-item>
      <a-form-item
        label="审核意见"
        field="opinion"
        :rules="opinionRequired ? [{ required: true, message: '该动作必须填写审核意见' }] : []"
      >
        <a-textarea v-model="form.opinion" :max-length="2000" show-word-limit :auto-size="{ minRows: 3, maxRows: 6 }" />
      </a-form-item>
      <a-form-item v-if="form.action === 'REQUEST_SUPPLEMENT'" label="补件问题代码" required>
        <a-input v-model="issueCodesText" placeholder="多个代码用逗号分隔，例如 STORE_QR_MISSING" />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { type FormInstance, Message } from '@arco-design/web-vue'
import { availableReviewActions, reviewActionLabel } from './utils'
import type { ReviewAction, WorkflowTaskDetail } from '@/apis/merchant/workflow'
import { reviewWorkflowTask } from '@/apis/merchant/workflow'

const emit = defineEmits<{ success: [] }>()
const visible = ref(false)
const loading = ref(false)
const detail = ref<WorkflowTaskDetail>()
const actions = ref<ReviewAction[]>([])
const issueCodesText = ref('')
const formRef = ref<FormInstance>()
const form = reactive<{ action?: ReviewAction, opinion?: string }>({})
const opinionRequired = computed(() => ['REJECT', 'REQUEST_SUPPLEMENT'].includes(form.action || ''))

function onOpen(value: WorkflowTaskDetail) {
  detail.value = value
  actions.value = availableReviewActions(value.task)
  form.action = actions.value.length === 1 ? actions.value[0] : undefined
  form.opinion = undefined
  issueCodesText.value = ''
  visible.value = true
}

async function submit() {
  const errors = await formRef.value?.validate()
  if (errors || !detail.value || !form.action) return false
  const issueCodes = issueCodesText.value.split(/[,，\s]+/).map((item) => item.trim().toUpperCase()).filter(Boolean)
  if (form.action === 'REQUEST_SUPPLEMENT' && issueCodes.length === 0) {
    Message.warning('请至少填写一个补件问题代码')
    return false
  }
  loading.value = true
  try {
    await reviewWorkflowTask(detail.value.task.taskId, {
      businessVersion: detail.value.business.businessVersion,
      action: form.action,
      opinion: form.opinion?.trim() || undefined,
      issueCodes,
    })
    Message.success('审核动作已提交')
    emit('success')
    return true
  } finally {
    loading.value = false
  }
}

defineExpose({ onOpen })
</script>
