<template>
  <GiPageLayout>
    <GiTable
      row-key="id"
      :data="dataList"
      :columns="columns"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ x: '100%', y: '100%', minWidth: 1900 }"
      :disabled-column-keys="['merchantNo', 'shortName']"
      @refresh="refresh"
    >
      <template #toolbar-left>
        <a-space wrap>
          <a-input v-model="queryForm.merchantId" placeholder="商户 ID" allow-clear class="filter-control" />
          <a-input v-model="queryForm.merchantNo" placeholder="商户编号" allow-clear class="filter-control" />
          <a-input v-model="queryForm.loginAccount" placeholder="登录账号" allow-clear class="filter-control" />
          <a-input v-model="queryForm.legalName" placeholder="法定主体全称" allow-clear class="filter-control" />
          <a-input v-model="queryForm.shortName" placeholder="商户简称" allow-clear class="filter-control" />
          <a-input v-model="queryForm.contact" placeholder="联系人/掩码手机" allow-clear class="filter-control" />
          <a-input v-model="queryForm.legalRepresentative" placeholder="法定代表人" allow-clear class="filter-control" />
          <a-input v-model="queryForm.owningAgentId" placeholder="归属代理商 ID" allow-clear class="filter-control" />
          <a-input v-model="queryForm.channelCode" placeholder="渠道编码" allow-clear class="filter-control" />
          <a-select v-model="queryForm.merchantType" placeholder="商户类型" allow-clear class="filter-select">
            <a-option value="ENTERPRISE">企业商户</a-option>
            <a-option value="INDIVIDUAL">个人商户</a-option>
          </a-select>
          <a-select v-model="queryForm.status" placeholder="主状态" allow-clear class="filter-select">
            <a-option value="DRAFT">草稿</a-option>
            <a-option value="ENABLED">启用</a-option>
            <a-option value="DISABLED">停用</a-option>
          </a-select>
          <a-range-picker
            v-model="createdRange"
            show-time
            allow-clear
            format="YYYY-MM-DD HH:mm:ss"
            class="date-filter"
          />
          <a-button type="primary" @click="search"><template #icon><icon-search /></template>查询</a-button>
          <a-button @click="reset"><template #icon><icon-refresh /></template>重置</a-button>
        </a-space>
      </template>
      <template #toolbar-right>
        <a-button v-permission="['merchant:merchant:create']" type="primary" @click="formModalRef?.onAdd()">
          <template #icon><icon-plus /></template>新增商户
        </a-button>
      </template>

      <template #merchantType="{ record }">
        <a-tag>{{ merchantTypeLabel(record.merchantType) }}</a-tag>
      </template>
      <template #status="{ record }">
        <a-tag :color="merchantStatusMeta(record.status).color">
          {{ merchantStatusMeta(record.status).label }}
        </a-tag>
      </template>
      <template #agent="{ record }">
        <div>{{ record.owningAgentName || '-' }}</div>
        <a-typography-text type="secondary">{{ record.owningAgentNo || record.owningAgentId }}</a-typography-text>
      </template>
      <template #accounts="{ record }">
        <div>操作：{{ record.operatorUsername || '-' }}</div>
        <div>复核：{{ record.reviewerUsername || '-' }}</div>
      </template>
      <template #channels="{ record }">
        <a-space v-if="record.channels.length" wrap>
          <a-tag
            v-for="channel in record.channels"
            :key="channel.channelCode"
            :color="channelStatusColor(channel.channelFinalStatus)"
          >
            {{ channel.channelCode }} · {{ channel.channelFinalStatus }}
          </a-tag>
        </a-space>
        <span v-else>-</span>
      </template>
      <template #action="{ record }">
        <a-space>
          <a-link v-if="can(record, 'VIEW', 'merchant:merchant:get')" @click="formModalRef?.onView(record.id)">查看</a-link>
          <a-link v-if="can(record, 'EDIT_PROFILE', 'merchant:merchant:update')" @click="formModalRef?.onEdit(record.id)">修改</a-link>
          <a-dropdown v-if="hasRowMoreAction(record)" trigger="click">
            <a-link>更多<icon-down /></a-link>
            <template #content>
              <a-doption
                v-if="can(record, 'START_ONBOARDING', 'merchant:onboarding:create')"
                @click="onboardingWizardRef?.onOpen(record)"
              >
                发起入网
              </a-doption>
              <a-doption v-if="can(record, 'VIEW', 'merchant:merchant:get')" @click="channelDrawerRef?.onOpen(record)">渠道与定价</a-doption>
              <a-doption
                v-if="can(record, 'ADJUST_LIMIT', 'merchant:limit:create')"
                @click="limitAdjustmentModalRef?.onOpen(record)"
              >
                调整限额
              </a-doption>
              <a-doption
                v-if="can(record, 'VIEW_LIMIT_HISTORY', 'merchant:limit:list')"
                @click="limitHistoryDrawerRef?.onOpen(record)"
              >
                限额历史 / 审核
              </a-doption>
              <a-doption
                v-if="can(record, 'CHANGE_LIFECYCLE', 'merchant:merchant:lifecycle')"
                @click="lifecycleModalRef?.onOpen(record)"
              >
                {{ record.status === 'DISABLED' || record.status === 'DRAFT' ? '启用' : '停用' }}
              </a-doption>
            </template>
          </a-dropdown>
        </a-space>
      </template>
    </GiTable>

    <MerchantFormModal ref="formModalRef" @save-success="refresh" />
    <LifecycleModal ref="lifecycleModalRef" @save-success="refresh" />
    <ChannelSummaryDrawer ref="channelDrawerRef" />
    <OnboardingWizard ref="onboardingWizardRef" @submitted="refresh" />
    <LimitAdjustmentModal ref="limitAdjustmentModalRef" @success="refresh" />
    <LimitHistoryDrawer ref="limitHistoryDrawerRef" />
  </GiPageLayout>
</template>

<script setup lang="ts">
import type { TableInstance } from '@arco-design/web-vue'
import dayjs from 'dayjs'
import ChannelSummaryDrawer from './ChannelSummaryDrawer.vue'
import LifecycleModal from './LifecycleModal.vue'
import LimitAdjustmentModal from './LimitAdjustmentModal.vue'
import LimitHistoryDrawer from './LimitHistoryDrawer.vue'
import MerchantFormModal from './MerchantFormModal.vue'
import { channelStatusColor, hasServerAction, merchantStatusMeta, merchantTypeLabel } from './utils'
import OnboardingWizard from '@/views/merchant/onboarding/OnboardingWizard.vue'
import type { MerchantAction, MerchantQuery, MerchantResp } from '@/apis/merchant/merchant'
import { listMerchant } from '@/apis/merchant/merchant'
import { useResetReactive, useTable } from '@/hooks'
import { isMobile } from '@/utils'
import has from '@/utils/has'

defineOptions({ name: 'MerchantMerchant' })

const [queryForm, resetForm] = useResetReactive<MerchantQuery>({})
const onboardingWizardRef = ref<InstanceType<typeof OnboardingWizard>>()
const createdRange = ref<string[]>([])
const toApiDateTime = (value?: string) => value ? dayjs(value).format('YYYY-MM-DDTHH:mm:ss') : undefined
const { tableData: dataList, loading, pagination, search, refresh } = useTable<MerchantResp>((page) => listMerchant({
  ...queryForm,
  createdFrom: toApiDateTime(createdRange.value?.[0]),
  createdTo: toApiDateTime(createdRange.value?.[1]),
  ...page,
}))

const can = (record: MerchantResp, action: MerchantAction, permission: string) => {
  return has.hasPerm(permission) && hasServerAction(record.actions, action)
}
const hasRowMoreAction = (record: MerchantResp) => {
  return can(record, 'START_ONBOARDING', 'merchant:onboarding:create')
    || can(record, 'VIEW', 'merchant:merchant:get')
    || can(record, 'CHANGE_LIFECYCLE', 'merchant:merchant:lifecycle')
    || can(record, 'ADJUST_LIMIT', 'merchant:limit:create')
    || can(record, 'VIEW_LIMIT_HISTORY', 'merchant:limit:list')
}

const columns: TableInstance['columns'] = [
  { title: '商户编号', dataIndex: 'merchantNo', width: 170, fixed: !isMobile() ? 'left' : undefined },
  { title: '商户简称', dataIndex: 'shortName', width: 180, ellipsis: true, tooltip: true, fixed: !isMobile() ? 'left' : undefined },
  { title: '法定主体全称', dataIndex: 'legalName', width: 240, ellipsis: true, tooltip: true },
  { title: '类型', dataIndex: 'merchantType', slotName: 'merchantType', width: 110, align: 'center' },
  { title: '主状态', dataIndex: 'status', slotName: 'status', width: 90, align: 'center' },
  { title: '归属代理商', dataIndex: 'owningAgentName', slotName: 'agent', width: 210 },
  { title: '联系人', dataIndex: 'contactName', width: 130, ellipsis: true, tooltip: true },
  { title: '联系手机', dataIndex: 'contactMobileMasked', width: 150 },
  { title: '双岗位账号', dataIndex: 'operatorUsername', slotName: 'accounts', width: 220 },
  { title: '渠道摘要', dataIndex: 'channels', slotName: 'channels', minWidth: 320 },
  { title: '创建时间', dataIndex: 'createTime', width: 180 },
  {
    title: '操作',
    dataIndex: 'action',
    slotName: 'action',
    width: 190,
    align: 'center',
    fixed: !isMobile() ? 'right' : undefined,
    show: has.hasPermOr(['merchant:merchant:get', 'merchant:merchant:update', 'merchant:merchant:lifecycle', 'merchant:limit:create', 'merchant:limit:list']),
  },
]

const reset = () => {
  resetForm()
  createdRange.value = []
  search()
}

const formModalRef = ref<InstanceType<typeof MerchantFormModal>>()
const lifecycleModalRef = ref<InstanceType<typeof LifecycleModal>>()
const channelDrawerRef = ref<InstanceType<typeof ChannelSummaryDrawer>>()
const limitAdjustmentModalRef = ref<InstanceType<typeof LimitAdjustmentModal>>()
const limitHistoryDrawerRef = ref<InstanceType<typeof LimitHistoryDrawer>>()
</script>

<style scoped>
.filter-control { width: 175px; }
.filter-select { width: 135px; }
.date-filter { width: 360px; }
@media (max-width: 768px) {
  .filter-control,
  .filter-select,
  .date-filter { width: 100%; }
}
</style>
