import http from '@/utils/http'

export type MetricAvailability = 'AVAILABLE' | 'STALE' | 'UNAVAILABLE'
export type WorkbenchAvailability = 'AVAILABLE' | 'PARTIAL' | 'STALE' | 'UNAVAILABLE'

export interface OperationsMetricValue {
  value?: number
  availability: MetricAvailability
  asOfTime?: string
}

export interface OperationsWorkbenchMetrics {
  drafts: OperationsMetricValue
  submitted: OperationsMetricValue
  pendingReviews: OperationsMetricValue
  supplementTasks: OperationsMetricValue
  channelProcessing: OperationsMetricValue
  succeeded: OperationsMetricValue
  failed: OperationsMetricValue
  overdueTasks: OperationsMetricValue
  availability: WorkbenchAvailability
  businessTimezone: string
  asOfTime: string
}

export function getOperationsWorkbenchMetrics() {
  return http.get<OperationsWorkbenchMetrics>('/merchant/workbench/metrics')
}
