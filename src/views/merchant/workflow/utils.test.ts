import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import { availableReviewActions, canClaimTask, isOverdue } from './utils'
import type { WorkflowTask } from '@/apis/merchant/workflow'

const task = (patch: Partial<WorkflowTask> = {}): WorkflowTask => ({
  taskId: 'task-1',
  taskDefinitionKey: 'reviewTask',
  taskName: 'Merchant Review',
  processInstanceId: 'process-1',
  processDefinitionId: 'definition-1',
  processDefinitionKey: 'merchant-onboarding-review-v1',
  processDefinitionVersion: 1,
  businessKey: '1:MERCHANT_ONBOARDING:2:1',
  tenantId: '1',
  state: 'CLAIMED',
  createTime: '2026-08-20T00:00:00',
  ...patch,
})

describe('workflow task ui policy', () => {
  it('exposes only resubmit for supplement tasks', () => {
    expect(availableReviewActions(task({ taskDefinitionKey: 'supplementTask' }))).toEqual(['RESUBMIT'])
  })

  it('does not expose review actions before claim', () => {
    expect(availableReviewActions(task({ state: 'TODO' }))).toEqual([])
  })

  it('prevents the applicant from claiming their review task', () => {
    expect(canClaimTask(task({ state: 'TODO' }), 'user-1', 'user-1')).toBe(false)
    expect(canClaimTask(task({ state: 'TODO' }), 'user-1', 'reviewer-2')).toBe(true)
  })

  it('marks unfinished tasks overdue using the due time', () => {
    expect(isOverdue(task({ dueTime: '2026-08-23T00:00:00' }), dayjs('2026-08-24T00:00:00'))).toBe(true)
    expect(isOverdue(task({ dueTime: '2026-08-23T00:00:00', state: 'DONE' }), dayjs('2026-08-24T00:00:00'))).toBe(false)
  })
})
