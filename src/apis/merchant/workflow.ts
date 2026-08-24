import http from '@/utils/http'

const BASE_URL = '/workflow/tasks'
export const ONBOARDING_PROCESS_KEY = 'merchant-onboarding-review-v1'

export type WorkflowTaskState = 'TODO' | 'CLAIMED' | 'DONE'
export type ReviewAction = 'APPROVE' | 'REJECT' | 'REQUEST_SUPPLEMENT' | 'RESUBMIT'

export interface WorkflowTask {
  taskId: string
  taskDefinitionKey: string
  taskName: string
  processInstanceId: string
  processDefinitionId: string
  processDefinitionKey: string
  processDefinitionVersion: number
  businessKey: string
  tenantId: string
  assignee?: string
  state: WorkflowTaskState
  createTime: string
  claimTime?: string
  dueTime?: string
  endTime?: string
}

export interface WorkflowTaskBusinessSummary {
  applicationId: string
  applicationNo: string
  businessVersion: number
  merchantId: string
  merchantNo: string
  merchantShortName: string
  legalName: string
  legalIdentifierMasked?: string
  contactMobileMasked?: string
  owningAgentId: string
  channelCode: string
  productCode: string
  applicationStatus: string
  kycVersionId: string
  kycVersionNo: number
  previousKycVersionId?: string
}

export interface WorkflowTaskView {
  task: WorkflowTask
  business: WorkflowTaskBusinessSummary
}

export interface AttachmentChange { evidenceType: string, originalName: string, changeType: string }
export interface PlatformChange { platformCode: string, storeIdentifier: string, changeType: string }

export interface SupplementDiff {
  previousKycVersionId: string
  currentKycVersionId: string
  changedFields: string[]
  attachmentChanges: AttachmentChange[]
  platformChanges: PlatformChange[]
}

export interface WorkflowReviewHistoryItem {
  id: string
  reviewType: string
  reviewerId?: string
  action: string
  opinion?: string
  issueCodes: string[]
  modelVersion?: string
  evidenceSummary?: string
  decisionTime: string
}

export interface WorkflowTaskDetail {
  task: WorkflowTask
  business: WorkflowTaskBusinessSummary
  supplementDiff?: SupplementDiff
  reviews: WorkflowReviewHistoryItem[]
}

export interface WorkflowActivityHistory {
  activityId: string
  activityName?: string
  activityType: string
  assignee?: string
  startTime: string
  endTime?: string
  durationMillis?: number
}

export interface WorkflowProcessHistory {
  processInstanceId: string
  businessKey: string
  processDefinitionId: string
  processDefinitionKey: string
  processDefinitionVersion: number
  tenantId: string
  startTime: string
  endTime?: string
  ended: boolean
  activities: WorkflowActivityHistory[]
  tasks: WorkflowTask[]
}

export interface WorkflowTaskQuery {
  processDefinitionKey?: string
  businessKey?: string
  taskName?: string
  page?: number
  size?: number
}

export interface ReviewActionReq {
  businessVersion: number
  action: ReviewAction
  opinion?: string
  issueCodes?: string[]
}

function list(path: 'todo' | 'claimed' | 'done', query: WorkflowTaskQuery) {
  return http.get<PageRes<WorkflowTaskView[]>>(`${BASE_URL}/${path}`, {
    processDefinitionKey: ONBOARDING_PROCESS_KEY,
    ...query,
  })
}

export const listTodoTasks = (query: WorkflowTaskQuery) => list('todo', query)
export const listClaimedTasks = (query: WorkflowTaskQuery) => list('claimed', query)
export const listDoneTasks = (query: WorkflowTaskQuery) => list('done', query)
export const getWorkflowTask = (taskId: string) => http.get<WorkflowTaskDetail>(`${BASE_URL}/${taskId}`)
export const getWorkflowHistory = (processInstanceId: string) => http.get<WorkflowProcessHistory>(`${BASE_URL}/processes/${processInstanceId}/history`)
export const claimWorkflowTask = (taskId: string) => http.post<void>(`${BASE_URL}/${taskId}/claim`)
export const unclaimWorkflowTask = (taskId: string) => http.post<void>(`${BASE_URL}/${taskId}/unclaim`)
export const reviewWorkflowTask = (taskId: string, data: ReviewActionReq) => http.post(`${BASE_URL}/${taskId}/actions`, data)
export const transferWorkflowTask = (taskId: string, targetUserId: string, businessVersion: number, reason: string) => http.post(`${BASE_URL}/${taskId}/transfer`, {
  targetUserId,
  businessVersion,
  reason,
})
