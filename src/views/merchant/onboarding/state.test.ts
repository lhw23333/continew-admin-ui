import { describe, expect, it } from 'vitest'
import { completeStep, createIdempotencyKey, evidenceTypeLabel, firstIncompleteStep, isDraftConflict } from './state'

describe('onboarding wizard state', () => {
  it('keeps completed steps unique and ordered', () => {
    expect(completeStep([3, 1, 3], 2)).toEqual([1, 2, 3])
  })

  it('restores the first incomplete step', () => {
    expect(firstIncompleteStep([1, 2, 4])).toBe(3)
    expect(firstIncompleteStep([1, 2, 3, 4, 5])).toBe(5)
  })

  it('recognizes optimistic concurrency failures', () => {
    expect(isDraftConflict(new Error('Onboarding draft was modified by another session'))).toBe(true)
    expect(isDraftConflict(new Error('network unavailable'))).toBe(false)
  })

  it('builds retry-stable key material around application and version', () => {
    const key = createIdempotencyKey('101', 7)
    expect(key.startsWith('onboarding-101-7-')).toBe(true)
    expect(key.length).toBeGreaterThan(20)
  })

  it('provides readable evidence labels with a safe fallback', () => {
    expect(evidenceTypeLabel('BUSINESS_LICENSE')).toBe('营业执照')
    expect(evidenceTypeLabel('CHANNEL_CUSTOM')).toBe('CHANNEL_CUSTOM')
  })
})
