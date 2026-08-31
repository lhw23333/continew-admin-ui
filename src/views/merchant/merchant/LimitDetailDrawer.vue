<template>
  <a-drawer v-model:visible="visible" title="限额调整详情" :width="width >= 980 ? 920 : '100%'" unmount-on-close>
    <a-spin :loading="loading" style="width: 100%">
      <template v-if="detail">
        <a-alert v-if="detail.request.approvalStatus === 'APPROVED' && detail.request.effectiveStatus !== 'EFFECTIVE'" type="warning" class="mb-4">
          人工审批已完成，但渠道尚未确认生效；原限额仍然有效。
        </a-alert>
        <a-descriptions title="申请信息" :column="2" bordered>
          <a-descriptions-item label="申请单号">{{ detail.request.requestNo }}</a-descriptions-item>
          <a-descriptions-item label="渠道 / 平台">{{ detail.request.channelCode }} / {{ detail.request.platformCode }}</a-descriptions-item>
          <a-descriptions-item label="原限额">{{ amount(detail.request.originalLimit) }}</a-descriptions-item>
          <a-descriptions-item label="输入限额">{{ amount(detail.request.requestedLimit) }}</a-descriptions-item>
          <a-descriptions-item label="归一化限额"><strong>{{ amount(detail.request.normalizedLimit) }}</strong></a-descriptions-item>
          <a-descriptions-item label="当前生效限额">{{ amount(detail.request.effectiveLimit) }}</a-descriptions-item>
          <a-descriptions-item label="审批状态"><a-tag :color="approvalColor(detail.request.approvalStatus)">{{ detail.request.approvalStatus }}</a-tag></a-descriptions-item>
          <a-descriptions-item label="渠道状态"><a-tag :color="channelColor(detail.request.channelStatus)">{{ detail.request.channelStatus }}</a-tag></a-descriptions-item>
          <a-descriptions-item label="生效状态"><a-tag :color="detail.request.effectiveStatus === 'EFFECTIVE' ? 'green' : 'orange'">{{ detail.request.effectiveStatus }}</a-tag></a-descriptions-item>
          <a-descriptions-item label="申请时间">{{ detail.request.applicationTime }}</a-descriptions-item>
          <a-descriptions-item label="金额规则版本">{{ detail.request.amountPolicyVersion }}</a-descriptions-item>
          <a-descriptions-item label="渠道配置版本">{{ detail.request.channelConfigVersion }}</a-descriptions-item>
          <a-descriptions-item label="申请原因" :span="2"><span class="pre-wrap">{{ detail.request.reason }}</span></a-descriptions-item>
          <a-descriptions-item v-if="detail.request.opinion" label="审核意见" :span="2"><span class="pre-wrap">{{ detail.request.opinion }}</span></a-descriptions-item>
          <a-descriptions-item v-if="detail.request.channelResultMessage" label="渠道结果" :span="2">
            {{ detail.request.channelResultCode || '-' }} · {{ detail.request.channelResultMessage }}
          </a-descriptions-item>
        </a-descriptions>

        <a-card v-if="detail.currentTask" title="当前任务" class="mt-4">
          <a-descriptions :column="2" bordered size="small">
            <a-descriptions-item label="任务名称">{{ detail.currentTask.taskName }}</a-descriptions-item>
            <a-descriptions-item label="任务状态">{{ detail.currentTask.state }}</a-descriptions-item>
            <a-descriptions-item label="处理人">{{ detail.currentTask.assignee || '待认领' }}</a-descriptions-item>
            <a-descriptions-item label="接收时间">{{ detail.currentTask.createTime }}</a-descriptions-item>
          </a-descriptions>
          <a-space class="mt-4">
            <a-button
              v-if="detail.currentTask.state === 'TODO'"
              v-permission="['workflow:task:claim']"
              type="primary"
              @click="claim"
            >
              认领任务
            </a-button>
            <a-button
              v-if="detail.currentTask.state === 'CLAIMED' && detail.currentTask.taskDefinitionKey === 'limitReviewTask'"
              v-permission="['workflow:task:review']"
              type="primary"
              @click="reviewModalRef?.onOpen(merchantId, detail)"
            >
              审核
            </a-button>
            <a-popconfirm
              v-if="detail.currentTask.state === 'CLAIMED' && ['channelSubmitTask', 'channelQueryTask'].includes(detail.currentTask.taskDefinitionKey)"
              content="确认执行本次渠道提交或状态查询？非幂等提交发生不确定结果后不会盲目重试。"
              @ok="executeChannel"
            >
              <a-button v-permission="['workflow:task:review']" type="primary" :loading="executing">
                {{ detail.currentTask.taskDefinitionKey === 'channelSubmitTask' ? '提交渠道' : '查询渠道状态' }}
              </a-button>
            </a-popconfirm>
          </a-space>
        </a-card>

        <a-tabs class="mt-4">
          <a-tab-pane key="domain" title="领域历史">
            <a-timeline v-if="detail.history.length">
              <a-timeline-item v-for="item in detail.history" :key="item.id" :label="item.occurredTime">
                <strong>{{ actionLabel(item.action) }}</strong>
                <div class="history-state">{{ item.approvalStatus }} / {{ item.channelStatus }} / {{ item.effectiveStatus }}</div>
                <div v-if="item.opinion" class="pre-wrap">{{ item.opinion }}</div>
              </a-timeline-item>
            </a-timeline>
            <a-empty v-else description="暂无领域历史" />
          </a-tab-pane>
          <a-tab-pane key="workflow" title="流程历史">
            <a-button v-if="detail.request.processInstanceId && !workflowHistory" :loading="workflowLoading" @click="loadWorkflowHistory">
              加载流程历史
            </a-button>
            <a-timeline v-if="workflowHistory?.activities.length" class="mt-4">
              <a-timeline-item v-for="item in workflowHistory.activities" :key="`${item.activityId}-${item.startTime}`" :label="item.startTime">
                <strong>{{ item.activityName || item.activityId }}</strong>
                <div>{{ item.activityType }} · {{ item.assignee || '系统' }}</div>
              </a-timeline-item>
            </a-timeline>
            <a-empty v-else-if="workflowHistory" description="暂无流程活动" />
          </a-tab-pane>
        </a-tabs>
      </template>
    </a-spin>
    <LimitReviewModal ref="reviewModalRef" @success="actionSuccess" />
  </a-drawer>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import LimitReviewModal from './LimitReviewModal.vue'
import type { LimitAdjustmentDetail } from '@/apis/merchant/limit'
import { executeLimitChannelTask, getLimitAdjustment, getLimitWorkflowHistory } from '@/apis/merchant/limit'
import type { WorkflowProcessHistory } from '@/apis/merchant/workflow'
import { claimWorkflowTask } from '@/apis/merchant/workflow'

const emit = defineEmits<{ success: [] }>()
const { width } = useWindowSize()
const visible = ref(false)
const loading = ref(false)
const executing = ref(false)
const workflowLoading = ref(false)
const merchantId = ref('')
const requestId = ref('')
const detail = ref<LimitAdjustmentDetail>()
const workflowHistory = ref<WorkflowProcessHistory>()
const reviewModalRef = ref<InstanceType<typeof LimitReviewModal>>()

const amount = (value?: number) => value == null ? '-' : Number(value).toFixed(2)
const approvalColor = (status: string) => status === 'APPROVED' ? 'green' : status === 'REJECTED' ? 'red' : 'orange'
const channelColor = (status: string) => status === 'SUCCEEDED' ? 'green' : ['FAILED', 'REJECTED'].includes(status) ? 'red' : 'blue'
const actionLabel = (action: string) => ({
  CREATE: '创建申请',
  WORKFLOW_STARTED: '流程已启动',
  APPROVE: '人工审批通过',
  REJECT: '人工审批拒绝',
  CHANNEL_SUBMIT: '已提交渠道',
  CHANNEL_QUERY: '查询渠道状态',
  CHANNEL_EFFECTIVE: '渠道确认生效',
  CHANNEL_FAILED: '渠道处理失败',
}[action] || action)

async function onOpen(targetMerchantId: string, targetRequestId: string) {
  merchantId.value = targetMerchantId
  requestId.value = targetRequestId
  workflowHistory.value = undefined
  visible.value = true
  await load()
}

async function load() {
  loading.value = true
  try {
    detail.value = (await getLimitAdjustment(merchantId.value, requestId.value)).data
  } finally {
    loading.value = false
  }
}

async function claim() {
  if (!detail.value?.currentTask) return
  await claimWorkflowTask(detail.value.currentTask.taskId)
  Message.success('任务已认领')
  await actionSuccess()
}

async function executeChannel() {
  const value = detail.value
  if (!value?.currentTask || !value.workflowBusinessVersion) return
  executing.value = true
  try {
    await executeLimitChannelTask(merchantId.value, value.request.id, value.currentTask.taskId, value.workflowBusinessVersion)
    Message.success('渠道任务已执行')
    await actionSuccess()
  } finally {
    executing.value = false
  }
}

async function loadWorkflowHistory() {
  workflowLoading.value = true
  try {
    workflowHistory.value = (await getLimitWorkflowHistory(merchantId.value, requestId.value)).data
  } finally {
    workflowLoading.value = false
  }
}

async function actionSuccess() {
  emit('success')
  workflowHistory.value = undefined
  await load()
}

defineExpose({ onOpen })
</script>

<style scoped>
.mb-4 { margin-bottom: 16px; }
.mt-4 { margin-top: 16px; }
.pre-wrap { white-space: pre-wrap; word-break: break-word; }
.history-state { margin: 4px 0; color: var(--color-text-3); }
</style>
