import { describe, expect, it } from 'vitest'
import { channelStatusColor, hasServerAction, merchantStatusMeta, merchantTypeLabel } from './utils'

describe('merchant view utilities', () => {
  it('maps merchant master states independently from channel states', () => {
    expect(merchantStatusMeta('DISABLED')).toEqual({ label: '停用', color: 'red' })
    expect(channelStatusColor('SUCCEEDED')).toBe('green')
    expect(channelStatusColor('SUPPLEMENT_REQUIRED')).toBe('orange')
  })

  it('uses server-resolved action codes', () => {
    expect(hasServerAction(['VIEW', 'CHANGE_LIFECYCLE'], 'CHANGE_LIFECYCLE')).toBe(true)
    expect(hasServerAction(['VIEW'], 'ADJUST_LIMIT')).toBe(false)
  })

  it('renders supported merchant types', () => {
    expect(merchantTypeLabel('ENTERPRISE')).toBe('企业商户')
    expect(merchantTypeLabel('INDIVIDUAL')).toBe('个人商户')
  })
})
