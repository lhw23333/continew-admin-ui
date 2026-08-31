<template>
  <a-drawer v-model:visible="visible" title="审核任务详情" :width="width >= 980 ? 920 : '100%'" unmount-on-close>
    <a-spin :loading="loading" style="width: 100%">
      <template v-if="detail">
        <a-descriptions title="任务信息" :column="2" bordered>
          <a-descriptions-item label="任务名称">{{ detail.task.taskName }}</a-descriptions-item>
          <a-descriptions-item label="任务状态"><a-tag :color="taskStateMeta(detail.task.state).color">{{ taskStateMeta(detail.task.state).label }}</a-tag></a-descriptions-item>
          <a-descriptions-item label="任务节点">{{ detail.task.taskDefinitionKey }}</a-descriptions-item>
          <a-descriptions-item label="流程版本">v{{ detail.task.processDefinitionVersion }}</a-descriptions-item>
          <a-descriptions-item label="接收时间">{{ detail.task.createTime }}</a-descriptions-item>
          <a-descriptions-item label="到期时间"><span :class="{ overdue: isOverdue(detail.task) }">{{ detail.task.dueTime || '-' }}</span></a-descriptions-item>
        </a-descriptions>

        <a-tabs default-active-key="business" class="detail-tabs">
          <a-tab-pane key="business" title="业务摘要">
            <a-descriptions :column="2" bordered>
              <a-descriptions-item label="进件编号">{{ detail.business.applicationNo }}</a-descriptions-item>
              <a-descriptions-item label="业务版本">{{ detail.business.businessVersion }}</a-descriptions-item>
              <a-descriptions-item label="商户">{{ detail.business.merchantShortName }}（{{ detail.business.merchantNo }}）</a-descriptions-item>
              <a-descriptions-item label="法定主体">{{ detail.business.legalName }}</a-descriptions-item>
              <a-descriptions-item label="主体标识">{{ detail.business.legalIdentifierMasked || '-' }}</a-descriptions-item>
              <a-descriptions-item label="联系电话">{{ detail.business.contactMobileMasked || '-' }}</a-descriptions-item>
              <a-descriptions-item label="渠道产品">{{ detail.business.channelCode }} / {{ detail.business.productCode }}</a-descriptions-item>
              <a-descriptions-item label="进件状态">{{ detail.business.applicationStatus }}</a-descriptions-item>
              <a-descriptions-item label="KYC 版本">{{ detail.business.kycVersionNo }}（{{ detail.business.kycVersionId }}）</a-descriptions-item>
              <a-descriptions-item label="归属代理商">{{ detail.business.owningAgentId }}</a-descriptions-item>
            </a-descriptions>
          </a-tab-pane>
          <a-tab-pane key="diff" title="补件差异">
            <a-empty v-if="!detail.supplementDiff" description="当前不是补件版本" />
            <template v-else>
              <a-alert>仅展示字段类别和附件/平台变更，不展示敏感明文。</a-alert>
              <a-descriptions :column="1" bordered class="mt-4">
                <a-descriptions-item label="字段变化"><a-space wrap><a-tag v-for="field in detail.supplementDiff.changedFields" :key="field">{{ field }}</a-tag><span v-if="!detail.supplementDiff.changedFields.length">无</span></a-space></a-descriptions-item>
                <a-descriptions-item label="附件变化"><div v-for="item in detail.supplementDiff.attachmentChanges" :key="`${item.evidenceType}-${item.originalName}-${item.changeType}`">{{ item.changeType }} · {{ item.evidenceType }} · {{ item.originalName }}</div><span v-if="!detail.supplementDiff.attachmentChanges.length">无</span></a-descriptions-item>
                <a-descriptions-item label="平台变化"><div v-for="item in detail.supplementDiff.platformChanges" :key="`${item.platformCode}-${item.storeIdentifier}-${item.changeType}`">{{ item.changeType }} · {{ item.platformCode }} · {{ item.storeIdentifier }}</div><span v-if="!detail.supplementDiff.platformChanges.length">无</span></a-descriptions-item>
              </a-descriptions>
            </template>
          </a-tab-pane>
          <a-tab-pane key="reviews" title="审核记录">
            <a-timeline v-if="detail.reviews.length">
              <a-timeline-item v-for="item in detail.reviews" :key="item.id" :label="item.decisionTime">
                <strong>{{ reviewActionLabel(item.action) }}</strong> · {{ item.reviewerId || item.reviewType }}
                <div v-if="item.opinion" class="record-opinion">{{ item.opinion }}</div>
                <a-space v-if="item.issueCodes.length" wrap><a-tag v-for="code in item.issueCodes" :key="code" color="orange">{{ code }}</a-tag></a-space>
              </a-timeline-item>
            </a-timeline>
            <a-empty v-else description="暂无审核记录" />
          </a-tab-pane>
          <a-tab-pane key="history" title="流程历史">
            <a-timeline v-if="history?.activities.length">
              <a-timeline-item v-for="item in history.activities" :key="`${item.activityId}-${item.startTime}`" :label="item.startTime">
                <strong>{{ item.activityName || item.activityId }}</strong>
                <div>{{ item.activityType }}<span v-if="item.assignee"> · {{ item.assignee }}</span></div>
              </a-timeline-item>
            </a-timeline>
            <a-empty v-else description="暂无流程历史" />
          </a-tab-pane>
        </a-tabs>
      </template>
    </a-spin>
    <template #footer>
      <a-space v-if="detail">
        <a-button v-if="canClaim" v-permission="['workflow:task:claim']" type="primary" @click="claim">认领</a-button>
        <a-button v-if="detail.task.state === 'CLAIMED' && detail.task.taskDefinitionKey !== 'supplementTask'" v-permission="['workflow:task:claim']" @click="unclaim">取消认领</a-button>
        <a-button v-if="availableReviewActions(detail.task).length" v-permission="['workflow:task:review']" type="primary" @click="reviewModalRef?.onOpen(detail)">审核</a-button>
        <a-button v-if="['reviewTask', 'escalatedReviewTask'].includes(detail.task.taskDefinitionKey) && detail.task.state === 'CLAIMED'" v-permission="['workflow:task:transfer']" @click="transferModalRef?.onOpen(detail)">转派</a-button>
      </a-space>
    </template>
  </a-drawer>
  <ReviewActionModal ref="reviewModalRef" @success="actionSuccess" />
  <TransferModal ref="transferModalRef" @success="actionSuccess" />
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import ReviewActionModal from './ReviewActionModal.vue'
import TransferModal from './TransferModal.vue'
import { availableReviewActions, canClaimTask, isOverdue, reviewActionLabel, taskStateMeta } from './utils'
import type { WorkflowProcessHistory, WorkflowTaskDetail, WorkflowTaskView } from '@/apis/merchant/workflow'
import { claimWorkflowTask, getWorkflowHistory, getWorkflowTask, unclaimWorkflowTask } from '@/apis/merchant/workflow'
import { useUserStore } from '@/stores'

const emit = defineEmits<{ success: [] }>()
const { width } = useWindowSize()
const userStore = useUserStore()
const visible = ref(false)
const loading = ref(false)
const taskId = ref('')
const detail = ref<WorkflowTaskDetail>()
const history = ref<WorkflowProcessHistory>()
const reviewModalRef = ref<InstanceType<typeof ReviewActionModal>>()
const transferModalRef = ref<InstanceType<typeof TransferModal>>()
const canClaim = computed(() => !!detail.value && canClaimTask(
  detail.value.task,
  detail.value.business.applicantUserId,
  userStore.userInfo.id,
))

async function load() {
  loading.value = true
  try {
    const detailRes = await getWorkflowTask(taskId.value)
    detail.value = detailRes.data
    const historyRes = await getWorkflowHistory(detailRes.data.task.processInstanceId)
    history.value = historyRes.data
  } finally {
    loading.value = false
  }
}

async function onOpen(row: WorkflowTaskView) {
  taskId.value = row.task.taskId
  visible.value = true
  await load()
}

async function onOpenTaskId(id: string) {
  taskId.value = id
  visible.value = true
  await load()
}

async function claim() {
  await claimWorkflowTask(taskId.value)
  Message.success('任务已认领')
  await actionSuccess()
}

async function unclaim() {
  await unclaimWorkflowTask(taskId.value)
  Message.success('已取消认领')
  await actionSuccess()
}

async function actionSuccess() {
  emit('success')
  try {
    await load()
  } catch {
    visible.value = false
  }
}

defineExpose({ onOpen, onOpenTaskId })
</script>

<style scoped>
.detail-tabs { margin-top: 20px; }
.overdue { color: rgb(var(--danger-6)); font-weight: 600; }
.record-opinion { margin: 6px 0; color: var(--color-text-2); white-space: pre-wrap; }
.mt-4 { margin-top: 16px; }
.mb-4 { margin-bottom: 16px; }
</style>
