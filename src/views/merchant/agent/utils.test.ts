import { describe, expect, it } from 'vitest'
import { toApiDateTime } from './utils'

describe('merchant agent date-time API format', () => {
  it('uses the backend JSON LocalDateTime format', () => {
    expect(toApiDateTime('2026-08-29 01:22:35')).toBe('2026-08-29 01:22:35')
  })

  it('returns undefined for an empty value', () => {
    expect(toApiDateTime()).toBeUndefined()
  })
})
