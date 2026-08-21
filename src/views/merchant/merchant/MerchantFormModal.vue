<template>
  <a-modal
    v-model:visible="visible"
    :title="title"
    :width="modalWidth"
    :mask-closable="false"
    :esc-to-close="false"
    :hide-cancel="mode === 'view'"
    :ok-text="mode === 'view' ? '关闭' : '保存'"
    unmount-on-close
    @before-ok="save"
    @close="reset"
  >
    <a-alert v-if="errorMessage" type="error" closable class="mb-3" @close="errorMessage = ''">
      {{ errorMessage }}
    </a-alert>
    <a-alert v-if="mode === 'create'" type="info" class="mb-3">
      系统将生成彼此独立的操作员和复核员账号。临时密码通过 RSA 加密传输，首次登录必须修改密码，不使用短信、邮件验证码或激活码。
    </a-alert>
    <a-spin :loading="loading" style="width: 100%">
      <a-form ref="formRef" :model="form" :rules="rules" layout="vertical">
        <a-divider orientation="left">主体与归属</a-divider>
        <div class="form-grid">
          <a-form-item field="merchantType" label="商户类型">
            <a-select v-model="form.merchantType" :disabled="mode !== 'create'" placeholder="请选择商户类型">
              <a-option value="ENTERPRISE">企业商户</a-option>
              <a-option value="INDIVIDUAL">个人商户</a-option>
            </a-select>
          </a-form-item>
          <a-form-item field="owningAgentId" label="归属代理商">
            <a-select
              v-model="form.owningAgentId"
              :disabled="mode !== 'create'"
              :loading="agentLoading"
              allow-search
              placeholder="请选择授权范围内代理商"
            >
              <a-option v-for="agent in agents" :key="agent.id" :value="agent.id">
                {{ agent.name }}（{{ agent.agentNo }}）
              </a-option>
            </a-select>
          </a-form-item>
          <a-form-item field="legalName" label="法定主体全称">
            <a-input v-model="form.legalName" :disabled="mode !== 'create'" :max-length="200" show-word-limit />
          </a-form-item>
          <a-form-item field="shortName" label="商户简称">
            <a-input v-model="form.shortName" :disabled="mode === 'view'" :max-length="100" show-word-limit />
          </a-form-item>
          <a-form-item v-if="mode === 'create'" field="legalIdentifier" label="法定主体标识">
            <a-input-password
              v-model="form.legalIdentifier"
              :max-length="64"
              autocomplete="off"
              placeholder="统一社会信用代码或证件号"
            />
          </a-form-item>
          <a-form-item v-else label="法定代表人">
            <a-input :model-value="detail?.legalRepresentativeName || '待 KYC 完善'" disabled />
          </a-form-item>
        </div>

        <a-divider orientation="left">联系与经营资料</a-divider>
        <div class="form-grid">
          <a-form-item field="contactName" label="联系人">
            <a-input v-model="form.contactName" :disabled="mode === 'view'" :max-length="100" />
          </a-form-item>
          <a-form-item field="contactMobile" :label="mode === 'edit' ? '联系人手机（留空保持原值）' : '联系人手机'">
            <a-input v-if="mode !== 'view'" v-model="form.contactMobile" :max-length="11" autocomplete="off" />
            <a-input v-else :model-value="detail?.contactMobileMasked || '-'" disabled />
          </a-form-item>
          <a-form-item field="reviewerMobile" :label="mode === 'edit' ? '复核员手机（留空保持原值）' : '复核员手机'">
            <a-input v-if="mode !== 'view'" v-model="form.reviewerMobile" :max-length="11" autocomplete="off" />
            <a-input v-else :model-value="detail?.reviewerMobileMasked || '-'" disabled />
          </a-form-item>
          <a-form-item field="industry" label="所属行业">
            <a-input v-model="form.industry" :disabled="mode === 'view'" :max-length="100" show-word-limit />
          </a-form-item>
        </div>
        <a-form-item field="productDescription" label="产品描述">
          <a-textarea
            v-model="form.productDescription"
            :disabled="mode === 'view'"
            :max-length="255"
            show-word-limit
            :auto-size="{ minRows: 3, maxRows: 5 }"
          />
        </a-form-item>

        <template v-if="mode === 'create'">
          <a-divider orientation="left">双岗位临时凭据</a-divider>
          <div class="form-grid">
            <a-form-item field="operatorTemporaryPassword" label="操作员临时密码">
              <a-input-password v-model="form.operatorTemporaryPassword" autocomplete="new-password" />
            </a-form-item>
            <a-form-item field="operatorConfirmPassword" label="确认操作员密码">
              <a-input-password v-model="form.operatorConfirmPassword" autocomplete="new-password" />
            </a-form-item>
            <a-form-item field="reviewerTemporaryPassword" label="复核员临时密码">
              <a-input-password v-model="form.reviewerTemporaryPassword" autocomplete="new-password" />
            </a-form-item>
            <a-form-item field="reviewerConfirmPassword" label="确认复核员密码">
              <a-input-password v-model="form.reviewerConfirmPassword" autocomplete="new-password" />
            </a-form-item>
          </div>
        </template>

        <template v-if="detail">
          <a-divider orientation="left">账号与状态</a-divider>
          <a-descriptions :column="descriptionColumns" bordered>
            <a-descriptions-item label="商户编号">{{ detail.merchantNo }}</a-descriptions-item>
            <a-descriptions-item label="操作员账号">{{ detail.operatorUsername || '-' }}</a-descriptions-item>
            <a-descriptions-item label="复核员账号">{{ detail.reviewerUsername || '-' }}</a-descriptions-item>
            <a-descriptions-item label="商户主状态">
              <a-tag :color="merchantStatusMeta(detail.status).color">
                {{ merchantStatusMeta(detail.status).label }}
              </a-tag>
            </a-descriptions-item>
            <a-descriptions-item label="归属代理商">{{ detail.owningAgentName || detail.owningAgentId }}</a-descriptions-item>
            <a-descriptions-item label="渠道数量">{{ detail.channels.length }}</a-descriptions-item>
          </a-descriptions>
        </template>
      </a-form>
    </a-spin>
  </a-modal>
</template>

<script setup lang="ts">
import type { FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import { getErrorMessage, merchantStatusMeta } from './utils'
import type { AgentResp } from '@/apis/merchant/agent'
import { listAgent } from '@/apis/merchant/agent'
import type { MerchantDetail, MerchantType } from '@/apis/merchant/merchant'
import { createMerchant, getMerchant, updateMerchantProfile } from '@/apis/merchant/merchant'
import { encryptByRsa } from '@/utils/encrypt'

type Mode = 'create' | 'edit' | 'view'

const emit = defineEmits<{ (e: 'save-success'): void }>()
const { width } = useWindowSize()
const modalWidth = computed(() => width.value >= 960 ? 900 : '100%')
const descriptionColumns = computed(() => width.value >= 768 ? 3 : 1)
const visible = ref(false)
const mode = ref<Mode>('create')
const merchantId = ref('')
const detail = ref<MerchantDetail>()
const formRef = ref<FormInstance>()
const loading = ref(false)
const agentLoading = ref(false)
const agents = ref<AgentResp[]>([])
const errorMessage = ref('')
const emptyForm = () => ({
  merchantType: 'ENTERPRISE' as MerchantType,
  owningAgentId: '',
  legalName: '',
  shortName: '',
  legalIdentifier: '',
  contactName: '',
  contactMobile: '',
  reviewerMobile: '',
  industry: '',
  productDescription: '',
  operatorTemporaryPassword: '',
  operatorConfirmPassword: '',
  reviewerTemporaryPassword: '',
  reviewerConfirmPassword: '',
})
const form = reactive(emptyForm())

const title = computed(() => ({ create: '新增商户', edit: '修改商户普通资料', view: '商户详情' })[mode.value])
const mobileRules = computed(() => mode.value === 'create'
  ? [
      { required: true, message: '请输入手机号' },
      { match: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
    ]
  : [{ match: /^(1[3-9]\d{9})?$/, message: '请输入正确的手机号，或留空保持原值' }])
const rules = computed<FormInstance['rules']>(() => ({
  merchantType: mode.value === 'create' ? [{ required: true, message: '请选择商户类型' }] : [],
  owningAgentId: mode.value === 'create' ? [{ required: true, message: '请选择归属代理商' }] : [],
  legalName: mode.value === 'create' ? [{ required: true, message: '请输入法定主体全称' }] : [],
  shortName: [{ required: true, message: '请输入商户简称' }],
  legalIdentifier: mode.value === 'create' ? [{ required: true, message: '请输入法定主体标识' }] : [],
  contactName: [{ required: true, message: '请输入联系人' }],
  contactMobile: mobileRules.value,
  reviewerMobile: mobileRules.value,
  operatorTemporaryPassword: mode.value === 'create' ? [{ required: true, message: '请输入操作员临时密码' }] : [],
  operatorConfirmPassword: mode.value === 'create'
    ? [
        { required: true, message: '请确认操作员临时密码' },
        { validator: (value, callback) => callback(value === form.operatorTemporaryPassword ? undefined : '两次操作员密码不一致') },
      ]
    : [],
  reviewerTemporaryPassword: mode.value === 'create' ? [{ required: true, message: '请输入复核员临时密码' }] : [],
  reviewerConfirmPassword: mode.value === 'create'
    ? [
        { required: true, message: '请确认复核员临时密码' },
        { validator: (value, callback) => callback(value === form.reviewerTemporaryPassword ? undefined : '两次复核员密码不一致') },
      ]
    : [],
}))

const reset = () => {
  formRef.value?.resetFields()
  Object.assign(form, emptyForm())
  detail.value = undefined
  merchantId.value = ''
  errorMessage.value = ''
}

const loadAgents = async () => {
  try {
    agentLoading.value = true
    const { data } = await listAgent({ status: 'ENABLED', page: 1, size: 100 })
    agents.value = data.list
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '代理商选项加载失败')
  } finally {
    agentLoading.value = false
  }
}

const loadDetail = async (id: string) => {
  const { data } = await getMerchant(id)
  detail.value = data
  Object.assign(form, {
    merchantType: data.merchantType,
    owningAgentId: data.owningAgentId,
    legalName: data.legalName,
    shortName: data.shortName,
    contactName: data.contactName || '',
    contactMobile: '',
    reviewerMobile: '',
    industry: data.industry || '',
    productDescription: data.productDescription || '',
  })
}

const encryptRequired = (value: string, field: string) => {
  const encrypted = encryptByRsa(value)
  if (!encrypted) throw new Error(`${field}加密失败，请刷新页面后重试`)
  return encrypted
}

const save = async () => {
  if (mode.value === 'view') return true
  try {
    errorMessage.value = ''
    const invalid = await formRef.value?.validate()
    if (invalid) return false
    if (mode.value === 'create') {
      const { data } = await createMerchant({
        owningAgentId: form.owningAgentId,
        merchantType: form.merchantType,
        legalName: form.legalName.trim(),
        shortName: form.shortName.trim(),
        legalIdentifier: form.legalIdentifier.trim(),
        contactName: form.contactName.trim(),
        contactMobile: form.contactMobile.trim(),
        reviewerMobile: form.reviewerMobile.trim(),
        industry: form.industry.trim() || undefined,
        productDescription: form.productDescription.trim() || undefined,
        operatorTemporaryPassword: encryptRequired(form.operatorTemporaryPassword, '操作员临时密码'),
        operatorConfirmPassword: encryptRequired(form.operatorConfirmPassword, '操作员确认密码'),
        reviewerTemporaryPassword: encryptRequired(form.reviewerTemporaryPassword, '复核员临时密码'),
        reviewerConfirmPassword: encryptRequired(form.reviewerConfirmPassword, '复核员确认密码'),
      })
      Message.success(`创建成功：操作员 ${data.operatorUsername}，复核员 ${data.reviewerUsername}`)
    } else if (detail.value) {
      await updateMerchantProfile(merchantId.value, {
        shortName: form.shortName.trim(),
        contactName: form.contactName.trim(),
        contactMobile: form.contactMobile.trim() || undefined,
        reviewerMobile: form.reviewerMobile.trim() || undefined,
        industry: form.industry.trim() || undefined,
        productDescription: form.productDescription.trim() || undefined,
        expectedVersion: detail.value.rowVersion,
      })
      Message.success('商户资料已修改')
    }
    emit('save-success')
    return true
  } catch (error) {
    errorMessage.value = getErrorMessage(error)
    return false
  }
}

const open = async (nextMode: Mode, id?: string) => {
  reset()
  mode.value = nextMode
  merchantId.value = id || ''
  visible.value = true
  loading.value = true
  try {
    if (nextMode === 'create') {
      await loadAgents()
    } else if (id) {
      await loadDetail(id)
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '商户详情加载失败')
  } finally {
    loading.value = false
  }
}

defineExpose({
  onAdd: () => open('create'),
  onEdit: (id: string) => open('edit', id),
  onView: (id: string) => open('view', id),
})
</script>

<style scoped>
.mb-3 { margin-bottom: 12px; }
.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}
@media (max-width: 768px) {
  .form-grid { grid-template-columns: 1fr; }
}
</style>
