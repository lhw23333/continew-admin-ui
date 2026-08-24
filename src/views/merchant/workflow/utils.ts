import dayjs from 'dayjs'
import type { ReviewAction, WorkflowTask } from '@/apis/merchant/workflow'

export function taskStateMeta(state: WorkflowTask['state']) {
  if (state === 'DONE') return { label: '已办', color: 'green' }
  if (state === 'CLAIMED') return { label: '已认领', color: 'blue' }
  return { label: '待认领', color: 'orange' }
}

export function isOverdue(task: WorkflowTask, now = dayjs()) {
  return !!task.dueTime && task.state !== 'DONE' && dayjs(task.dueTime).isBefore(now)
}

export function availableReviewActions(task: WorkflowTask): ReviewAction[] {
  if (task.state !== 'CLAIMED') return []
  if (task.taskDefinitionKey === 'supplementTask') return ['RESUBMIT']
  if (['reviewTask', 'escalatedReviewTask'].includes(task.taskDefinitionKey)) {
    return ['APPROVE', 'REJECT', 'REQUEST_SUPPLEMENT']
  }
  return []
}

export function reviewActionLabel(action: string) {
  const labels: Record<string, string> = {
    APPROVE: '通过',
    REJECT: '拒绝',
    REQUEST_SUPPLEMENT: '要求补件',
    RESUBMIT: '重新提交',
    TRANSFER: '转派',
  }
  return labels[action] || action
}
