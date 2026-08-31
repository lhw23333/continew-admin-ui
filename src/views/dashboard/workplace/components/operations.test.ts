import { describe, expect, it } from 'vitest'
import { displayMetric, displayedAvailability, metricDrillDown } from './operations'
import type { OperationsMetricValue, OperationsWorkbenchMetrics } from '@/apis/merchant/workbench'

const metric = (value: number, availability: OperationsMetricValue['availability'] = 'AVAILABLE'): OperationsMetricValue => ({
  value,
  availability,
  asOfTime: '2026-08-30T21:31:22+08:00',
})

describe('operations workbench states and drill-downs', () => {
  it('distinguishes a real zero from unavailable data', () => {
    expect(displayMetric(metric(0))).toBe('0')
    expect(displayMetric({ availability: 'UNAVAILABLE' })).toBe('--')
  })

  it('keeps a prior snapshot stale after a request failure', () => {
    expect(displayedAvailability({ availability: 'AVAILABLE' } as OperationsWorkbenchMetrics, true)).toBe('STALE')
    expect(displayedAvailability(undefined, true)).toBe('UNAVAILABLE')
  })

  it('preserves server scope while applying supplement and failure filters', () => {
    expect(metricDrillDown('supplementTasks', metric(1))).toEqual({
      path: '/merchant/workflow',
      query: { tab: 'todo', taskDefinitionKey: 'supplementTask' },
    })
    expect(metricDrillDown('failed', metric(2))).toEqual({
      path: '/merchant/merchant',
      query: { applicationStatus: 'FAILED,REJECTED', applicationUpdatedTo: '2026-08-30T21:31:22+08:00' },
    })
    expect(metricDrillDown('drafts', metric(0))).toBeUndefined()
  })
})
