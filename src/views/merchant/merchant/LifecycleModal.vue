<template>
  <a-modal
    v-model:visible="visible"
    :title="targetStatus === 'DISABLED' ? '停用商户' : '启用商户'"
    :mask-closable="false"
    :esc-to-close="false"
    :width="width >= 520 ? 520 : '100%'"
    :ok-button-props="targetStatus === 'DISABLED' ? { status: 'danger' } : undefined"
    @before-ok="save"
    @close="reset"
  >
    <a-alert v-if="errorMessage" type="error" closable class="mb-3" @close="errorMessage = ''">
      {{ errorMessage }}
    </a-alert>
    <a-alert :type="targetStatus === 'DISABLED' ? 'warning' : 'info'" class="mb-3">
      {{ targetStatus === 'DISABLED'
        ? '停用后将同步停用操作员和复核员账号、立即撤销会话，并阻止新的进件、交易和结算；历史数据不会被改写。'
        : '启用后恢复商户主状态与双岗位账号登录能力，渠道历史状态保持不变。' }}
    </a-alert>
    <a-spin :loading="loading" style="width: 100%">
      <a-form ref="formRef" :model="form" :rules="rules" auto-label-width>
        <a-form-item label="商户"><a-input :model-value="detail?.shortName || merchant?.shortName" disabled /></a-form-item>
        <a-form-item label="当前状态">
          <a-tag v-if="detail" :color="merchantStatusMeta(detail.status).color">
            {{ merchantStatusMeta(detail.status).label }}
          </a-tag>
        </a-form-item>
        <a-form-item field="reason" label="变更原因">
          <a-textarea v-model="form.reason" :max-length="255" show-word-limit placeholder="请输入变更原因" />
        </a-form-item>
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import type { FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import { getErrorMessage, merchantStatusMeta } from './utils'
import type { MerchantDetail, MerchantResp, MerchantStatus } from '@/apis/merchant/merchant'
import { changeMerchantLifecycle, getMerchant } from '@/apis/merchant/merchant'

const emit = defineEmits<{ (e: 'save-success'): void }>()
const { width } = useWindowSize()
const visible = ref(false)
const loading = ref(false)
const merchant = ref<MerchantResp>()
const detail = ref<MerchantDetail>()
const targetStatus = ref<MerchantStatus>('DISABLED')
const formRef = ref<FormInstance>()
const form = reactive({ reason: '' })
const errorMessage = ref('')
const rules: FormInstance['rules'] = { reason: [{ required: true, message: '请输入变更原因' }] }

const reset = () => {
  formRef.value?.resetFields()
  form.reason = ''
  detail.value = undefined
  errorMessage.value = ''
}

const save = async () => {
  try {
    errorMessage.value = ''
    const invalid = await formRef.value?.validate()
    if (invalid || !detail.value) return false
    await changeMerchantLifecycle(detail.value.id, {
      status: targetStatus.value,
      reason: form.reason.trim(),
      expectedVersion: detail.value.rowVersion,
    })
    Message.success(targetStatus.value === 'DISABLED' ? '商户已停用' : '商户已启用')
    emit('save-success')
    return true
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
    return false
  }
}

const onOpen = async (record: MerchantResp) => {
  reset()
  merchant.value = record
  targetStatus.value = record.status === 'DISABLED' ? 'ENABLED' : record.status === 'DRAFT' ? 'ENABLED' : 'DISABLED'
  visible.value = true
  loading.value = true
  try {
    const { data } = await getMerchant(record.id)
    detail.value = data
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '商户详情加载失败')
  } finally {
    loading.value = false
  }
}

defineExpose({ onOpen })
</script>

<style scoped>
.mb-3 { margin-bottom: 12px; }
</style>
