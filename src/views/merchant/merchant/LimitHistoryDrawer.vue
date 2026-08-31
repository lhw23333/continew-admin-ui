<template>
  <a-drawer v-model:visible="visible" title="限额调整历史" :width="width >= 1180 ? 1120 : '100%'" unmount-on-close>
    <a-descriptions v-if="merchant" :column="2" bordered size="small" class="mb-4">
      <a-descriptions-item label="商户">{{ merchant.shortName }}（{{ merchant.merchantNo }}）</a-descriptions-item>
      <a-descriptions-item label="归属代理商">{{ merchant.owningAgentName || merchant.owningAgentId }}</a-descriptions-item>
    </a-descriptions>
    <GiTable
      row-key="id"
      :data="dataList"
      :columns="columns"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ x: '100%', minWidth: 1500 }"
      @refresh="refresh"
    >
      <template #toolbar-left>
        <a-space wrap>
          <a-input v-model="queryForm.requestNo" placeholder="申请单号" allow-clear style="width: 190px" />
          <a-input v-model="queryForm.channelCode" placeholder="渠道" allow-clear style="width: 130px" />
          <a-input v-model="queryForm.platformCode" placeholder="平台" allow-clear style="width: 130px" />
          <a-select v-model="queryForm.approvalStatus" placeholder="审批状态" allow-clear style="width: 130px">
            <a-option value="PENDING">待审批</a-option>
            <a-option value="APPROVED">已通过</a-option>
            <a-option value="REJECTED">已拒绝</a-option>
          </a-select>
          <a-select v-model="queryForm.channelStatus" placeholder="渠道状态" allow-clear style="width: 140px">
            <a-option value="NOT_SUBMITTED">未提交</a-option>
            <a-option value="SUBMITTED">已提交</a-option>
            <a-option value="PROCESSING">处理中</a-option>
            <a-option value="UNCERTAIN">结果不确定</a-option>
            <a-option value="SUCCEEDED">成功</a-option>
            <a-option value="FAILED">失败</a-option>
            <a-option value="REJECTED">渠道拒绝</a-option>
          </a-select>
          <a-button type="primary" @click="search">查询</a-button>
          <a-button @click="reset">重置</a-button>
        </a-space>
      </template>
      <template #amounts="{ record }">
        <div>原：{{ amount(record.originalLimit) }}</div>
        <div>申请：{{ amount(record.requestedLimit) }}</div>
        <strong>目标：{{ amount(record.normalizedLimit) }}</strong>
      </template>
      <template #approval="{ record }">
        <a-tag :color="approvalColor(record.approvalStatus)">{{ record.approvalStatus }}</a-tag>
      </template>
      <template #channel="{ record }">
        <a-tag :color="channelColor(record.channelStatus)">{{ record.channelStatus }}</a-tag>
      </template>
      <template #effective="{ record }">
        <a-tag :color="record.effectiveStatus === 'EFFECTIVE' ? 'green' : 'orange'">{{ record.effectiveStatus }}</a-tag>
      </template>
      <template #action="{ record }">
        <a-link v-permission="['merchant:limit:list']" @click="detailDrawerRef?.onOpen(merchantId, record.id)">详情 / 审核</a-link>
      </template>
    </GiTable>
    <LimitDetailDrawer ref="detailDrawerRef" @success="refresh" />
  </a-drawer>
</template>

<script setup lang="ts">
import type { TableInstance } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import LimitDetailDrawer from './LimitDetailDrawer.vue'
import type { LimitAdjustmentQuery, LimitAdjustmentSummary } from '@/apis/merchant/limit'
import { listLimitAdjustments } from '@/apis/merchant/limit'
import type { MerchantResp } from '@/apis/merchant/merchant'
import { useResetReactive, useTable } from '@/hooks'

const { width } = useWindowSize()
const visible = ref(false)
const merchant = ref<MerchantResp>()
const merchantId = ref('')
const [queryForm, resetForm] = useResetReactive<LimitAdjustmentQuery>({})
const { tableData: dataList, loading, pagination, search, refresh } = useTable<LimitAdjustmentSummary>(
  (page) => listLimitAdjustments(merchantId.value, { ...queryForm, ...page }),
  { immediate: false },
)

const amount = (value?: number) => value == null ? '-' : Number(value).toFixed(2)
const approvalColor = (status: string) => status === 'APPROVED' ? 'green' : status === 'REJECTED' ? 'red' : 'orange'
const channelColor = (status: string) => status === 'SUCCEEDED' ? 'green' : ['FAILED', 'REJECTED'].includes(status) ? 'red' : status === 'UNCERTAIN' ? 'orange' : 'blue'

const columns: TableInstance['columns'] = [
  { title: '申请单号', dataIndex: 'requestNo', width: 190, fixed: 'left' },
  { title: '渠道 / 平台', dataIndex: 'channelCode', width: 170, render: ({ record }) => `${record.channelCode} / ${record.platformCode}` },
  { title: '限额', slotName: 'amounts', width: 190 },
  { title: '审批', slotName: 'approval', width: 110, align: 'center' },
  { title: '渠道', slotName: 'channel', width: 130, align: 'center' },
  { title: '生效', slotName: 'effective', width: 130, align: 'center' },
  { title: '申请时间', dataIndex: 'applicationTime', width: 180 },
  { title: '审批时间', dataIndex: 'approvalTime', width: 180 },
  { title: '生效时间', dataIndex: 'effectiveTime', width: 180 },
  { title: '操作', slotName: 'action', width: 120, fixed: 'right' },
]

function onOpen(record: MerchantResp) {
  merchant.value = record
  merchantId.value = record.id
  resetForm()
  visible.value = true
  search()
}

function reset() {
  resetForm()
  search()
}

const detailDrawerRef = ref<InstanceType<typeof LimitDetailDrawer>>()
defineExpose({ onOpen })
</script>

<style scoped>
.mb-4 { margin-bottom: 16px; }
</style>
