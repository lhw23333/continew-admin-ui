<template>
  <GiPageLayout>
    <a-tabs v-model:active-key="activeTab" type="rounded" @change="changeTab">
      <a-tab-pane key="todo" title="全部待办" />
      <a-tab-pane key="claimed" title="已认领" />
      <a-tab-pane key="done" title="已办" />
    </a-tabs>
    <GiTable
      :row-key="(record: WorkflowTaskView) => record.task.taskId"
      :data="dataList"
      :columns="columns"
      :loading="loading"
      :pagination="pagination"
      :scroll="{ x: '100%', minWidth: 1450 }"
      @refresh="refresh"
    >
      <template #toolbar-left>
        <a-space wrap>
          <a-input v-model="queryForm.businessKey" placeholder="业务 Key" allow-clear style="width: 260px" />
          <a-input v-model="queryForm.taskName" placeholder="任务名称" allow-clear style="width: 180px" />
          <a-button type="primary" @click="search"><template #icon><icon-search /></template>查询</a-button>
          <a-button @click="reset"><template #icon><icon-refresh /></template>重置</a-button>
        </a-space>
      </template>
      <template #business="{ record }">
        <div>{{ record.business.merchantShortName }}</div>
        <a-typography-text type="secondary">{{ record.business.merchantNo }} · {{ record.business.applicationNo }}</a-typography-text>
      </template>
      <template #channel="{ record }">{{ record.business.channelCode }} / {{ record.business.productCode }}</template>
      <template #status="{ record }"><a-tag>{{ record.business.applicationStatus }}</a-tag></template>
      <template #taskState="{ record }"><a-tag :color="taskStateMeta(record.task.state).color">{{ taskStateMeta(record.task.state).label }}</a-tag></template>
      <template #dueTime="{ record }"><span :class="{ overdue: isOverdue(record.task) }">{{ record.task.dueTime || '-' }}</span></template>
      <template #action="{ record }">
        <a-space>
          <a-link v-permission="['workflow:task:get']" @click="detailDrawerRef?.onOpen(record)">详情</a-link>
          <a-link v-if="record.task.state === 'TODO'" v-permission="['workflow:task:claim']" @click="claim(record)">认领</a-link>
        </a-space>
      </template>
    </GiTable>
    <TaskDetailDrawer ref="detailDrawerRef" @success="refresh" />
  </GiPageLayout>
</template>

<script setup lang="ts">
import type { TableInstance } from '@arco-design/web-vue'
import { Message } from '@arco-design/web-vue'
import { useRoute } from 'vue-router'
import TaskDetailDrawer from './TaskDetailDrawer.vue'
import { isOverdue, taskStateMeta } from './utils'
import type { WorkflowTaskQuery, WorkflowTaskView } from '@/apis/merchant/workflow'
import { claimWorkflowTask, listClaimedTasks, listDoneTasks, listTodoTasks } from '@/apis/merchant/workflow'
import { useResetReactive, useTable } from '@/hooks'

defineOptions({ name: 'MerchantWorkflow' })

type TabKey = 'todo' | 'claimed' | 'done'
const route = useRoute()
const routeTab = String(route.query.tab || '')
const activeTab = ref<TabKey>(['todo', 'claimed', 'done'].includes(routeTab) ? routeTab as TabKey : 'todo')
const [queryForm, resetForm] = useResetReactive<WorkflowTaskQuery>({})
const apiByTab = { todo: listTodoTasks, claimed: listClaimedTasks, done: listDoneTasks }
const { tableData: dataList, loading, pagination, search, refresh } = useTable<WorkflowTaskView>(
  (page) => apiByTab[activeTab.value]({ ...queryForm, ...page }),
)

const columns: TableInstance['columns'] = [
  { title: '任务名称', dataIndex: 'task.taskName', width: 190, ellipsis: true, tooltip: true },
  { title: '商户/进件', slotName: 'business', width: 240 },
  { title: '渠道产品', slotName: 'channel', width: 180 },
  { title: '进件状态', slotName: 'status', width: 140, align: 'center' },
  { title: '任务状态', slotName: 'taskState', width: 120, align: 'center' },
  { title: '处理人', dataIndex: 'task.assignee', width: 150 },
  { title: '接收时间', dataIndex: 'task.createTime', width: 180 },
  { title: '到期时间', slotName: 'dueTime', width: 180 },
  { title: '操作', slotName: 'action', width: 130, fixed: 'right' },
]

function changeTab() {
  search()
}

function reset() {
  resetForm()
  search()
}

async function claim(record: WorkflowTaskView) {
  await claimWorkflowTask(record.task.taskId)
  Message.success('任务已认领')
  refresh()
}

const detailDrawerRef = ref<InstanceType<typeof TaskDetailDrawer>>()

onMounted(async () => {
  const taskId = typeof route.query.taskId === 'string' ? route.query.taskId : ''
  if (taskId) {
    await detailDrawerRef.value?.onOpenTaskId(taskId)
  }
})
</script>

<style scoped>
.overdue { color: rgb(var(--danger-6)); font-weight: 600; }
</style>
