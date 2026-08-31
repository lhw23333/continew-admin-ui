import type { RouteLocationRaw } from 'vue-router'
import type { OperationsMetricValue, OperationsWorkbenchMetrics, WorkbenchAvailability } from '@/apis/merchant/workbench'

export type OperationsMetricKey = 'drafts' | 'submitted' | 'pendingReviews' | 'supplementTasks' | 'channelProcessing' | 'succeeded' | 'failed' | 'overdueTasks'

export function displayMetric(metric?: OperationsMetricValue) {
  return metric?.availability === 'UNAVAILABLE' || metric?.value === undefined ? '--' : String(metric.value)
}

export function displayedAvailability(metrics?: OperationsWorkbenchMetrics, requestFailed = false): WorkbenchAvailability | 'LOADING' {
  if (!metrics) return requestFailed ? 'UNAVAILABLE' : 'LOADING'
  return requestFailed ? 'STALE' : metrics.availability
}

export function metricDrillDown(key: OperationsMetricKey, metric?: OperationsMetricValue): RouteLocationRaw | undefined {
  if (!metric?.value || metric.availability === 'UNAVAILABLE' || !metric.asOfTime) return undefined
  const applicationStatus: Partial<Record<OperationsMetricKey, string>> = {
    drafts: 'DRAFT',
    submitted: 'SUBMITTED',
    channelProcessing: 'CHANNEL_PROCESSING',
    succeeded: 'SUCCEEDED',
    failed: 'FAILED,REJECTED',
  }
  if (applicationStatus[key]) {
    return { path: '/merchant/merchant', query: { applicationStatus: applicationStatus[key], applicationUpdatedTo: metric.asOfTime } }
  }
  if (key === 'supplementTasks') {
    return { path: '/merchant/workflow', query: { tab: 'todo', taskDefinitionKey: 'supplementTask' } }
  }
  if (key === 'pendingReviews') {
    return { path: '/merchant/workflow', query: { tab: 'todo', taskName: 'Review' } }
  }
  return { path: '/merchant/workflow', query: { tab: 'todo', dueBefore: metric.asOfTime } }
}
