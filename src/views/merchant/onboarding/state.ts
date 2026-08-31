export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'conflict'

export function completeStep(completedSteps: number[], step: number) {
  return [...new Set([...completedSteps, step])].sort((a, b) => a - b)
}

export function firstIncompleteStep(completedSteps: number[]) {
  for (let step = 1; step <= 5; step += 1) {
    if (!completedSteps.includes(step)) return step
  }
  return 5
}

export function isDraftConflict(error: unknown) {
  return error instanceof Error && /modified by another session|conflict|version|冲突/i.test(error.message)
}

export function createIdempotencyKey(applicationId: string, businessVersion: number) {
  const randomPart = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
  return `onboarding-${applicationId}-${businessVersion}-${randomPart}`
}

export function evidenceTypeLabel(value: string) {
  const labels: Record<string, string> = {
    LEGAL_REPRESENTATIVE_ID_FRONT: '法人证件正面',
    LEGAL_REPRESENTATIVE_ID_BACK: '法人证件反面',
    OPERATOR_ID_FRONT: '经办人证件正面',
    OPERATOR_ID_BACK: '经办人证件反面',
    BUSINESS_LICENSE: '营业执照',
    SETTLEMENT_ACCOUNT_PROOF: '结算账户证明',
    PLATFORM_PROOF: '经营平台证明',
  }
  return labels[value] || value
}
