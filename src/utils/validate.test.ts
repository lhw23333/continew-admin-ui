import { describe, expect, it } from 'vitest'
import { isExternal, isHttp, isIPv4 } from './validate'

describe('validate utilities', () => {
  it('recognizes supported external links', () => {
    expect(isExternal('https://example.com')).toBe(true)
    expect(isExternal('mailto:ops@example.com')).toBe(true)
    expect(isExternal('/dashboard/workplace')).toBe(false)
  })

  it('recognizes HTTP URLs', () => {
    expect(isHttp('https://example.com/callback')).toBe(true)
    expect(isHttp('/api/merchant')).toBe(false)
  })

  it('validates IPv4 octets', () => {
    expect(isIPv4('192.168.10.1')).toBe(true)
    expect(isIPv4('256.168.10.1')).toBe(false)
    expect(isIPv4('192.168.10')).toBe(false)
  })
})
