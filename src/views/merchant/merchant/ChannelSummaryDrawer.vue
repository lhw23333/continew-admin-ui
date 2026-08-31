<template>
  <a-drawer
    v-model:visible="visible"
    title="商户渠道与定价摘要"
    :width="drawerWidth"
    :footer="false"
    unmount-on-close
  >
    <a-spin :loading="loading" style="width: 100%">
      <a-alert v-if="errorMessage" type="error" closable class="mb-3" @close="errorMessage = ''">
        {{ errorMessage }}
      </a-alert>
      <a-descriptions v-if="detail" :column="descriptionColumns" bordered class="mb-4">
        <a-descriptions-item label="商户编号">{{ detail.merchantNo }}</a-descriptions-item>
        <a-descriptions-item label="商户名称">{{ detail.shortName }}</a-descriptions-item>
        <a-descriptions-item label="主状态">
          <a-tag :color="merchantStatusMeta(detail.status).color">
            {{ merchantStatusMeta(detail.status).label }}
          </a-tag>
        </a-descriptions-item>
      </a-descriptions>

      <a-empty v-if="detail && !detail.channels.length" description="当前商户暂无渠道申请" />
      <a-space v-else direction="vertical" fill :size="16">
        <a-card v-for="channel in detail?.channels" :key="channel.channelCode" :title="channel.channelCode" :bordered="false" class="channel-card">
          <template #extra>
            <a-space>
              <a-button
                v-if="channel.applicationStatus === 'APPROVED'"
                v-permission="['merchant:onboarding:channel:submit']"
                size="small"
                type="primary"
                :loading="executingApplicationId === channel.applicationId"
                @click="executeChannel(channel, 'submit')"
              >
                提交渠道
              </a-button>
              <a-button
                v-if="channel.applicationStatus === 'CHANNEL_PROCESSING'"
                v-permission="['merchant:onboarding:channel:query']"
                size="small"
                :loading="executingApplicationId === channel.applicationId"
                @click="executeChannel(channel, 'query')"
              >
                查询状态
              </a-button>
              <a-tag :color="channelStatusColor(channel.channelFinalStatus)">
                {{ channel.channelFinalStatus }}
              </a-tag>
            </a-space>
          </template>
          <a-descriptions :column="descriptionColumns" bordered>
            <a-descriptions-item label="申请编号">{{ channel.applicationNo }}</a-descriptions-item>
            <a-descriptions-item label="申请状态">{{ channel.applicationStatus }}</a-descriptions-item>
            <a-descriptions-item label="原始渠道状态">{{ channel.rawChannelStatus || '-' }}</a-descriptions-item>
            <a-descriptions-item label="报件">{{ channel.reportingStatus }}</a-descriptions-item>
            <a-descriptions-item label="签约">{{ channel.agreementStatus }}</a-descriptions-item>
            <a-descriptions-item label="绑卡">{{ channel.cardBindingStatus }}</a-descriptions-item>
            <a-descriptions-item label="备付金账户">{{ channel.reserveAccountStatus }}</a-descriptions-item>
            <a-descriptions-item label="KYC 版本">{{ channel.kycVersionId || '-' }}</a-descriptions-item>
            <a-descriptions-item label="提交时间">{{ channel.submittedTime || '-' }}</a-descriptions-item>
          </a-descriptions>

          <a-divider orientation="left">精确定价引用</a-divider>
          <a-empty v-if="!channel.pricing" description="该渠道申请尚未引用定价版本" />
          <a-descriptions v-else :column="descriptionColumns" bordered>
            <a-descriptions-item label="定价版本 ID">{{ channel.pricing.pricingVersionId }}</a-descriptions-item>
            <a-descriptions-item label="版本号">V{{ channel.pricing.versionNo }}</a-descriptions-item>
            <a-descriptions-item label="产品">{{ channel.pricing.productCode }}</a-descriptions-item>
            <a-descriptions-item label="币种">{{ channel.pricing.currency }}</a-descriptions-item>
            <a-descriptions-item label="百分比成本">{{ channel.pricing.rules.percentageCost }}</a-descriptions-item>
            <a-descriptions-item label="固定费">{{ channel.pricing.rules.fixedFee }}</a-descriptions-item>
            <a-descriptions-item label="分润比例">{{ channel.pricing.rules.profitShareRatio }}</a-descriptions-item>
            <a-descriptions-item label="生效时间">{{ channel.pricing.effectiveTime }}</a-descriptions-item>
            <a-descriptions-item label="失效时间">{{ channel.pricing.expiresTime || '-' }}</a-descriptions-item>
          </a-descriptions>
        </a-card>
      </a-space>
    </a-spin>
  </a-drawer>
</template>

<script setup lang="ts">
import { Message } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import { channelStatusColor, getErrorMessage, merchantStatusMeta } from './utils'
import type { MerchantChannelSummary, MerchantDetail, MerchantResp } from '@/apis/merchant/merchant'
import { getMerchant, queryOnboardingChannel, submitOnboardingChannel } from '@/apis/merchant/merchant'

const { width } = useWindowSize()
const drawerWidth = computed(() => width.value >= 1100 ? 980 : '100%')
const descriptionColumns = computed(() => width.value >= 768 ? 3 : 1)
const visible = ref(false)
const loading = ref(false)
const detail = ref<MerchantDetail>()
const errorMessage = ref('')
const executingApplicationId = ref('')

const loadDetail = async (merchantId: string) => {
  const { data } = await getMerchant(merchantId)
  detail.value = data
}

const executeChannel = async (channel: MerchantChannelSummary, operation: 'submit' | 'query') => {
  if (!detail.value) return
  try {
    executingApplicationId.value = channel.applicationId
    errorMessage.value = ''
    const execute = operation === 'submit' ? submitOnboardingChannel : queryOnboardingChannel
    const { data } = await execute(detail.value.id, channel.applicationId)
    Message.success(data.safeMessage || (operation === 'submit' ? '渠道提交成功' : '渠道状态已刷新'))
    await loadDetail(detail.value.id)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, operation === 'submit' ? '渠道提交失败' : '渠道查询失败')
  } finally {
    executingApplicationId.value = ''
  }
}

const onOpen = async (record: MerchantResp) => {
  visible.value = true
  loading.value = true
  detail.value = undefined
  errorMessage.value = ''
  try {
    await loadDetail(record.id)
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '渠道摘要加载失败')
  } finally {
    loading.value = false
  }
}

defineExpose({ onOpen })
</script>

<style scoped>
.mb-3 { margin-bottom: 12px; }
.mb-4 { margin-bottom: 16px; }
.channel-card { background: var(--color-fill-1); }
</style>
