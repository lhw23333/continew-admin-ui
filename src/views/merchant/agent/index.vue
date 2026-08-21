<template>
  <GiPageLayout>
    <GiTable
      row-key="id"
      :data="dataList"
      :columns="columns"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ x: '100%', y: '100%', minWidth: 1450 }"
      :disabled-column-keys="['agentNo', 'name']"
      @refresh="refresh"
    >
      <template #toolbar-left>
        <a-space wrap>
          <a-input v-model="queryForm.agentId" placeholder="代理商 ID" allow-clear style="width: 180px" />
          <a-input v-model="queryForm.name" placeholder="代理商名称" allow-clear style="width: 180px" />
          <a-select v-model="queryForm.status" placeholder="状态" allow-clear style="width: 140px">
            <a-option value="ENABLED">启用</a-option>
            <a-option value="DISABLED">禁用</a-option>
          </a-select>
          <a-button type="primary" @click="search"><template #icon><icon-search /></template>查询</a-button>
          <a-button @click="reset"><template #icon><icon-refresh /></template>重置</a-button>
        </a-space>
      </template>
      <template #toolbar-right>
        <a-button v-permission="['merchant:agent:create']" type="primary" @click="formModalRef?.onAdd()">
          <template #icon><icon-plus /></template>新增直属代理商
        </a-button>
      </template>
      <template #status="{ record }">
        <a-tag :color="record.status === 'ENABLED' ? 'green' : 'red'">
          {{ record.status === 'ENABLED' ? '启用' : '禁用' }}
        </a-tag>
      </template>
      <template #promotion="{ record }">
        <a-space>
          <a-typography-text v-if="record.promotionCode" copyable>{{ record.promotionCode }}</a-typography-text>
          <span v-else>-</span>
          <a-tag v-if="record.promotionCode" :color="record.promotionCodeStatus === 'ACTIVE' ? 'green' : 'red'" size="small">
            {{ record.promotionCodeStatus === 'ACTIVE' ? '启用' : '禁用' }}
          </a-tag>
        </a-space>
      </template>
      <template #action="{ record }">
        <a-space>
          <a-link v-if="has.hasPerm('merchant:agent:get')" @click="formModalRef?.onView(record.id)">查看</a-link>
          <a-link v-if="has.hasPerm('merchant:agent:update')" @click="formModalRef?.onEdit(record.id)">修改</a-link>
          <a-dropdown v-if="hasMoreAction" trigger="click">
            <a-link>更多<icon-down /></a-link>
            <template #content>
              <a-doption v-if="has.hasPerm('merchant:agent:lifecycle')" @click="lifecycleModalRef?.onOpen(record)">
                {{ record.status === 'ENABLED' ? '停用' : '启用' }}
              </a-doption>
              <a-doption v-if="has.hasPerm('merchant:agent:resetPassword')" @click="passwordModalRef?.onOpen(record)">重置密码</a-doption>
              <a-doption v-if="has.hasPerm('merchant:agent:promotionCode')" @click="promotionModalRef?.onOpen(record)">推广码</a-doption>
              <a-doption v-if="has.hasPerm('merchant:agent:pricing')" @click="pricingDrawerRef?.onOpen(record)">定价版本</a-doption>
              <a-doption v-if="has.hasPerm('merchant:agent:defaults')" @click="defaultsDrawerRef?.onOpen(record)">商户默认</a-doption>
            </template>
          </a-dropdown>
        </a-space>
      </template>
    </GiTable>

    <AgentFormModal ref="formModalRef" @save-success="refresh" />
    <LifecycleModal ref="lifecycleModalRef" @save-success="refresh" />
    <PasswordResetModal ref="passwordModalRef" @save-success="refresh" />
    <PromotionModal ref="promotionModalRef" @save-success="refresh" />
    <PricingDrawer ref="pricingDrawerRef" />
    <DefaultsDrawer ref="defaultsDrawerRef" />
  </GiPageLayout>
</template>

<script setup lang="ts">
import type { TableInstance } from '@arco-design/web-vue'
import AgentFormModal from './AgentFormModal.vue'
import LifecycleModal from './LifecycleModal.vue'
import PasswordResetModal from './PasswordResetModal.vue'
import PromotionModal from './PromotionModal.vue'
import PricingDrawer from './PricingDrawer.vue'
import DefaultsDrawer from './DefaultsDrawer.vue'
import type { AgentQuery, AgentResp } from '@/apis/merchant/agent'
import { listAgent } from '@/apis/merchant/agent'
import { useResetReactive, useTable } from '@/hooks'
import { isMobile } from '@/utils'
import has from '@/utils/has'

defineOptions({ name: 'MerchantAgent' })

const [queryForm, resetForm] = useResetReactive<AgentQuery>({})
const { tableData: dataList, loading, pagination, search, refresh } = useTable<AgentResp>(
  (page) => listAgent({ ...queryForm, ...page }),
)

const hasMoreAction = computed(() => has.hasPermOr([
  'merchant:agent:lifecycle',
  'merchant:agent:resetPassword',
  'merchant:agent:promotionCode',
  'merchant:agent:pricing',
  'merchant:agent:defaults',
]))

const columns: TableInstance['columns'] = [
  { title: '代理商编号', dataIndex: 'agentNo', width: 160, fixed: !isMobile() ? 'left' : undefined },
  { title: '代理商名称', dataIndex: 'name', width: 180, ellipsis: true, tooltip: true, fixed: !isMobile() ? 'left' : undefined },
  { title: '联系人', dataIndex: 'contactName', width: 130, ellipsis: true, tooltip: true },
  { title: '手机号', dataIndex: 'contactMobileMasked', width: 150 },
  { title: '状态', dataIndex: 'status', slotName: 'status', width: 90, align: 'center' },
  { title: '推广码', dataIndex: 'promotionCode', slotName: 'promotion', width: 230 },
  { title: '父代理商 ID', dataIndex: 'parentId', width: 180 },
  { title: '部门 ID', dataIndex: 'deptId', width: 180, show: false },
  { title: '备注', dataIndex: 'remarks', minWidth: 180, ellipsis: true, tooltip: true },
  { title: '创建时间', dataIndex: 'createTime', width: 180 },
  {
    title: '操作',
    dataIndex: 'action',
    slotName: 'action',
    width: 190,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPermOr([
      'merchant:agent:get',
      'merchant:agent:update',
      'merchant:agent:lifecycle',
      'merchant:agent:resetPassword',
      'merchant:agent:promotionCode',
      'merchant:agent:pricing',
      'merchant:agent:defaults',
    ]),
  },
]

const reset = () => {
  resetForm()
  search()
}

const formModalRef = ref<InstanceType<typeof AgentFormModal>>()
const lifecycleModalRef = ref<InstanceType<typeof LifecycleModal>>()
const passwordModalRef = ref<InstanceType<typeof PasswordResetModal>>()
const promotionModalRef = ref<InstanceType<typeof PromotionModal>>()
const pricingDrawerRef = ref<InstanceType<typeof PricingDrawer>>()
const defaultsDrawerRef = ref<InstanceType<typeof DefaultsDrawer>>()
</script>
