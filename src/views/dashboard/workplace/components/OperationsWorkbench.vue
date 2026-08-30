<template>
  <section class="operations-workbench">
    <header class="workbench-header">
      <div>
        <h2>运营概览</h2>
        <span v-if="metrics" class="as-of">{{ metrics.businessTimezone }} · {{ formatTime(metrics.asOfTime) }}</span>
      </div>
      <a-button type="text" :loading="loading" aria-label="刷新运营指标" @click="load">
        <template #icon><icon-refresh /></template>
      </a-button>
    </header>

    <a-skeleton v-if="loading && !metrics" :animation="true">
      <a-skeleton-line :rows="2" />
    </a-skeleton>
    <a-alert v-else-if="unavailable" type="warning">运营指标暂不可用</a-alert>
    <div v-else class="metric-grid">
      <div v-for="item in metricItems" :key="item.key" class="metric-item" :class="`metric-item--${item.tone}`">
        <span class="metric-label">{{ item.label }}</span>
        <strong>{{ item.value }}</strong>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { type OperationsWorkbenchMetrics, getOperationsWorkbenchMetrics } from '@/apis/merchant/workbench'
import { useTenantStore } from '@/stores'

const tenantStore = useTenantStore()
const metrics = ref<OperationsWorkbenchMetrics>()
const loading = ref(false)
const unavailable = ref(false)

const metricItems = computed(() => {
  const data = metrics.value
  return [
    { key: 'drafts', label: '草稿', value: data?.drafts ?? 0, tone: 'neutral' },
    { key: 'submitted', label: '已提交', value: data?.submitted ?? 0, tone: 'info' },
    { key: 'pendingReviews', label: '待审核', value: data?.pendingReviews ?? 0, tone: 'warning' },
    { key: 'supplementTasks', label: '待补件', value: data?.supplementTasks ?? 0, tone: 'warning' },
    { key: 'channelProcessing', label: '渠道处理中', value: data?.channelProcessing ?? 0, tone: 'info' },
    { key: 'succeeded', label: '成功', value: data?.succeeded ?? 0, tone: 'success' },
    { key: 'failed', label: '失败', value: data?.failed ?? 0, tone: 'danger' },
    { key: 'overdueTasks', label: '已逾期', value: data?.overdueTasks ?? 0, tone: 'danger' },
  ]
})

function formatTime(value: string) {
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss')
}

async function load() {
  if (Number(tenantStore.tenantId) <= 0) return
  loading.value = true
  unavailable.value = false
  try {
    const { data } = await getOperationsWorkbenchMetrics()
    metrics.value = data
  } catch {
    unavailable.value = true
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.operations-workbench { padding: 18px 20px 20px; background: var(--color-bg-2); border-radius: 4px; }
.workbench-header { display: flex; align-items: center; justify-content: space-between; min-height: 34px; margin-bottom: 16px; }
.workbench-header h2 { margin: 0; font-size: 16px; font-weight: 600; }
.as-of { display: block; margin-top: 4px; color: var(--color-text-3); font-size: 12px; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); border-top: 1px solid var(--color-border-2); border-left: 1px solid var(--color-border-2); }
.metric-item { position: relative; display: grid; min-height: 92px; align-content: center; gap: 8px; padding: 14px 16px; border-right: 1px solid var(--color-border-2); border-bottom: 1px solid var(--color-border-2); }
.metric-item::before { position: absolute; top: 18px; bottom: 18px; left: 0; width: 3px; content: ''; background: var(--color-neutral-4); }
.metric-label { color: var(--color-text-2); font-size: 13px; }
.metric-item strong { color: var(--color-text-1); font-size: 24px; line-height: 1; }
.metric-item--info::before { background: rgb(var(--arcoblue-6)); }
.metric-item--warning::before { background: rgb(var(--warning-6)); }
.metric-item--success::before { background: rgb(var(--success-6)); }
.metric-item--danger::before { background: rgb(var(--danger-6)); }
@media (max-width: 900px) { .metric-grid { grid-template-columns: repeat(2, minmax(120px, 1fr)); } }
@media (max-width: 520px) { .metric-grid { grid-template-columns: 1fr; } }
</style>
