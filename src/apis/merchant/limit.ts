import type { WorkflowProcessHistory, WorkflowTask } from './workflow'
import http from '@/utils/http'

export type LimitApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'
export type LimitChannelStatus = 'NOT_SUBMITTED' | 'SUBMITTED' | 'PROCESSING' | 'SUCCEEDED' | 'REJECTED' | 'FAILED' | 'UNCERTAIN'
export type LimitEffectiveStatus = 'NOT_EFFECTIVE' | 'EFFECTIVE'
export type LimitReviewAction = 'APPROVE' | 'REJECT'

export interface LimitAdjustmentSummary {
  id: string
  requestNo: string
  merchantId: string
  channelCode: string
  platformCode: string
  currency: string
  originalLimit: number
  requestedLimit: number
  normalizedLimit: number
  effectiveLimit?: number
  reason: string
  eligibilityVersion: string
  channelConfigVersion: string
  amountPolicyVersion: string
  processInstanceId?: string
  approvalStatus: LimitApprovalStatus
  channelStatus: LimitChannelStatus
  effectiveStatus: LimitEffectiveStatus
  applicantId: string
  applicationTime: string
  approvalTime?: string
  effectiveTime?: string
  opinion?: string
  channelResultCode?: string
  channelResultMessage?: string
  rowVersion: number
  createTime: string
  updateTime?: string
}

export interface LimitAdjustmentHistory {
  id: string
  tenantId: string
  requestId: string
  requestVersion: number
  action: string
  approvalStatus: LimitApprovalStatus
  channelStatus: LimitChannelStatus
  effectiveStatus: LimitEffectiveStatus
  originalLimit: number
  requestedLimit: number
  normalizedLimit: number
  effectiveLimit?: number
  amountPolicyVersion: string
  actorUserId: string
  opinion?: string
  channelResultCode?: string
  channelResultMessage?: string
  occurredTime: string
}

export interface LimitAdjustmentDetail {
  request: LimitAdjustmentSummary
  history: LimitAdjustmentHistory[]
  workflowBusinessVersion?: number
  currentTask?: WorkflowTask
}

export interface LimitAdjustmentPage {
  list: LimitAdjustmentSummary[]
  total: number
  page: number
  size: number
}

export interface LimitAdjustmentQuery {
  requestNo?: string
  channelCode?: string
  platformCode?: string
  approvalStatus?: LimitApprovalStatus
  channelStatus?: LimitChannelStatus
  effectiveStatus?: LimitEffectiveStatus
  appliedFrom?: string
  appliedTo?: string
  page?: number
  size?: number
}

export interface LimitAdjustmentPreviewReq {
  channelCode: string
  platformCode: string
  currency: string
  requestedLimit: number
}

export interface LimitAdjustmentPreview {
  merchantId: string
  channelCode: string
  platformCode: string
  currency: string
  requestedLimit: number
  normalizedLimit: number
  changed: boolean
  minimumLimit: number
  maximumLimit: number
  currencyScale: number
  roundingUnit: number
  roundingMode: string
  policyVersion: string
}

export interface LimitAdjustmentConfirmReq extends LimitAdjustmentPreviewReq {
  confirmedNormalizedLimit: number
  confirmedPolicyVersion: string
  reason: string
}

export interface LimitAdjustmentCreateResult {
  request: LimitAdjustmentSummary
  created: boolean
}

const baseUrl = (merchantId: string) => `/merchant/merchants/${merchantId}/limit-adjustments`

export const listLimitAdjustments = (merchantId: string, query: LimitAdjustmentQuery) => http.get<LimitAdjustmentPage>(baseUrl(merchantId), query)
export const getLimitAdjustment = (merchantId: string, requestId: string) => http.get<LimitAdjustmentDetail>(`${baseUrl(merchantId)}/${requestId}`)
export const getLimitAdjustmentHistory = (merchantId: string, requestId: string) => http.get<LimitAdjustmentHistory[]>(`${baseUrl(merchantId)}/${requestId}/history`)
export const getLimitWorkflowHistory = (merchantId: string, requestId: string) => http.get<WorkflowProcessHistory>(`${baseUrl(merchantId)}/${requestId}/workflow-history`)
export const previewLimitAdjustment = (merchantId: string, data: LimitAdjustmentPreviewReq) => http.post<LimitAdjustmentPreview>(`${baseUrl(merchantId)}/preview`, data)
export const createLimitAdjustment = (merchantId: string, data: LimitAdjustmentConfirmReq) => http.post<LimitAdjustmentCreateResult>(baseUrl(merchantId), data)
export const reviewLimitAdjustment = (merchantId: string, requestId: string, taskId: string, businessVersion: number, action: LimitReviewAction, opinion?: string) => http.post(`${baseUrl(merchantId)}/${requestId}/tasks/${taskId}/review`, {
  businessVersion,
  action,
  opinion,
})
export const executeLimitChannelTask = (merchantId: string, requestId: string, taskId: string, businessVersion: number, traceId?: string) => http.post(`${baseUrl(merchantId)}/${requestId}/tasks/${taskId}/execute-channel`, {
  businessVersion,
  traceId,
})
