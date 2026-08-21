<template>
  <a-drawer v-model:visible="visible" title="商户默认配置" :width="drawerWidth" :footer="false" unmount-on-close>
    <a-alert v-if="errorMessage" type="error" closable class="mb-3" @close="errorMessage = ''">{{ errorMessage }}</a-alert>
    <a-alert type="info" class="mb-3">定价版本 ID 可从“定价”功能的版本历史中复制；草稿继承后不会随新版本变化。</a-alert>
    <a-card title="发布新默认版本" :bordered="false" class="section-card">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <div v-for="(product, index) in form.products" :key="index" class="product-row">
          <a-input v-model="product.channelCode" placeholder="渠道编码" />
          <a-input v-model="product.productCode" placeholder="产品编码" />
          <a-input v-model="product.pricingVersionId" placeholder="定价版本 ID" />
          <a-button status="danger" :disabled="form.products.length === 1" @click="removeProduct(index)"><icon-delete /></a-button>
        </div>
        <a-button class="mb-3" @click="addProduct"><template #icon><icon-plus /></template>添加产品</a-button>
        <a-grid :cols="24" :col-gap="12">
          <a-grid-item :span="12"><a-form-item field="effectiveTime" label="生效时间"><a-date-picker v-model="form.effectiveTime" show-time format="YYYY-MM-DD HH:mm:ss" style="width: 100%" /></a-form-item></a-grid-item>
          <a-grid-item :span="12"><a-form-item field="expiresTime" label="失效时间"><a-date-picker v-model="form.expiresTime" show-time allow-clear format="YYYY-MM-DD HH:mm:ss" style="width: 100%" /></a-form-item></a-grid-item>
        </a-grid>
        <a-form-item field="reason" label="变更原因"><a-textarea v-model="form.reason" :max-length="255" show-word-limit /></a-form-item>
        <a-button type="primary" :loading="saving" @click="save">发布默认版本</a-button>
      </a-form>
    </a-card>
    <a-card title="版本历史" :bordered="false" class="section-card">
      <a-table :data="history" :loading="loading" :pagination="false" row-key="id" :scroll="{ x: 850 }">
        <template #columns>
          <a-table-column title="版本" data-index="versionNo" :width="80" />
          <a-table-column title="默认产品" :width="320">
            <template #cell="{ record }">
              <a-space wrap>
                <a-tag v-for="item in record.defaults.products" :key="`${item.channelCode}-${item.productCode}`">
                  {{ item.channelCode }}/{{ item.productCode }} · {{ item.pricingVersionId }}
                </a-tag>
              </a-space>
            </template>
          </a-table-column>
          <a-table-column title="生效时间" data-index="effectiveTime" :width="180" />
          <a-table-column title="失效时间" data-index="expiresTime" :width="180" />
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
import type { AgentMerchantDefaultVersion, AgentResp } from '@/apis/merchant/agent'
import { createAgentMerchantDefaults, listAgentMerchantDefaults } from '@/apis/merchant/agent'

const { width } = useWindowSize()
const drawerWidth = computed(() => width.value >= 1000 ? 900 : '100%')
const visible = ref(false)
const agent = ref<AgentResp>()
const formRef = ref<FormInstance>()
const history = ref<AgentMerchantDefaultVersion[]>([])
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const emptyProduct = () => ({ channelCode: '', productCode: '', pricingVersionId: '' })
const form = reactive({ products: [emptyProduct()], effectiveTime: defaultEffectiveTime(), expiresTime: '', reason: '' })
const rules: FormInstance['rules'] = {
  effectiveTime: [{ required: true, message: '请选择生效时间' }],
  reason: [{ required: true, message: '请输入变更原因' }],
}

const addProduct = () => form.products.push(emptyProduct())
const removeProduct = (index: number) => form.products.splice(index, 1)

const loadHistory = async () => {
  if (!agent.value) return
  try {
    loading.value = true
    const { data } = await listAgentMerchantDefaults(agent.value.id)
    history.value = data
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '默认版本加载失败')
  } finally {
    loading.value = false
  }
}

const save = async () => {
  try {
    errorMessage.value = ''
    const invalid = await formRef.value?.validate()
    if (invalid || !agent.value) return
    if (form.products.some((item) => !item.channelCode.trim() || !item.productCode.trim() || !item.pricingVersionId.trim())) {
      errorMessage.value = '请完整填写每一行渠道、产品和定价版本 ID。'
      return
    }
    saving.value = true
    await createAgentMerchantDefaults(agent.value.id, {
      products: form.products.map((item) => ({
        channelCode: item.channelCode.trim(),
        productCode: item.productCode.trim(),
        pricingVersionId: item.pricingVersionId.trim(),
      })),
      effectiveTime: toApiDateTime(form.effectiveTime) || '',
      expiresTime: toApiDateTime(form.expiresTime),
      reason: form.reason.trim(),
    })
    Message.success('商户默认版本已发布')
    form.reason = ''
    await loadHistory()
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
  } finally {
    saving.value = false
  }
}

const onOpen = async (record: AgentResp) => {
  agent.value = record
  errorMessage.value = ''
  Object.assign(form, { products: [emptyProduct()], effectiveTime: defaultEffectiveTime(), expiresTime: '', reason: '' })
  visible.value = true
  await loadHistory()
}

defineExpose({ onOpen })
</script>

<style scoped>
.mb-3 { margin-bottom: 12px; }
.section-card { margin-bottom: 16px; background: var(--color-fill-1); }
.product-row { display: grid; grid-template-columns: 1fr 1fr 1.2fr auto; gap: 8px; margin-bottom: 8px; }
@media (max-width: 768px) { .product-row { grid-template-columns: 1fr; } }
</style>
