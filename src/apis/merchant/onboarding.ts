import type { MerchantPricingRules, MerchantStatus, MerchantType } from './merchant'
import http from '@/utils/http'

const merchantBaseUrl = (merchantId: string) => `/merchant/merchants/${merchantId}`
const draftBaseUrl = (merchantId: string) => `${merchantBaseUrl(merchantId)}/onboarding-drafts`

export interface ChannelRequirementSummary {
  requiredEvidenceTypes: string[]
  optionalEvidenceTypes: string[]
  maxSupplementAttachments: number
  reuseExcludedFields: string[]
}

export interface EligibleChannel {
  merchantId: string
  owningAgentId: string
  merchantDefaultVersionId: string
  channelCode: string
  productCode: string
  channelConfigVersion: string
  requirementVersion: string
  pricingVersionId: string
  requirements: ChannelRequirementSummary
  eligibilityAsOf: string
}

export interface OnboardingDraft {
  applicationId: string
  applicationNo: string
  merchantId: string
  owningAgentId: string
  channelCode: string
  productCode: string
  channelConfigVersion: string
  requirementVersion: string
  requirementSummary: ChannelRequirementSummary
  kycVersionId: string
  kycVersionNo: number
  pricingVersionId?: string
  savedStep: number
  completedSteps: number[]
  rowVersion: number
  createTime: string
  updateTime: string
}

export interface OnboardingDraftView {
  draft: OnboardingDraft
  channelEligible: boolean
  currentRequirementVersion: string
}

export interface EvidenceTypeStatus {
  evidenceType: string
  required: boolean
  totalCount: number
  cleanCount: number
  pendingScanCount: number
  invalidCount: number
  complete: boolean
}

export interface EvidenceAttachment {
  attachmentId: string
  evidenceType: string
  originalName: string
  detectedMime: string
  sizeBytes: number
  scanStatus: string
  validationStatus: string
  sort: number
}

export interface KycAttachmentUploadResp {
  id: string
  kycVersionId: string
  evidenceType: string
  originalName: string
  detectedMime: string
  sizeBytes: number
  sha256: string
  scanStatus: string
  validationStatus: string
}

export interface OnboardingEvidenceSummary {
  applicationId: string
  kycVersionId: string
  requirementVersion: string
  complete: boolean
  evidenceTypes: EvidenceTypeStatus[]
  attachments: EvidenceAttachment[]
}

export type KycReuseField = 'LEGAL_NAME' | 'LEGAL_IDENTIFIER' | 'LICENSE_DATES' | 'BUSINESS_SCOPE'

export interface KycReuseSource {
  kycVersionId: string
  versionNo: number
  sourceChannelCode: string
  sourceRequirementVersion: string
  sourceUpdateTime: string
  legalIdentifierMasked: string
  reusableFields: KycReuseField[]
  fieldsRequiringReconfirmation: KycReuseField[]
}

export interface KycReuseResult {
  targetKycVersionId: string
  sourceKycVersionId: string
  rowVersion: number
  copiedFields: KycReuseField[]
  fieldsRequiringReconfirmation: KycReuseField[]
}

export type KycPersonRole = 'LEGAL_REPRESENTATIVE' | 'OPERATOR' | 'BENEFICIAL_OWNER'
export type ShareholderType = 'INDIVIDUAL' | 'CORPORATE'

export interface KycPersonReq {
  role: KycPersonRole
  name: string
  identityNumber: string
  mobile: string
  documentValidFrom: string
  documentValidTo: string
}

export interface KycShareholderReq {
  type: ShareholderType
  name: string
  identifier: string
  ownershipPercent: number
}

export interface KycProfileReq {
  legalName: string
  legalIdentifier: string
  licenseIssueDate: string
  licenseExpiryDate: string
  businessScope: string
  address: {
    registeredAddress: string
    operatingRegion: string
    operatingAddress: string
  }
  persons: KycPersonReq[]
  shareholders: KycShareholderReq[]
  expectedVersion: number
}

export interface KycProfileView {
  kycVersionId: string
  rowVersion: number
  legalName: string
  legalIdentifierMasked: string
  licenseIssueDate: string
  licenseExpiryDate: string
  businessScope: string
}

export type SettlementMode = 'ORDINARY' | 'ACCELERATED'

export interface SettlementAccountReq {
  mode: SettlementMode
  accountHolderName: string
  bankCode: string
  bankBranchName: string
  accountNumber: string
  expectedVersion: number
}

export interface SettlementAccountView {
  kycVersionId: string
  rowVersion: number
  mode: SettlementMode
  accountHolderName: string
  bankCode: string
  bankBranchName: string
  accountNumberMasked: string
  verificationStatus: string
  verificationReference?: string
  verifierVersion?: string
  verifiedTime?: string
}

export interface OnboardingPricingView {
  kycVersionId: string
  rowVersion: number
  pricingVersionId: string
  versionNo: number
  channelCode: string
  productCode: string
  currency: string
  rules: MerchantPricingRules
  effectiveTime: string
  expiresTime?: string
}

export type PlatformCertificationStatus = 'UNVERIFIED' | 'CERTIFIED' | 'REJECTED'

export interface OperatingPlatform {
  id: string
  kycVersionId: string
  platformCode: string
  storeName: string
  storeUrl?: string
  storeIdentifier: string
  certificationStatus: PlatformCertificationStatus
  rowVersion: number
  createTime: string
  updateTime?: string
  proofAttachments: Array<{
    attachmentId: string
    evidenceType: string
    originalName: string
    scanStatus: string
    validationStatus: string
  }>
}

export interface OperatingPlatformReq {
  platformCode: string
  storeName: string
  storeUrl?: string
  storeIdentifier: string
  certificationStatus: PlatformCertificationStatus
}

export interface OnboardingFinalPreview {
  applicationId: string
  applicationNo: string
  businessVersion: number
  merchant: {
    merchantId: string
    merchantNo: string
    merchantType: MerchantType
    legalName: string
    shortName: string
    owningAgentId: string
    status: MerchantStatus
    contactMobileMasked?: string
    reviewerMobileMasked?: string
    merchantVersion: number
  }
  channel: {
    channelCode: string
    productCode: string
    savedChannelConfigVersion: string
    savedRequirementVersion: string
    currentChannelConfigVersion: string
    currentRequirementVersion: string
    eligible: boolean
    requirementCurrent: boolean
  }
  kyc: {
    kycVersionId: string
    kycVersionNo: number
    rowVersion: number
    status: string
    legalName?: string
    legalIdentifierMasked?: string
    licenseIssueDate?: string
    licenseExpiryDate?: string
    businessScope?: string
    profileComplete: boolean
    licenseValid: boolean
  }
  evidence: OnboardingEvidenceSummary
  settlement: {
    mode?: SettlementMode
    accountNumberMasked?: string
    verificationStatus?: string
    verificationReference?: string
    verifierVersion?: string
    verifiedTime?: string
    verified: boolean
  }
  pricing: {
    pricingVersionId?: string
    versionNo?: number
    channelCode?: string
    productCode?: string
    currency?: string
    rules?: MerchantPricingRules
    effectiveTime?: string
    expiresTime?: string
    valid: boolean
  }
  operatingPlatforms: Array<{
    platformId: string
    platformCode: string
    storeName: string
    storeIdentifier: string
    certificationStatus: PlatformCertificationStatus
    proofCount: number
    cleanProofCount: number
    complete: boolean
  }>
  draftStepsComplete: boolean
  readyForSubmission: boolean
  blockers: Array<{ code: string, message: string, references: string[] }>
  previewTime: string
}

export interface OnboardingSubmissionResult {
  applicationId: string
  applicationNo: string
  status: string
  kycVersionId: string
  kycVersionNo: number
  businessVersion: number
  idempotencyKey: string
  submittedTime: string
  workflowRequest: {
    eventId: string
    eventKey: string
    status: string
  }
}

export function listEligibleChannels(merchantId: string) {
  return http.get<EligibleChannel[]>(`${merchantBaseUrl(merchantId)}/eligible-channels`)
}

export function createOrLoadDraft(merchantId: string, channelCode: string, productCode: string) {
  return http.post<OnboardingDraftView>(draftBaseUrl(merchantId), { channelCode, productCode })
}

export function loadDraft(merchantId: string, applicationId: string) {
  return http.get<OnboardingDraftView>(`${draftBaseUrl(merchantId)}/${applicationId}`)
}

export function saveDraftProgress(merchantId: string, applicationId: string, savedStep: number, completedSteps: number[], expectedVersion: number) {
  return http.patch<OnboardingDraftView>(`${draftBaseUrl(merchantId)}/${applicationId}/progress`, {
    savedStep,
    completedSteps,
    expectedVersion,
  })
}

export function listKycReuseSources(merchantId: string, applicationId: string) {
  return http.get<KycReuseSource[]>(`${draftBaseUrl(merchantId)}/${applicationId}/reuse-sources`)
}

export function reuseKycFields(merchantId: string, applicationId: string, sourceKycVersionId: string, fields: KycReuseField[], expectedVersion: number) {
  return http.post<KycReuseResult>(`${draftBaseUrl(merchantId)}/${applicationId}/reuse`, {
    sourceKycVersionId,
    fields,
    expectedVersion,
  })
}

export function getEvidenceSummary(merchantId: string, applicationId: string) {
  return http.get<OnboardingEvidenceSummary>(`${draftBaseUrl(merchantId)}/${applicationId}/evidence`)
}

export function uploadKycAttachment(kycVersionId: string, evidenceType: string, file: File, sort?: number) {
  const data = new FormData()
  data.append('file', file)
  data.append('evidenceType', evidenceType)
  if (sort !== undefined) data.append('sort', String(sort))
  return http.post<KycAttachmentUploadResp>(`/merchant/kyc/versions/${kycVersionId}/attachments`, data)
}

export function getKycAttachmentAccess(attachmentId: string) {
  return http.get<{ url: string, expiresAt: string }>(`/merchant/kyc/attachments/${attachmentId}/access`)
}

export function saveKycProfile(merchantId: string, applicationId: string, data: KycProfileReq) {
  return http.patch<KycProfileView>(`${draftBaseUrl(merchantId)}/${applicationId}/profile`, data)
}

export function saveSettlementAccount(merchantId: string, applicationId: string, data: SettlementAccountReq) {
  return http.patch<SettlementAccountView>(`${draftBaseUrl(merchantId)}/${applicationId}/settlement-account`, data)
}

export function selectOnboardingPricing(merchantId: string, applicationId: string, pricingVersionId: string, expectedVersion: number) {
  return http.patch<OnboardingPricingView>(`${draftBaseUrl(merchantId)}/${applicationId}/pricing`, {
    pricingVersionId,
    expectedVersion,
  })
}

export function listOperatingPlatforms(merchantId: string, applicationId: string) {
  return http.get<OperatingPlatform[]>(`${draftBaseUrl(merchantId)}/${applicationId}/platforms`)
}

export function createOperatingPlatform(merchantId: string, applicationId: string, data: OperatingPlatformReq) {
  return http.post<OperatingPlatform>(`${draftBaseUrl(merchantId)}/${applicationId}/platforms`, data)
}

export function updateOperatingPlatform(merchantId: string, applicationId: string, platformId: string, data: Omit<OperatingPlatformReq, 'platformCode'> & { expectedVersion: number }) {
  return http.patch<OperatingPlatform>(`${draftBaseUrl(merchantId)}/${applicationId}/platforms/${platformId}`, data)
}

export function linkOperatingPlatformProof(merchantId: string, applicationId: string, platformId: string, attachmentId: string, evidenceType: string) {
  return http.post<OperatingPlatform>(`${draftBaseUrl(merchantId)}/${applicationId}/platforms/${platformId}/proofs`, {
    attachmentId,
    evidenceType,
  })
}

export function getOnboardingFinalPreview(merchantId: string, applicationId: string) {
  return http.get<OnboardingFinalPreview>(`${draftBaseUrl(merchantId)}/${applicationId}/final-preview`)
}

export function submitOnboarding(merchantId: string, applicationId: string, expectedVersion: number, idempotencyKey: string, traceId?: string) {
  return http.post<OnboardingSubmissionResult>(`${draftBaseUrl(merchantId)}/${applicationId}/submit`, {
    expectedVersion,
    idempotencyKey,
    traceId,
  })
}
