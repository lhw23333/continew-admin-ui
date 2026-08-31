<template>
  <section class="operations-workbench">
    <header class="workbench-header">
      <div>
        <div class="title-row">
          <h2>运营概览</h2>
          <a-tag v-if="availabilityMeta.label" :color="availabilityMeta.color" size="small">{{ availabilityMeta.label }}</a-tag>
        </div>
        <span v-if="metrics" class="as-of">{{ metrics.businessTimezone }} · {{ formatTime(metrics.asOfTime) }}</span>
      </div>
      <a-button type="text" :loading="loading" aria-label="刷新运营指标" @click="load">
        <template #icon><icon-refresh /></template>
      </a-button>
    </header>

    <a-skeleton v-if="loading && !metrics" :animation="true">
      <a-skeleton-line :rows="2" />
    </a-skeleton>
    <a-alert v-else-if="availability === 'UNAVAILABLE'" type="warning">运营指标暂不可用</a-alert>
    <div v-else class="metric-grid">
      <button
        v-for="item in metricItems"
        :key="item.key"
        type="button"
        class="metric-item"
        :class="[`metric-item--${item.tone}`, { 'metric-item--actionable': item.drillDown }]"
        :disabled="!item.drillDown"
        @click="drill(item.drillDown)"
      >
        <span class="metric-label">{{ item.label }}</span>
        <strong>{{ displayMetric(item.metric) }}</strong>
        <span v-if="item.metric?.availability === 'STALE'" class="metric-state">缓存</span>
        <span v-else-if="item.metric?.availability === 'UNAVAILABLE'" class="metric-state">不可用</span>
        <icon-right v-if="item.drillDown" class="drill-icon" />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import dayjs from 'dayjs'
import { useRouter } from 'vue-router'
import { type OperationsMetricKey, displayMetric, displayedAvailability, metricDrillDown } from './operations'
import { type OperationsWorkbenchMetrics, getOperationsWorkbenchMetrics } from '@/apis/merchant/workbench'
import { useTenantStore } from '@/stores'

const tenantStore = useTenantStore()
const router = useRouter()
const metrics = ref<OperationsWorkbenchMetrics>()
const loading = ref(false)
const requestFailed = ref(false)
const availability = computed(() => displayedAvailability(metrics.value, requestFailed.value))
const availabilityMeta = computed(() => ({
  AVAILABLE: { label: '', color: 'green' },
  PARTIAL: { label: '部分不可用', color: 'orange' },
  STALE: { label: '缓存数据', color: 'orange' },
  UNAVAILABLE: { label: '不可用', color: 'red' },
  LOADING: { label: '加载中', color: 'blue' },
})[availability.value])

const metricItems = computed(() => {
  const data = metrics.value
  const items: Array<{ key: OperationsMetricKey, label: string, metric?: OperationsWorkbenchMetrics[OperationsMetricKey], tone: string }> = [
    { key: 'drafts', label: '草稿', metric: data?.drafts, tone: 'neutral' },
    { key: 'submitted', label: '已提交', metric: data?.submitted, tone: 'info' },
    { key: 'pendingReviews', label: '待审核', metric: data?.pendingReviews, tone: 'warning' },
    { key: 'supplementTasks', label: '待补件', metric: data?.supplementTasks, tone: 'warning' },
    { key: 'channelProcessing', label: '渠道处理中', metric: data?.channelProcessing, tone: 'info' },
    { key: 'succeeded', label: '成功', metric: data?.succeeded, tone: 'success' },
    { key: 'failed', label: '失败', metric: data?.failed, tone: 'danger' },
    { key: 'overdueTasks', label: '已逾期', metric: data?.overdueTasks, tone: 'danger' },
  ]
  return items.map((item) => ({ ...item, drillDown: metricDrillDown(item.key, item.metric) }))
})

function formatTime(value: string) {
  return dayjs(value).format('YYYY-MM-DD HH:mm:ss')
}

async function load() {
  if (Number(tenantStore.tenantId) <= 0) return
  if (loading.value) return
  loading.value = true
  try {
    const { data } = await getOperationsWorkbenchMetrics()
    metrics.value = data
    requestFailed.value = false
  } catch {
    requestFailed.value = true
  } finally {
    loading.value = false
  }
}

function drill(target?: ReturnType<typeof metricDrillDown>) {
  if (target) router.push(target)
}

onMounted(load)
</script>

<style scoped>
.operations-workbench { padding: 18px 20px 20px; background: var(--color-bg-2); border-radius: 4px; }
.workbench-header { display: flex; align-items: center; justify-content: space-between; min-height: 34px; margin-bottom: 16px; }
.workbench-header h2 { margin: 0; font-size: 16px; font-weight: 600; }
.title-row { display: flex; align-items: center; gap: 8px; }
.as-of { display: block; margin-top: 4px; color: var(--color-text-3); font-size: 12px; }
.metric-grid { display: grid; grid-template-columns: repeat(4, minmax(120px, 1fr)); border-top: 1px solid var(--color-border-2); border-left: 1px solid var(--color-border-2); }
.metric-item { position: relative; display: grid; min-width: 0; min-height: 92px; align-content: center; gap: 8px; padding: 14px 16px; color: inherit; font: inherit; text-align: left; background: transparent; border: 0; border-right: 1px solid var(--color-border-2); border-bottom: 1px solid var(--color-border-2); }
.metric-item::before { position: absolute; top: 18px; bottom: 18px; left: 0; width: 3px; content: ''; background: var(--color-neutral-4); }
.metric-item--actionable { cursor: pointer; }
.metric-item--actionable:hover { background: var(--color-fill-1); }
.metric-item:disabled { cursor: default; }
.metric-label { color: var(--color-text-2); font-size: 13px; }
.metric-item strong { color: var(--color-text-1); font-size: 24px; line-height: 1; }
.metric-state { position: absolute; right: 12px; bottom: 10px; color: var(--color-text-3); font-size: 11px; }
.drill-icon { position: absolute; right: 12px; top: 14px; color: var(--color-text-3); }
.metric-item--info::before { background: rgb(var(--arcoblue-6)); }
.metric-item--warning::before { background: rgb(var(--warning-6)); }
.metric-item--success::before { background: rgb(var(--success-6)); }
.metric-item--danger::before { background: rgb(var(--danger-6)); }
@media (max-width: 900px) { .metric-grid { grid-template-columns: repeat(2, minmax(120px, 1fr)); } }
@media (max-width: 520px) { .metric-grid { grid-template-columns: 1fr; } }
</style>
