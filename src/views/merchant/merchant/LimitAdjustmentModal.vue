<template>
  <a-modal
    v-model:visible="visible"
    title="申请调整月度入账限额"
    :width="720"
    :ok-loading="submitting"
    :mask-closable="false"
    ok-text="确认提交"
    @before-ok="submit"
  >
    <a-alert type="warning" class="mb-4">
      人工审批不会直接改变有效限额；仅在渠道确认成功后，新限额才会生效。
    </a-alert>
    <a-form ref="formRef" :model="form" layout="vertical">
      <a-grid :cols="2" :col-gap="16" :row-gap="4">
        <a-grid-item :span="2">
          <a-descriptions v-if="merchant" :column="2" bordered size="small">
            <a-descriptions-item label="商户">{{ merchant.shortName }}（{{ merchant.merchantNo }}）</a-descriptions-item>
            <a-descriptions-item label="状态">{{ merchant.status }}</a-descriptions-item>
          </a-descriptions>
        </a-grid-item>
        <a-grid-item>
          <a-form-item field="channelCode" label="渠道" :rules="[{ required: true, message: '请选择渠道' }]">
            <a-select v-model="form.channelCode" placeholder="请选择已成功入网渠道" @change="clearPreview">
              <a-option v-for="channel in eligibleChannels" :key="channel.channelCode" :value="channel.channelCode">
                {{ channel.channelCode }}
              </a-option>
            </a-select>
          </a-form-item>
        </a-grid-item>
        <a-grid-item>
          <a-form-item field="platformCode" label="入账平台" :rules="[{ required: true, message: '请输入入账平台' }]">
            <a-input v-model="form.platformCode" :max-length="64" placeholder="例如 INBOUND" @input="clearPreview" />
          </a-form-item>
        </a-grid-item>
        <a-grid-item>
          <a-form-item field="currency" label="币种" :rules="[{ required: true, message: '请选择币种' }]">
            <a-select v-model="form.currency" @change="clearPreview">
              <a-option value="CNY">CNY</a-option>
            </a-select>
          </a-form-item>
        </a-grid-item>
        <a-grid-item>
          <a-form-item
            field="requestedLimit"
            label="申请限额"
            :rules="[{ required: true, message: '请输入申请限额' }, { type: 'number', min: 0.01, message: '申请限额必须大于 0' }]"
          >
            <a-input-number
              v-model="form.requestedLimit"
              :precision="2"
              :min="0.01"
              :hide-button="false"
              placeholder="请输入金额"
              style="width: 100%"
              @change="clearPreview"
            />
          </a-form-item>
        </a-grid-item>
        <a-grid-item :span="2">
          <a-space>
            <a-button type="outline" :loading="previewing" @click="loadPreview">校验并预览</a-button>
            <a-typography-text type="secondary">预览失效后必须重新校验，客户端不能控制最终归一化金额。</a-typography-text>
          </a-space>
        </a-grid-item>
        <a-grid-item v-if="preview" :span="2">
          <a-card title="确认预览" :bordered="true" class="preview-card">
            <a-descriptions :column="3" bordered size="small">
              <a-descriptions-item label="输入金额">{{ amount(preview.enteredLimit) }}</a-descriptions-item>
              <a-descriptions-item label="归一化金额">
                <strong>{{ amount(preview.normalizedLimit) }}</strong>
                <a-tag v-if="preview.changed" color="orange" class="ml-2">已向上取整</a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="规则版本">{{ preview.policyVersion }}</a-descriptions-item>
              <a-descriptions-item label="最小值">{{ amount(preview.minimumLimit) }}</a-descriptions-item>
              <a-descriptions-item label="最大值">{{ amount(preview.maximumLimit) }}</a-descriptions-item>
              <a-descriptions-item label="取整单位">{{ amount(preview.roundingUnit) }}</a-descriptions-item>
            </a-descriptions>
          </a-card>
        </a-grid-item>
        <a-grid-item :span="2">
          <a-form-item field="reason" label="申请原因" :rules="[{ required: true, message: '请输入申请原因' }]">
            <a-textarea
              v-model="form.reason"
              :max-length="1000"
              show-word-limit
              :auto-size="{ minRows: 3, maxRows: 6 }"
              placeholder="请说明业务增长或限额调整原因；不要填写完整敏感信息"
            />
          </a-form-item>
        </a-grid-item>
      </a-grid>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import { type FormInstance, Message } from '@arco-design/web-vue'
import type { LimitAdjustmentPreview } from '@/apis/merchant/limit'
import { createLimitAdjustment, previewLimitAdjustment } from '@/apis/merchant/limit'
import type { MerchantResp } from '@/apis/merchant/merchant'

const emit = defineEmits<{ success: [] }>()
const visible = ref(false)
const previewing = ref(false)
const submitting = ref(false)
const merchant = ref<MerchantResp>()
const preview = ref<LimitAdjustmentPreview>()
const formRef = ref<FormInstance>()
const form = reactive({
  channelCode: '',
  platformCode: 'INBOUND',
  currency: 'CNY',
  requestedLimit: undefined as number | undefined,
  reason: '',
})

const eligibleChannels = computed(() => merchant.value?.channels.filter((item) => item.channelFinalStatus === 'SUCCEEDED') || [])
const amount = (value?: number) => value == null ? '-' : `${Number(value).toFixed(2)} ${form.currency}`

function onOpen(record: MerchantResp) {
  merchant.value = record
  form.channelCode = eligibleChannels.value.length === 1 ? eligibleChannels.value[0].channelCode : ''
  form.platformCode = 'INBOUND'
  form.currency = 'CNY'
  form.requestedLimit = undefined
  form.reason = ''
  preview.value = undefined
  formRef.value?.clearValidate()
  visible.value = true
}

function clearPreview() {
  preview.value = undefined
}

async function loadPreview() {
  const errors = await formRef.value?.validateField(['channelCode', 'platformCode', 'currency', 'requestedLimit'])
  if (errors || !merchant.value || !form.requestedLimit) return
  previewing.value = true
  try {
    const res = await previewLimitAdjustment(merchant.value.id, {
      channelCode: form.channelCode,
      platformCode: form.platformCode.trim().toUpperCase(),
      currency: form.currency,
      requestedLimit: form.requestedLimit,
    })
    preview.value = res.data
  } finally {
    previewing.value = false
  }
}

async function submit() {
  const errors = await formRef.value?.validate()
  if (errors || !merchant.value) return false
  if (!preview.value || preview.value.enteredLimit !== form.requestedLimit) {
    Message.warning('请先重新校验并确认归一化预览')
    return false
  }
  submitting.value = true
  try {
    const result = await createLimitAdjustment(merchant.value.id, {
      channelCode: preview.value.channelCode,
      platformCode: preview.value.platformCode,
      currency: preview.value.currency,
      requestedLimit: preview.value.enteredLimit,
      confirmedNormalizedLimit: preview.value.normalizedLimit,
      confirmedPolicyVersion: preview.value.policyVersion,
      reason: form.reason.trim(),
    })
    Message.success(result.data.created ? '限额调整申请已提交' : '已有处理中申请，已返回原申请')
    emit('success')
    return true
  } finally {
    submitting.value = false
  }
}

defineExpose({ onOpen })
</script>

<style scoped>
.mb-4 { margin-bottom: 16px; }
.ml-2 { margin-left: 8px; }
.preview-card { width: 100%; }
</style>
