import http from '@/utils/http'

export interface OperationsWorkbenchMetrics {
  drafts: number
  submitted: number
  pendingReviews: number
  supplementTasks: number
  channelProcessing: number
  succeeded: number
  failed: number
  overdueTasks: number
  businessTimezone: string
  asOfTime: string
}

export function getOperationsWorkbenchMetrics() {
  return http.get<OperationsWorkbenchMetrics>('/merchant/workbench/metrics')
}
