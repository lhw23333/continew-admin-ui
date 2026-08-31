import http from '@/utils/http'

const BASE_URL = '/merchant/agents'

export type AgentStatus = 'ENABLED' | 'DISABLED'
export type PromotionCodeStatus = 'ACTIVE' | 'DISABLED'

export interface AgentResp {
  id: string
  parentId: string
  deptId?: string
  agentNo: string
  name: string
  contactName: string
  contactMobileMasked?: string
  remarks?: string
  status: AgentStatus
  rowVersion: number
  promotionCode?: string
  promotionCodeStatus: PromotionCodeStatus
  createTime: string
  updateTime?: string
}

export interface AgentPage {
  list: AgentResp[]
  total: number
  page: number
  size: number
}

export interface AgentQuery {
  agentId?: string
  name?: string
  status?: AgentStatus
  page?: number
  size?: number
}

export interface SubordinateAgentCreateReq {
  agentNo: string
  name: string
  contactName: string
  contactMobile: string
  temporaryPassword: string
  confirmPassword: string
}

export interface SubordinateAgentResult {
  agentId: string
  userId: string
  deptId: string
  username: string
  credentialStatus: string
}

export interface AgentProfileUpdateReq {
  name: string
  contactName: string
  contactMobile: string
  remarks?: string
  expectedVersion: number
}

export interface AgentLifecycleReq {
  status: AgentStatus
  reason: string
  expectedVersion: number
}

export interface AgentPasswordResetReq {
  temporaryPassword: string
  confirmPassword: string
  reason: string
}

export interface AgentPromotionCodeView {
  agentId: string
  agentName: string
  promotionCode: string
  status: PromotionCodeStatus
  rowVersion: number
}

export interface AgentPricingRules {
  percentageCost: number
  fixedFee: number
  profitShareRatio: number
}

export interface AgentPricingVersion {
  id: string
  tenantId: string
  agentId: string
  parentPricingVersionId?: string
  versionNo: number
  channelCode: string
  productCode: string
  currency: string
  rules: AgentPricingRules
  effectiveTime: string
  expiresTime?: string
  status: 'PUBLISHED'
  createUser: string
  createTime: string
}

export interface AgentPricingCreateReq extends AgentPricingRules {
  channelCode: string
  productCode: string
  currency: string
  effectiveTime: string
  expiresTime?: string
  reason: string
}

export interface AgentMerchantDefaultProduct {
  channelCode: string
  productCode: string
  pricingVersionId: string
}

export interface AgentMerchantDefaults {
  products: AgentMerchantDefaultProduct[]
}

export interface AgentMerchantDefaultVersion {
  id: string
  tenantId: string
  agentId: string
  versionNo: number
  defaults: AgentMerchantDefaults
  effectiveTime: string
  expiresTime?: string
  status: 'PUBLISHED'
  createUser: string
  createTime: string
}

export interface AgentMerchantDefaultCreateReq {
  products: AgentMerchantDefaultProduct[]
  effectiveTime: string
  expiresTime?: string
  reason: string
}

/** 查询授权范围内代理商 */
export function listAgent(query: AgentQuery) {
  return http.get<AgentPage>(BASE_URL, query)
}

/** 查询代理商详情 */
export function getAgent(agentId: string) {
  return http.get<AgentResp>(`${BASE_URL}/${agentId}`)
}

/** 创建直属下级代理商 */
export function createSubordinateAgent(data: SubordinateAgentCreateReq) {
  return http.post<SubordinateAgentResult>(`${BASE_URL}/subordinates`, data)
}

/** 更新代理商资料 */
export function updateAgentProfile(agentId: string, data: AgentProfileUpdateReq) {
  return http.patch<AgentResp>(`${BASE_URL}/${agentId}/profile`, data)
}

/** 启用或停用代理商 */
export function changeAgentLifecycle(agentId: string, data: AgentLifecycleReq) {
  return http.patch<AgentResp>(`${BASE_URL}/${agentId}/lifecycle`, data)
}

/** 重置代理商临时密码 */
export function resetAgentPassword(agentId: string, data: AgentPasswordResetReq) {
  return http.post(`${BASE_URL}/${agentId}/password/reset`, data)
}

/** 签发推广码 */
export function issueAgentPromotionCode(agentId: string, expectedVersion: number) {
  return http.post<AgentPromotionCodeView>(`${BASE_URL}/${agentId}/promotion-code`, { expectedVersion })
}

/** 修改推广码状态 */
export function changeAgentPromotionCodeStatus(agentId: string, status: PromotionCodeStatus, expectedVersion: number) {
  return http.patch<AgentPromotionCodeView>(`${BASE_URL}/${agentId}/promotion-code/status`, {
    status,
    expectedVersion,
  })
}

/** 查询定价版本 */
export function listAgentPricing(agentId: string, channelCode: string, productCode: string, currency = 'CNY') {
  return http.get<AgentPricingVersion[]>(`${BASE_URL}/${agentId}/pricing-versions`, {
    channelCode,
    productCode,
    currency,
  })
}

/** 发布定价版本 */
export function createAgentPricing(agentId: string, data: AgentPricingCreateReq) {
  return http.post<AgentPricingVersion>(`${BASE_URL}/${agentId}/pricing-versions`, data)
}

/** 查询商户默认版本 */
export function listAgentMerchantDefaults(agentId: string) {
  return http.get<AgentMerchantDefaultVersion[]>(`${BASE_URL}/${agentId}/merchant-default-versions`)
}

/** 发布商户默认版本 */
export function createAgentMerchantDefaults(agentId: string, data: AgentMerchantDefaultCreateReq) {
  return http.post<AgentMerchantDefaultVersion>(`${BASE_URL}/${agentId}/merchant-default-versions`, data)
}
