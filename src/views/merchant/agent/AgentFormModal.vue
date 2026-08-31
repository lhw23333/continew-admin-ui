<template>
  <a-modal
    v-model:visible="visible"
    :title="title"
    :mask-closable="false"
    :esc-to-close="false"
    :width="width >= 600 ? 560 : '100%'"
    :ok-text="mode === 'view' ? '关闭' : '保存'"
    :hide-cancel="mode === 'view'"
    draggable
    @before-ok="save"
    @close="reset"
  >
    <a-alert v-if="errorMessage" type="error" closable class="mb-3" @close="errorMessage = ''">
      {{ errorMessage }}
    </a-alert>
    <a-form ref="formRef" :model="form" :rules="rules" auto-label-width>
      <a-form-item v-if="mode !== 'edit'" field="agentNo" label="代理商编号">
        <a-input v-model="form.agentNo" :disabled="mode === 'view'" placeholder="请输入代理商编号" :max-length="64" />
      </a-form-item>
      <a-form-item field="name" label="代理商名称">
        <a-input v-model="form.name" :disabled="mode === 'view'" placeholder="请输入代理商名称" :max-length="100" />
      </a-form-item>
      <a-form-item field="contactName" label="联系人">
        <a-input v-model="form.contactName" :disabled="mode === 'view'" placeholder="请输入联系人" :max-length="100" />
      </a-form-item>
      <a-form-item v-if="mode === 'view'" label="联系人手机">
        <a-input :model-value="detail?.contactMobileMasked || '-'" disabled />
      </a-form-item>
      <a-form-item v-else field="contactMobile" label="联系人手机">
        <a-input
          v-model="form.contactMobile"
          placeholder="编辑时留空表示保持原号码"
          :max-length="20"
        />
        <template v-if="mode === 'edit' && detail?.contactMobileMasked" #extra>
          当前号码：{{ detail.contactMobileMasked }}
        </template>
      </a-form-item>
      <template v-if="mode === 'create'">
        <a-form-item field="temporaryPassword" label="临时密码">
          <a-input-password v-model="form.temporaryPassword" placeholder="请输入临时密码" autocomplete="new-password" />
        </a-form-item>
        <a-form-item field="confirmPassword" label="确认密码">
          <a-input-password v-model="form.confirmPassword" placeholder="请再次输入临时密码" autocomplete="new-password" />
        </a-form-item>
        <a-alert type="warning">新账号首次登录必须修改密码，系统不会返回或记录明文密码。</a-alert>
      </template>
      <a-form-item v-if="mode !== 'create'" field="remarks" label="备注">
        <a-textarea
          v-model="form.remarks"
          :disabled="mode === 'view'"
          placeholder="请输入备注"
          :max-length="255"
          show-word-limit
          :auto-size="{ minRows: 3, maxRows: 5 }"
        />
      </a-form-item>
      <template v-if="mode === 'view'">
        <a-form-item label="状态">
          <a-tag :color="detail?.status === 'ENABLED' ? 'green' : 'red'">
            {{ detail?.status === 'ENABLED' ? '启用' : '禁用' }}
          </a-tag>
        </a-form-item>
        <a-form-item label="推广码">
          <a-input :model-value="detail?.promotionCode || '未签发'" disabled />
        </a-form-item>
      </template>
    </a-form>
  </a-modal>
</template>

<script setup lang="ts">
import type { FormInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import { getErrorMessage } from './utils'
import type { AgentResp } from '@/apis/merchant/agent'
import {
  createSubordinateAgent,
  getAgent,
  updateAgentProfile,
} from '@/apis/merchant/agent'
import { encryptByRsa } from '@/utils/encrypt'

type Mode = 'create' | 'edit' | 'view'

const emit = defineEmits<{
  (e: 'save-success'): void
}>()

const { width } = useWindowSize()
const visible = ref(false)
const mode = ref<Mode>('create')
const agentId = ref('')
const detail = ref<AgentResp>()
const formRef = ref<FormInstance>()
const errorMessage = ref('')
const form = reactive({
  agentNo: '',
  name: '',
  contactName: '',
  contactMobile: '',
  temporaryPassword: '',
  confirmPassword: '',
  remarks: '',
})

const title = computed(() => ({ create: '新增直属代理商', edit: '修改代理商资料', view: '代理商详情' })[mode.value])
const rules = computed<FormInstance['rules']>(() => ({
  agentNo: mode.value === 'create' ? [{ required: true, message: '请输入代理商编号' }] : [],
  name: [{ required: true, message: '请输入代理商名称' }],
  contactName: [{ required: true, message: '请输入联系人' }],
  contactMobile: mode.value === 'create'
    ? [
        { required: true, message: '请输入联系人手机' },
        { match: /^1[3-9]\d{9}$/, message: '请输入正确的手机号' },
      ]
    : [{ match: /^(1[3-9]\d{9})?$/, message: '请输入正确的手机号，或留空保持原值' }],
  temporaryPassword: mode.value === 'create' ? [{ required: true, message: '请输入临时密码' }] : [],
  confirmPassword: mode.value === 'create'
    ? [
        { required: true, message: '请再次输入临时密码' },
        { validator: (value, callback) => callback(value === form.temporaryPassword ? undefined : '两次密码不一致') },
      ]
    : [],
}))

const reset = () => {
  formRef.value?.resetFields()
  Object.assign(form, {
    agentNo: '',
    name: '',
    contactName: '',
    contactMobile: '',
    temporaryPassword: '',
    confirmPassword: '',
    remarks: '',
  })
  detail.value = undefined
  errorMessage.value = ''
}

const loadDetail = async (id: string) => {
  const { data } = await getAgent(id)
  detail.value = data
  Object.assign(form, {
    agentNo: data.agentNo,
    name: data.name,
    contactName: data.contactName,
    contactMobile: '',
    remarks: data.remarks || '',
  })
}

const save = async () => {
  if (mode.value === 'view') return true
  try {
    errorMessage.value = ''
    const invalid = await formRef.value?.validate()
    if (invalid) return false
    if (mode.value === 'create') {
      const { data } = await createSubordinateAgent({
        agentNo: form.agentNo.trim(),
        name: form.name.trim(),
        contactName: form.contactName.trim(),
        contactMobile: form.contactMobile.trim(),
        temporaryPassword: encryptByRsa(form.temporaryPassword) || '',
        confirmPassword: encryptByRsa(form.confirmPassword) || '',
      })
      Message.success(`创建成功，登录账号：${data.username}`)
    } else if (detail.value) {
      await updateAgentProfile(agentId.value, {
        name: form.name.trim(),
        contactName: form.contactName.trim(),
        contactMobile: form.contactMobile.trim(),
        remarks: form.remarks.trim() || undefined,
        expectedVersion: detail.value.rowVersion,
      })
      Message.success('修改成功')
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
  agentId.value = id || ''
  if (id) {
    try {
      await loadDetail(id)
    } catch (error) {
      errorMessage.value = getErrorMessage(error, '代理商详情加载失败')
    }
  }
  visible.value = true
}

defineExpose({
  onAdd: () => open('create'),
  onEdit: (id: string) => open('edit', id),
  onView: (id: string) => open('view', id),
})
</script>

<style scoped>
.mb-3 { margin-bottom: 12px; }
</style>
