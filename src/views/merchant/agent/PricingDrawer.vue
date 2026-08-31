<template>
  <a-drawer v-model:visible="visible" title="代理商定价版本" :width="drawerWidth" :footer="false" unmount-on-close>
    <a-alert v-if="errorMessage" type="error" closable class="mb-3" @close="errorMessage = ''">
      {{ errorMessage }}
    </a-alert>
    <a-card title="发布新版本" :bordered="false" class="section-card">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-grid :cols="24" :col-gap="12" :row-gap="4">
          <a-grid-item :span="8"><a-form-item field="channelCode" label="渠道编码"><a-input v-model="form.channelCode" /></a-form-item></a-grid-item>
          <a-grid-item :span="8"><a-form-item field="productCode" label="产品编码"><a-input v-model="form.productCode" /></a-form-item></a-grid-item>
          <a-grid-item :span="8"><a-form-item field="currency" label="币种"><a-input v-model="form.currency" /></a-form-item></a-grid-item>
          <a-grid-item :span="8"><a-form-item field="percentageCost" label="百分比成本"><a-input-number v-model="form.percentageCost" :min="0" :max="1" :step="0.0001" /></a-form-item></a-grid-item>
          <a-grid-item :span="8"><a-form-item field="fixedFee" label="单笔固定费"><a-input-number v-model="form.fixedFee" :min="0" :max="1000000000" :step="0.01" /></a-form-item></a-grid-item>
          <a-grid-item :span="8"><a-form-item field="profitShareRatio" label="分润比例"><a-input-number v-model="form.profitShareRatio" :min="0" :max="1" :step="0.0001" /></a-form-item></a-grid-item>
          <a-grid-item :span="12"><a-form-item field="effectiveTime" label="生效时间"><a-date-picker v-model="form.effectiveTime" show-time format="YYYY-MM-DD HH:mm:ss" style="width: 100%" /></a-form-item></a-grid-item>
          <a-grid-item :span="12"><a-form-item field="expiresTime" label="失效时间"><a-date-picker v-model="form.expiresTime" show-time allow-clear format="YYYY-MM-DD HH:mm:ss" style="width: 100%" /></a-form-item></a-grid-item>
          <a-grid-item :span="24"><a-form-item field="reason" label="变更原因"><a-textarea v-model="form.reason" :max-length="255" show-word-limit /></a-form-item></a-grid-item>
        </a-grid>
        <a-space>
          <a-button type="primary" :loading="saving" @click="save">发布版本</a-button>
          <a-button @click="loadHistory">刷新历史</a-button>
        </a-space>
      </a-form>
    </a-card>
    <a-card title="版本历史" :bordered="false" class="section-card">
      <a-empty v-if="!history.length && !loading" description="填写渠道与产品后点击刷新历史" />
      <a-table v-else :data="history" :loading="loading" :pagination="false" row-key="id" :scroll="{ x: 1050 }">
        <template #columns>
          <a-table-column title="版本" data-index="versionNo" :width="80" />
          <a-table-column title="渠道/产品" :width="180">
            <template #cell="{ record }">{{ record.channelCode }} / {{ record.productCode }}</template>
          </a-table-column>
          <a-table-column title="百分比成本" :width="120"><template #cell="{ record }">{{ record.rules.percentageCost }}</template></a-table-column>
          <a-table-column title="固定费" :width="100"><template #cell="{ record }">{{ record.rules.fixedFee }}</template></a-table-column>
          <a-table-column title="分润比例" :width="100"><template #cell="{ record }">{{ record.rules.profitShareRatio }}</template></a-table-column>
          <a-table-column title="父级版本 ID" data-index="parentPricingVersionId" :width="180" />
          <a-table-column title="生效时间" data-index="effectiveTime" :width="180" />
          <a-table-column title="版本 ID" data-index="id" :width="180" />
        </template>
      </a-table>
    </a-card>
  </a-drawer>
</template>

<script setup lang="ts">
import type { FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import { defaultEffectiveTime, getErrorMessage, toApiDateTime } from './utils'
import type { AgentPricingVersion, AgentResp } from '@/apis/merchant/agent'
import { createAgentPricing, listAgentPricing } from '@/apis/merchant/agent'

const { width } = useWindowSize()
const drawerWidth = computed(() => width.value >= 1000 ? 900 : '100%')
const visible = ref(false)
const agent = ref<AgentResp>()
const formRef = ref<FormInstance>()
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const history = ref<AgentPricingVersion[]>([])
const form = reactive({
  channelCode: '',
  productCode: '',
  currency: 'CNY',
  percentageCost: 0,
  fixedFee: 0,
  profitShareRatio: 0,
  effectiveTime: defaultEffectiveTime(),
  expiresTime: '',
  reason: '',
})
const rules: FormInstance['rules'] = {
  channelCode: [{ required: true, message: '请输入渠道编码' }],
  productCode: [{ required: true, message: '请输入产品编码' }],
  currency: [{ required: true, message: '请输入币种' }],
  effectiveTime: [{ required: true, message: '请选择生效时间' }],
  reason: [{ required: true, message: '请输入变更原因' }],
}

const loadHistory = async () => {
  if (!agent.value || !form.channelCode.trim() || !form.productCode.trim()) {
    history.value = []
    return
  }
  try {
    loading.value = true
    errorMessage.value = ''
    const { data } = await listAgentPricing(agent.value.id, form.channelCode.trim(), form.productCode.trim(), form.currency.trim() || 'CNY')
    history.value = data
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '定价历史加载失败')
  } finally {
    loading.value = false
  }
}

const save = async () => {
  try {
    errorMessage.value = ''
    const invalid = await formRef.value?.validate()
    if (invalid || !agent.value) return
    saving.value = true
    await createAgentPricing(agent.value.id, {
      channelCode: form.channelCode.trim(),
      productCode: form.productCode.trim(),
      currency: form.currency.trim(),
      percentageCost: form.percentageCost,
      fixedFee: form.fixedFee,
      profitShareRatio: form.profitShareRatio,
      effectiveTime: toApiDateTime(form.effectiveTime) || '',
      expiresTime: toApiDateTime(form.expiresTime),
      reason: form.reason.trim(),
    })
    Message.success('定价版本已发布')
    form.reason = ''
    await loadHistory()
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    saving.value = false
  }
}

const onOpen = (record: AgentResp) => {
  agent.value = record
  history.value = []
  errorMessage.value = ''
  Object.assign(form, {
    channelCode: '',
    productCode: '',
    currency: 'CNY',
    percentageCost: 0,
    fixedFee: 0,
    profitShareRatio: 0,
    effectiveTime: defaultEffectiveTime(),
    expiresTime: '',
    reason: '',
  })
  visible.value = true
}

defineExpose({ onOpen })
</script>

<style scoped>
.mb-3 { margin-bottom: 12px; }
.section-card { margin-bottom: 16px; background: var(--color-fill-1); }
</style>
