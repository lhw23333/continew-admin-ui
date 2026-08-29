import dayjs from 'dayjs'

export function getErrorMessage(error: unknown, fallback = '操作失败，请稍后重试') {
  if (error instanceof Error && error.message) {
    if (/modified|conflict|version|冲突/i.test(error.message)) {
      return '数据版本已变化，请关闭窗口并刷新列表后重试。'
    }
    return error.message
  }
  return fallback
}

export function toApiDateTime(value?: string) {
  if (!value) return undefined
  const parsed = dayjs(value)
  return parsed.isValid() ? parsed.format('YYYY-MM-DD HH:mm:ss') : value
}

export function defaultEffectiveTime() {
  return dayjs().add(1, 'minute').format('YYYY-MM-DD HH:mm:ss')
}
