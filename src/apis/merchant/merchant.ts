import http from '@/utils/http'

const BASE_URL = '/merchant/merchants'

export type MerchantStatus = 'DRAFT' | 'ENABLED' | 'DISABLED'
export type MerchantType = 'ENTERPRISE' | 'INDIVIDUAL'
export type MerchantAction =
  | 'VIEW'
  | 'EDIT_PROFILE'
  | 'START_ONBOARDING'
  | 'CHANGE_LIFECYCLE'
  | 'REQUEST_REVERIFICATION'
  | 'ADJUST_LIMIT'
  | 'VIEW_LIMIT_HISTORY'

export interface MerchantPricingRules {
  percentageCost: number
  fixedFee: number
  profitShareRatio: number
}

export interface MerchantPricingSummary {
  pricingVersionId: string
  agentId: string
  parentPricingVersionId?: string
  versionNo: number
  channelCode: string
  productCode: string
  currency: string
  rules: MerchantPricingRules
  effectiveTime: string
  expiresTime?: string
  status: 'PUBLISHED'
}

export interface MerchantChannelSummary {
  merchantId: string
  applicationId: string
  applicationNo: string
  channelCode: string
  requirementVersion: string
  channelConfigVersion?: string
  kycVersionId?: string
  applicationStatus: string
  reportingStatus: string
  agreementStatus: string
  cardBindingStatus: string
  reserveAccountStatus: string
  channelFinalStatus: string
  rawChannelStatus?: string
  pricing?: MerchantPricingSummary
  submittedTime?: string
  completedTime?: string
  createTime: string
}

export interface OnboardingChannelExecutionResult {
  applicationId: string
  businessSerial: string
  channelRequestId?: string
  operationStatus: 'ACCEPTED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'REJECTED' | 'UNCERTAIN'
  state: {
    reportingStatus: string
    signingStatus: string
    cardBindingStatus: string
    reserveAccountStatus: string
    finalStatus: string
  }
  finalTerminal: boolean
  safeMessage?: string
  resultTime: string
}

export interface MerchantResp {
  id: string
  merchantNo: string
  merchantType: MerchantType
  legalName: string
  shortName: string
  legalRepresentativeName?: string
  operatorUsername?: string
  reviewerUsername?: string
  contactName?: string
  contactMobileMasked?: string
  owningAgentId: string
  owningAgentNo?: string
  owningAgentName?: string
  status: MerchantStatus
  channels: MerchantChannelSummary[]
  actions: MerchantAction[]
  createTime: string
}

export interface MerchantDetail extends MerchantResp {
  operatorUserId: string
  reviewerUserId: string
  reviewerMobileMasked?: string
  industry?: string
  productDescription?: string
  disabledReason?: string
  certifiedKycVersionId?: string
  rowVersion: number
  updateTime?: string
}

export interface MerchantProfileView {
  merchantId: string
  merchantNo: string
  legalName: string
  shortName: string
  owningAgentId: string
  contactName?: string
  contactMobileMasked?: string
  reviewerMobileMasked?: string
  industry?: string
  productDescription?: string
  rowVersion: number
}

export interface MerchantPage {
  list: MerchantResp[]
  total: number
  page: number
  size: number
}

export interface MerchantQuery {
  merchantId?: string
  merchantNo?: string
  loginAccount?: string
  legalName?: string
  shortName?: string
  contact?: string
  legalRepresentative?: string
  merchantType?: MerchantType
  owningAgentId?: string
  channelCode?: string
  status?: MerchantStatus
  createdFrom?: string
  createdTo?: string
  page?: number
  size?: number
}

export interface MerchantCreateReq {
  owningAgentId: string
  merchantType: MerchantType
  legalName: string
  shortName: string
  legalIdentifier: string
  contactName: string
  contactMobile: string
  reviewerMobile: string
  industry?: string
  productDescription?: string
  operatorTemporaryPassword: string
  operatorConfirmPassword: string
  reviewerTemporaryPassword: string
  reviewerConfirmPassword: string
}

export interface MerchantCreateResult {
  merchantId: string
  merchantNo: string
  operatorUserId: string
  operatorUsername: string
  reviewerUserId: string
  reviewerUsername: string
  credentialStatus: string
}

export interface MerchantProfileUpdateReq {
  shortName: string
  contactName: string
  contactMobile?: string
  reviewerMobile?: string
  industry?: string
  productDescription?: string
  expectedVersion: number
}

export interface MerchantLifecycleReq {
  status: MerchantStatus
  reason: string
  expectedVersion: number
}

export function listMerchant(query: MerchantQuery) {
  return http.get<MerchantPage>(BASE_URL, query)
}

export function getMerchant(merchantId: string) {
  return http.get<MerchantDetail>(`${BASE_URL}/${merchantId}`)
}

export function createMerchant(data: MerchantCreateReq) {
  return http.post<MerchantCreateResult>(BASE_URL, data)
}

export function updateMerchantProfile(merchantId: string, data: MerchantProfileUpdateReq) {
  return http.patch<MerchantProfileView>(`${BASE_URL}/${merchantId}/profile`, data)
}

export function changeMerchantLifecycle(merchantId: string, data: MerchantLifecycleReq) {
  return http.patch<MerchantProfileView>(`${BASE_URL}/${merchantId}/lifecycle`, data)
}

export function submitOnboardingChannel(merchantId: string, applicationId: string) {
  return http.post<OnboardingChannelExecutionResult>(`${BASE_URL}/${merchantId}/onboarding/${applicationId}/channel/submit`)
}

export function queryOnboardingChannel(merchantId: string, applicationId: string) {
  return http.post<OnboardingChannelExecutionResult>(`${BASE_URL}/${merchantId}/onboarding/${applicationId}/channel/query`)
}
