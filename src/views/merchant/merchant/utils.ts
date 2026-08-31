import type { MerchantAction, MerchantStatus, MerchantType } from '@/apis/merchant/merchant'

export function getErrorMessage(error: unknown, fallback = '操作失败，请稍后重试') {
  if (error instanceof Error && error.message) {
    if (/modified|conflict|version|冲突/i.test(error.message)) {
      return '数据版本已变化，请关闭窗口并刷新列表后重试。'
    }
    return error.message
  }
  return fallback
}

export function merchantTypeLabel(type: MerchantType) {
  return type === 'ENTERPRISE' ? '企业商户' : '个人商户'
}

export function merchantStatusMeta(status: MerchantStatus) {
  if (status === 'ENABLED') return { label: '启用', color: 'green' }
  if (status === 'DISABLED') return { label: '停用', color: 'red' }
  return { label: '草稿', color: 'orange' }
}

export function channelStatusColor(status?: string) {
  if (status === 'SUCCEEDED') return 'green'
  if (status === 'FAILED' || status === 'REJECTED') return 'red'
  if (status === 'SUPPLEMENT_REQUIRED') return 'orange'
  return 'blue'
}

export function hasServerAction(actions: MerchantAction[], action: MerchantAction) {
  return actions.includes(action)
}
