<template>
  <a-modal v-model:visible="visible" title="审核限额调整" :ok-loading="loading" :mask-closable="false" @before-ok="submit">
    <a-alert type="warning" class="mb-4">
      审核通过只会进入渠道提交阶段，不会直接改变当前有效限额。
    </a-alert>
    <a-form ref="formRef" :model="form" layout="vertical">
      <a-form-item field="action" label="审核动作" :rules="[{ required: true, message: '请选择审核动作' }]">
        <a-radio-group v-model="form.action" type="button">
          <a-radio value="APPROVE">通过</a-radio>
          <a-radio value="REJECT">拒绝</a-radio>
        </a-radio-group>
      </a-form-item>
      <a-form-item
        field="opinion"
        label="审核意见"
        :rules="form.action === 'REJECT' ? [{ required: true, message: '拒绝必须填写审核意见' }] : []"
      >
        <a-textarea
          v-model="form.opinion"
          :max-length="2000"
          show-word-limit
          :auto-size="{ minRows: 3, maxRows: 6 }"
          placeholder="请勿填写完整证件号、银行卡号、手机号或永久链接"
        />
      </a-form-item>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import type { FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import type { LimitAdjustmentDetail, LimitReviewAction } from '@/apis/merchant/limit'
import { reviewLimitAdjustment } from '@/apis/merchant/limit'

const emit = defineEmits<{ success: [] }>()
const visible = ref(false)
const loading = ref(false)
const merchantId = ref('')
const detail = ref<LimitAdjustmentDetail>()
const formRef = ref<FormInstance>()
const form = reactive<{ action?: LimitReviewAction, opinion?: string }>({})

function onOpen(targetMerchantId: string, value: LimitAdjustmentDetail) {
  merchantId.value = targetMerchantId
  detail.value = value
  form.action = undefined
  form.opinion = undefined
  formRef.value?.clearValidate()
  visible.value = true
}

async function submit() {
  const errors = await formRef.value?.validate()
  const value = detail.value
  if (errors || !value?.currentTask || !value.workflowBusinessVersion || !form.action) return false
  loading.value = true
  try {
    await reviewLimitAdjustment(
      merchantId.value,
      value.request.id,
      value.currentTask.taskId,
      value.workflowBusinessVersion,
      form.action,
      form.opinion?.trim() || undefined,
    )
    Message.success('限额审核结果已提交')
    emit('success')
    return true
  } finally {
    loading.value = false
  }
}

defineExpose({ onOpen })
</script>

<style scoped>
.mb-4 { margin-bottom: 16px; }
</style>
