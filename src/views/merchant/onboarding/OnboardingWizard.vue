<template>
  <a-modal
    v-model:visible="visible"
    title="商户入网"
    :width="modalWidth"
    :footer="false"
    :mask-closable="false"
    :esc-to-close="false"
    unmount-on-close
    @before-cancel="beforeClose"
  >
    <div class="wizard">
      <div class="wizard__heading">
        <div class="wizard__merchant">
          <strong>{{ merchant?.shortName }}</strong>
          <span>{{ merchant?.merchantNo }}</span>
          <a-tag v-if="draft" color="arcoblue">{{ draft.applicationNo }}</a-tag>
        </div>
        <div class="wizard__save-state">
          <a-badge :status="saveStateMeta.status" />
          <span>{{ saveStateMeta.label }}</span>
          <span v-if="lastSavedAt" class="secondary">{{ lastSavedAt }}</span>
        </div>
      </div>

      <a-steps :current="activeStep" small label-placement="vertical" class="wizard__steps">
        <a-step v-for="step in steps" :key="step.value" :title="step.title" />
      </a-steps>

      <a-alert v-if="errorMessage" type="error" closable class="wizard__alert" @close="errorMessage = ''">
        {{ errorMessage }}
      </a-alert>

      <a-spin :loading="loading" class="wizard__body">
        <section v-if="activeStep === 1" class="step-panel">
          <div class="step-panel__title">
            <div>
              <h3>选择渠道</h3>
              <p>可选项由归属代理商、商户类型和渠道配置共同决定。</p>
            </div>
            <a-tag v-if="draft" color="green">已建立草稿</a-tag>
          </div>

          <a-radio-group v-if="!draft && eligibleChannels.length > 0" v-model="selectedChannelKey" class="channel-list" @change="markDirty">
            <label v-for="channel in eligibleChannels" :key="channelKey(channel)" class="channel-option">
              <a-radio :value="channelKey(channel)" />
              <span class="channel-option__main">
                <strong>{{ channel.channelCode }} · {{ channel.productCode }}</strong>
                <span>要求版本 {{ channel.requirementVersion }} · 配置版本 {{ channel.channelConfigVersion }}</span>
              </span>
              <a-tag>{{ channel.requirements.requiredEvidenceTypes.length }} 项必传材料</a-tag>
            </label>
          </a-radio-group>

          <a-empty v-else-if="!draft" description="当前没有可发起入网的渠道" />

          <a-descriptions v-if="draft" :column="descriptionColumns" bordered>
            <a-descriptions-item label="渠道">{{ draft.channelCode }}</a-descriptions-item>
            <a-descriptions-item label="产品">{{ draft.productCode }}</a-descriptions-item>
            <a-descriptions-item label="要求版本">{{ draft.requirementVersion }}</a-descriptions-item>
            <a-descriptions-item label="KYC 版本">V{{ draft.kycVersionNo }}</a-descriptions-item>
            <a-descriptions-item label="当前业务版本">{{ draft.rowVersion }}</a-descriptions-item>
            <a-descriptions-item label="渠道资格">
              <a-tag :color="draftView?.channelEligible ? 'green' : 'red'">
                {{ draftView?.channelEligible ? '有效' : '已失效' }}
              </a-tag>
            </a-descriptions-item>
          </a-descriptions>
        </section>

        <section v-else-if="activeStep === 2" class="step-panel">
          <div class="step-panel__title">
            <div>
              <h3>证件与业务材料</h3>
              <p>材料仅保存在私有存储，通过内容校验和安全扫描后才可临时查看。</p>
            </div>
            <a-tag :color="evidence?.complete ? 'green' : 'orange'">
              {{ evidence?.complete ? '材料完整' : '待补充' }}
            </a-tag>
          </div>

          <div class="evidence-list">
            <div v-for="item in evidence?.evidenceTypes || evidencePlaceholders" :key="item.evidenceType" class="evidence-row">
              <div class="evidence-row__name">
                <strong>{{ evidenceTypeLabel(item.evidenceType) }}</strong>
                <a-tag v-if="item.required" color="red" size="small">必传</a-tag>
                <a-tag v-else size="small">可选</a-tag>
              </div>
              <div class="evidence-row__status">
                <span>{{ item.cleanCount || 0 }} 个可用</span>
                <span v-if="item.pendingScanCount" class="warning">{{ item.pendingScanCount }} 个待扫描</span>
                <span v-if="item.invalidCount" class="danger">{{ item.invalidCount }} 个无效</span>
              </div>
              <a-upload
                :show-file-list="false"
                :custom-request="createEvidenceUpload(item.evidenceType)"
                :disabled="saving"
              >
                <template #upload-button>
                  <a-button size="small" type="outline">
                    <template #icon><icon-upload /></template>
                    上传
                  </a-button>
                </template>
              </a-upload>
            </div>
          </div>

          <a-table
            v-if="evidence?.attachments.length"
            :data="evidence.attachments"
            :pagination="false"
            row-key="attachmentId"
            size="small"
            class="attachment-table"
          >
            <template #columns>
              <a-table-column title="材料" data-index="originalName" :ellipsis="true" :tooltip="true" />
              <a-table-column title="类型" :width="180">
                <template #cell="{ record }">{{ evidenceTypeLabel(record.evidenceType) }}</template>
              </a-table-column>
              <a-table-column title="状态" :width="150">
                <template #cell="{ record }">
                  <a-tag :color="attachmentStatusColor(record)">{{ attachmentStatusLabel(record) }}</a-tag>
                </template>
              </a-table-column>
              <a-table-column title="操作" :width="90" align="center">
                <template #cell="{ record }">
                  <a-button
                    type="text"
                    size="small"
                    :disabled="record.scanStatus !== 'CLEAN' || record.validationStatus !== 'VALID'"
                    @click="viewAttachment(record.attachmentId)"
                  >
                    查看
                  </a-button>
                </template>
              </a-table-column>
            </template>
          </a-table>
        </section>

        <section v-else-if="activeStep === 3" class="step-panel">
          <div class="step-panel__title">
            <div>
              <h3>商户与 KYC 信息</h3>
              <p>证件号码与手机仅在本次保存请求中使用，服务端加密后返回脱敏结果。</p>
            </div>
            <a-tag v-if="preview?.kyc.profileComplete" color="green">服务器已有已保存资料</a-tag>
          </div>

          <a-descriptions v-if="preview?.kyc.profileComplete" :column="descriptionColumns" bordered class="saved-summary">
            <a-descriptions-item label="已保存主体">{{ preview.kyc.legalName }}</a-descriptions-item>
            <a-descriptions-item label="主体标识">{{ preview.kyc.legalIdentifierMasked }}</a-descriptions-item>
            <a-descriptions-item label="证照有效期">{{ preview.kyc.licenseExpiryDate }}</a-descriptions-item>
          </a-descriptions>

          <a-form :model="kycForm" layout="vertical" @change="markDirty">
            <div class="form-grid">
              <a-form-item label="法定主体全称" required>
                <a-input v-model="kycForm.legalName" :max-length="200" />
              </a-form-item>
              <a-form-item label="法定主体标识" required>
                <a-input-password v-model="kycForm.legalIdentifier" :max-length="64" autocomplete="off" />
              </a-form-item>
              <a-form-item label="证照签发日期" required>
                <a-date-picker v-model="kycForm.licenseIssueDate" value-format="YYYY-MM-DD" style="width: 100%" />
              </a-form-item>
              <a-form-item label="证照有效期" required>
                <a-date-picker v-model="kycForm.licenseExpiryDate" value-format="YYYY-MM-DD" style="width: 100%" />
              </a-form-item>
              <a-form-item label="注册地址" required>
                <a-input v-model="kycForm.address.registeredAddress" :max-length="255" />
              </a-form-item>
              <a-form-item label="经营地区" required>
                <a-input v-model="kycForm.address.operatingRegion" :max-length="100" />
              </a-form-item>
            </div>
            <a-form-item label="经营地址" required>
              <a-input v-model="kycForm.address.operatingAddress" :max-length="255" />
            </a-form-item>
            <a-form-item label="经营范围" required>
              <a-textarea v-model="kycForm.businessScope" :max-length="2000" show-word-limit :auto-size="{ minRows: 2, maxRows: 5 }" />
            </a-form-item>

            <a-divider orientation="left">人员信息</a-divider>
            <div v-for="(person, index) in kycForm.persons" :key="`${person.role}-${index}`" class="repeat-row">
              <div class="repeat-row__heading">
                <strong>{{ personRoleLabel(person.role) }}</strong>
                <a-button v-if="canRemovePerson(person.role)" type="text" status="danger" size="small" @click="removePerson(index)">移除</a-button>
              </div>
              <div class="form-grid form-grid--three">
                <a-form-item label="姓名" required><a-input v-model="person.name" :max-length="100" /></a-form-item>
                <a-form-item label="证件号码" required><a-input-password v-model="person.identityNumber" :max-length="64" autocomplete="off" /></a-form-item>
                <a-form-item label="手机" required><a-input v-model="person.mobile" :max-length="32" autocomplete="off" /></a-form-item>
                <a-form-item label="证件起始日" required><a-date-picker v-model="person.documentValidFrom" value-format="YYYY-MM-DD" style="width: 100%" /></a-form-item>
                <a-form-item label="证件到期日" required><a-date-picker v-model="person.documentValidTo" value-format="YYYY-MM-DD" style="width: 100%" /></a-form-item>
              </div>
            </div>
            <a-button v-if="merchant?.merchantType === 'ENTERPRISE'" type="outline" size="small" @click="addBeneficiary">
              <template #icon><icon-plus /></template>
              添加受益所有人
            </a-button>

            <template v-if="merchant?.merchantType === 'ENTERPRISE'">
              <a-divider orientation="left">股东结构</a-divider>
              <div v-for="(shareholder, index) in kycForm.shareholders" :key="index" class="repeat-row">
                <div class="repeat-row__heading">
                  <strong>股东 {{ index + 1 }}</strong>
                  <a-button v-if="kycForm.shareholders.length > 1" type="text" status="danger" size="small" @click="removeShareholder(index)">移除</a-button>
                </div>
                <div class="form-grid form-grid--four">
                  <a-form-item label="类型" required>
                    <a-select v-model="shareholder.type">
                      <a-option value="INDIVIDUAL">自然人</a-option>
                      <a-option value="CORPORATE">企业</a-option>
                    </a-select>
                  </a-form-item>
                  <a-form-item label="名称" required><a-input v-model="shareholder.name" :max-length="200" /></a-form-item>
                  <a-form-item label="主体标识" required><a-input-password v-model="shareholder.identifier" :max-length="64" /></a-form-item>
                  <a-form-item label="持股比例" required><a-input-number v-model="shareholder.ownershipPercent" :min="0.0001" :max="100" :precision="4" /></a-form-item>
                </div>
              </div>
              <a-button type="outline" size="small" @click="addShareholder">
                <template #icon><icon-plus /></template>
                添加股东
              </a-button>
            </template>
          </a-form>
        </section>

        <section v-else-if="activeStep === 4" class="step-panel">
          <div class="step-panel__title">
            <div>
              <h3>结算账户</h3>
              <p>账户号独立加密，提交前必须完成服务端账户校验。</p>
            </div>
            <a-tag v-if="preview?.settlement.verified" color="green">已验证</a-tag>
          </div>
          <a-descriptions v-if="preview?.settlement.accountNumberMasked" :column="descriptionColumns" bordered class="saved-summary">
            <a-descriptions-item label="已保存账户">{{ preview.settlement.accountNumberMasked }}</a-descriptions-item>
            <a-descriptions-item label="结算模式">{{ preview.settlement.mode === 'ACCELERATED' ? '加速结算' : '普通结算' }}</a-descriptions-item>
            <a-descriptions-item label="验证状态">{{ preview.settlement.verificationStatus }}</a-descriptions-item>
          </a-descriptions>
          <a-form :model="settlementForm" layout="vertical" @change="markDirty">
            <div class="form-grid">
              <a-form-item label="结算模式" required>
                <a-segmented v-model="settlementForm.mode" :options="settlementModeOptions" />
              </a-form-item>
              <a-form-item label="账户名称" required><a-input v-model="settlementForm.accountHolderName" :max-length="200" /></a-form-item>
              <a-form-item label="银行编码" required><a-input v-model="settlementForm.bankCode" :max-length="64" /></a-form-item>
              <a-form-item label="开户支行" required><a-input v-model="settlementForm.bankBranchName" :max-length="200" /></a-form-item>
              <a-form-item label="账户号" required><a-input-password v-model="settlementForm.accountNumber" :max-length="64" autocomplete="off" /></a-form-item>
            </div>
          </a-form>
        </section>

        <section v-else class="step-panel">
          <div class="step-panel__title">
            <div>
              <h3>定价与经营平台</h3>
              <p>提交使用草稿绑定的精确定价版本，每个经营平台及证明独立保存。</p>
            </div>
            <a-button type="primary" size="small" @click="openPlatformModal()">
              <template #icon><icon-plus /></template>
              新增平台
            </a-button>
          </div>

          <a-descriptions :column="descriptionColumns" bordered class="pricing-summary">
            <a-descriptions-item label="定价版本">{{ selectedEligibleChannel?.pricingVersionId || draft?.pricingVersionId || '-' }}</a-descriptions-item>
            <a-descriptions-item label="渠道">{{ draft?.channelCode }}</a-descriptions-item>
            <a-descriptions-item label="产品">{{ draft?.productCode }}</a-descriptions-item>
          </a-descriptions>

          <a-table :data="platforms" :pagination="false" row-key="id" size="small">
            <template #columns>
              <a-table-column title="平台" data-index="platformCode" :width="130" />
              <a-table-column title="店铺名称" data-index="storeName" :ellipsis="true" :tooltip="true" />
              <a-table-column title="店铺标识" data-index="storeIdentifier" :ellipsis="true" :tooltip="true" />
              <a-table-column title="认证" :width="100">
                <template #cell="{ record }"><a-tag>{{ platformStatusLabel(record.certificationStatus) }}</a-tag></template>
              </a-table-column>
              <a-table-column title="证明" :width="90">
                <template #cell="{ record }">{{ record.proofAttachments.length }}</template>
              </a-table-column>
              <a-table-column title="操作" :width="170" align="center">
                <template #cell="{ record }">
                  <a-space>
                    <a-button type="text" size="small" @click="openPlatformModal(record)">修改</a-button>
                    <a-dropdown v-if="proofAttachments.length" trigger="click">
                      <a-button type="text" size="small">关联证明</a-button>
                      <template #content>
                        <a-doption v-for="attachment in proofAttachments" :key="attachment.attachmentId" @click="linkProof(record, attachment)">
                          {{ attachment.originalName }}
                        </a-doption>
                      </template>
                    </a-dropdown>
                  </a-space>
                </template>
              </a-table-column>
            </template>
          </a-table>
          <a-empty v-if="platforms.length === 0" description="尚未维护经营平台" />
        </section>
      </a-spin>

      <div class="wizard__footer">
        <a-button :disabled="activeStep === 1 || saving" @click="activeStep -= 1">上一步</a-button>
        <div class="wizard__footer-actions">
          <a-button :loading="saving" :disabled="!canSaveCurrentStep" @click="saveCurrentStep(false)">保存</a-button>
          <a-button v-if="activeStep < 5" type="primary" :loading="saving" :disabled="!canSaveCurrentStep" @click="saveCurrentStep(true)">保存并下一步</a-button>
          <a-button v-else type="primary" :loading="saving" :disabled="!draft" @click="openFinalPreview">预览并提交</a-button>
        </div>
      </div>
    </div>

    <a-modal
      v-model:visible="platformModalVisible"
      :title="editingPlatform ? '修改经营平台' : '新增经营平台'"
      :width="640"
      :mask-closable="false"
      @before-ok="savePlatform"
    >
      <a-form :model="platformForm" layout="vertical">
        <div class="form-grid">
          <a-form-item label="平台编码" required><a-input v-model="platformForm.platformCode" :disabled="!!editingPlatform" :max-length="64" /></a-form-item>
          <a-form-item label="认证状态" required>
            <a-select v-model="platformForm.certificationStatus">
              <a-option value="UNVERIFIED">未认证</a-option>
              <a-option value="CERTIFIED">已认证</a-option>
              <a-option value="REJECTED">认证驳回</a-option>
            </a-select>
          </a-form-item>
          <a-form-item label="店铺名称" required><a-input v-model="platformForm.storeName" :max-length="200" /></a-form-item>
          <a-form-item label="店铺标识" required><a-input v-model="platformForm.storeIdentifier" :max-length="128" /></a-form-item>
        </div>
        <a-form-item label="店铺地址"><a-input v-model="platformForm.storeUrl" :max-length="1000" /></a-form-item>
      </a-form>
    </a-modal>

    <a-modal
      v-model:visible="previewVisible"
      title="最终提交确认"
      :width="820"
      :mask-closable="false"
      :ok-button-props="{ disabled: !preview?.readyForSubmission, loading: submitting }"
      ok-text="确认提交"
      @before-ok="confirmSubmit"
    >
      <a-spin :loading="previewLoading" style="width: 100%">
        <a-alert v-if="preview && !preview.readyForSubmission" type="warning" class="wizard__alert">
          当前版本不能提交，请处理下方阻塞项后重新预览。
        </a-alert>
        <a-descriptions v-if="preview" :column="descriptionColumns" bordered>
          <a-descriptions-item label="申请编号">{{ preview.applicationNo }}</a-descriptions-item>
          <a-descriptions-item label="业务版本">{{ preview.businessVersion }}</a-descriptions-item>
          <a-descriptions-item label="渠道产品">{{ preview.channel.channelCode }} · {{ preview.channel.productCode }}</a-descriptions-item>
          <a-descriptions-item label="法定主体">{{ preview.kyc.legalName || '-' }}</a-descriptions-item>
          <a-descriptions-item label="主体标识">{{ preview.kyc.legalIdentifierMasked || '-' }}</a-descriptions-item>
          <a-descriptions-item label="结算账户">{{ preview.settlement.accountNumberMasked || '-' }}</a-descriptions-item>
          <a-descriptions-item label="定价版本">{{ preview.pricing.pricingVersionId || '-' }}</a-descriptions-item>
          <a-descriptions-item label="材料完整性">{{ preview.evidence.complete ? '完整' : '不完整' }}</a-descriptions-item>
          <a-descriptions-item label="经营平台">{{ preview.operatingPlatforms.length }}</a-descriptions-item>
        </a-descriptions>
        <a-list v-if="preview?.blockers.length" size="small" class="blocker-list">
          <a-list-item v-for="blocker in preview.blockers" :key="blocker.code">
            <a-tag color="red">{{ blocker.code }}</a-tag>
            <span>{{ blocker.message }}</span>
          </a-list-item>
        </a-list>
      </a-spin>
    </a-modal>
  </a-modal>
</template>

<script setup lang="ts">
import type { RequestOption } from '@arco-design/web-vue'
import { Message, Modal } from '@arco-design/web-vue'
import { useWindowSize } from '@vueuse/core'
import { type SaveState, completeStep, createIdempotencyKey, evidenceTypeLabel, firstIncompleteStep, isDraftConflict } from './state'
import type { MerchantResp } from '@/apis/merchant/merchant'
import type {
  EligibleChannel,
  EvidenceAttachment,
  EvidenceTypeStatus,
  KycPersonReq,
  KycProfileReq,
  KycShareholderReq,
  OnboardingDraftView,
  OnboardingFinalPreview,
  OperatingPlatform,
  OperatingPlatformReq,
  PlatformCertificationStatus,
  SettlementMode,
} from '@/apis/merchant/onboarding'
import {
  createOperatingPlatform,
  createOrLoadDraft,
  getEvidenceSummary,
  getKycAttachmentAccess,
  getOnboardingFinalPreview,
  linkOperatingPlatformProof,
  listEligibleChannels,
  listOperatingPlatforms,
  loadDraft,
  saveDraftProgress,
  saveKycProfile,
  saveSettlementAccount,
  selectOnboardingPricing,
  submitOnboarding,
  updateOperatingPlatform,
  uploadKycAttachment,
} from '@/apis/merchant/onboarding'
import { getErrorMessage } from '@/views/merchant/merchant/utils'

const emit = defineEmits<{ (e: 'submitted'): void }>()
const { width } = useWindowSize()
const modalWidth = computed(() => width.value >= 1200 ? 1120 : width.value >= 768 ? '94%' : '100%')
const descriptionColumns = computed(() => width.value >= 768 ? 3 : 1)
const visible = ref(false)
const loading = ref(false)
const saving = ref(false)
const submitting = ref(false)
const previewLoading = ref(false)
const errorMessage = ref('')
const merchant = ref<MerchantResp>()
const eligibleChannels = ref<EligibleChannel[]>([])
const selectedChannelKey = ref('')
const draftView = ref<OnboardingDraftView>()
const evidence = ref<Awaited<ReturnType<typeof getEvidenceSummary>>['data']>()
const platforms = ref<OperatingPlatform[]>([])
const preview = ref<OnboardingFinalPreview>()
const activeStep = ref(1)
const saveState = ref<SaveState>('idle')
const lastSavedAt = ref('')
const previewVisible = ref(false)
const idempotencyKey = ref('')

const steps = [
  { value: 1, title: '选择渠道' },
  { value: 2, title: '证件材料' },
  { value: 3, title: '商户信息' },
  { value: 4, title: '结算账户' },
  { value: 5, title: '定价与平台' },
]

const draft = computed(() => draftView.value?.draft)
const selectedEligibleChannel = computed(() => eligibleChannels.value.find((item) => channelKey(item) === selectedChannelKey.value)
  || eligibleChannels.value.find((item) => item.channelCode === draft.value?.channelCode && item.productCode === draft.value?.productCode))
const evidencePlaceholders = computed<EvidenceTypeStatus[]>(() => {
  const requirements = draft.value?.requirementSummary || selectedEligibleChannel.value?.requirements
  if (!requirements) return []
  return [
    ...requirements.requiredEvidenceTypes.map((evidenceType) => emptyEvidenceType(evidenceType, true)),
    ...requirements.optionalEvidenceTypes.map((evidenceType) => emptyEvidenceType(evidenceType, false)),
  ]
})
const proofAttachments = computed(() => (evidence.value?.attachments || []).filter((item) => item.scanStatus === 'CLEAN' && item.validationStatus === 'VALID'))
const canSaveCurrentStep = computed(() => activeStep.value === 1 ? !!draft.value || !!selectedEligibleChannel.value : !!draft.value)
const saveStateMeta = computed(() => {
  if (saveState.value === 'saving') return { label: '保存中', status: 'processing' as const }
  if (saveState.value === 'dirty') return { label: '有未保存修改', status: 'warning' as const }
  if (saveState.value === 'conflict') return { label: '版本冲突', status: 'danger' as const }
  if (saveState.value === 'saved') return { label: '已保存', status: 'success' as const }
  return { label: '尚未修改', status: 'normal' as const }
})

const emptyPerson = (role: KycPersonReq['role']): KycPersonReq => ({
  role,
  name: '',
  identityNumber: '',
  mobile: '',
  documentValidFrom: '',
  documentValidTo: '',
})
const emptyShareholder = (): KycShareholderReq => ({ type: 'INDIVIDUAL', name: '', identifier: '', ownershipPercent: 100 })
const emptyKycForm = (): Omit<KycProfileReq, 'expectedVersion'> => ({
  legalName: merchant.value?.legalName || '',
  legalIdentifier: '',
  licenseIssueDate: '',
  licenseExpiryDate: '',
  businessScope: '',
  address: { registeredAddress: '', operatingRegion: '', operatingAddress: '' },
  persons: [emptyPerson('LEGAL_REPRESENTATIVE'), emptyPerson('OPERATOR'), ...(merchant.value?.merchantType === 'ENTERPRISE' ? [emptyPerson('BENEFICIAL_OWNER')] : [])],
  shareholders: merchant.value?.merchantType === 'ENTERPRISE' ? [emptyShareholder()] : [],
})
const kycForm = reactive(emptyKycForm())
const settlementForm = reactive({
  mode: 'ORDINARY' as SettlementMode,
  accountHolderName: '',
  bankCode: '',
  bankBranchName: '',
  accountNumber: '',
})
const settlementModeOptions = [
  { label: '普通结算', value: 'ORDINARY' },
  { label: '加速结算', value: 'ACCELERATED' },
]

const platformModalVisible = ref(false)
const editingPlatform = ref<OperatingPlatform>()
const emptyPlatformForm = (): OperatingPlatformReq => ({
  platformCode: '',
  storeName: '',
  storeUrl: '',
  storeIdentifier: '',
  certificationStatus: 'UNVERIFIED',
})
const platformForm = reactive(emptyPlatformForm())

function channelKey(channel: Pick<EligibleChannel, 'channelCode' | 'productCode'>) {
  return `${channel.channelCode}::${channel.productCode}`
}

function emptyEvidenceType(evidenceType: string, required: boolean): EvidenceTypeStatus {
  return { evidenceType, required, totalCount: 0, cleanCount: 0, pendingScanCount: 0, invalidCount: 0, complete: !required }
}

function markDirty() {
  if (saveState.value !== 'saving') saveState.value = 'dirty'
}

function reset() {
  merchant.value = undefined
  eligibleChannels.value = []
  selectedChannelKey.value = ''
  draftView.value = undefined
  evidence.value = undefined
  platforms.value = []
  preview.value = undefined
  activeStep.value = 1
  saveState.value = 'idle'
  lastSavedAt.value = ''
  errorMessage.value = ''
  idempotencyKey.value = ''
  Object.assign(kycForm, emptyKycForm())
  Object.assign(settlementForm, { mode: 'ORDINARY', accountHolderName: '', bankCode: '', bankBranchName: '', accountNumber: '' })
}

function applyDraft(next: OnboardingDraftView) {
  draftView.value = next
  selectedChannelKey.value = channelKey(next.draft)
  lastSavedAt.value = new Date(next.draft.updateTime).toLocaleString()
}

async function loadSupportingState() {
  if (!merchant.value || !draft.value) return
  const [evidenceResult, platformResult, previewResult] = await Promise.all([
    getEvidenceSummary(merchant.value.id, draft.value.applicationId),
    listOperatingPlatforms(merchant.value.id, draft.value.applicationId),
    getOnboardingFinalPreview(merchant.value.id, draft.value.applicationId),
  ])
  evidence.value = evidenceResult.data
  platforms.value = platformResult.data
  preview.value = previewResult.data
}

async function reloadServerDraft() {
  if (!merchant.value || !draft.value) return
  loading.value = true
  try {
    const { data } = await loadDraft(merchant.value.id, draft.value.applicationId)
    applyDraft(data)
    activeStep.value = data.draft.savedStep || firstIncompleteStep(data.draft.completedSteps)
    await loadSupportingState()
    saveState.value = 'saved'
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '草稿重载失败')
  } finally {
    loading.value = false
  }
}

async function open(record: MerchantResp) {
  reset()
  merchant.value = record
  Object.assign(kycForm, emptyKycForm())
  visible.value = true
  loading.value = true
  try {
    const { data: channels } = await listEligibleChannels(record.id)
    eligibleChannels.value = channels
    const existing = record.channels.find((item) => item.applicationStatus === 'DRAFT' && item.applicationId)
    if (existing) {
      const { data } = await loadDraft(record.id, existing.applicationId)
      applyDraft(data)
      activeStep.value = data.draft.savedStep || firstIncompleteStep(data.draft.completedSteps)
      await loadSupportingState()
      saveState.value = 'saved'
    } else if (channels.length === 1) {
      selectedChannelKey.value = channelKey(channels[0])
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '入网数据加载失败')
  } finally {
    loading.value = false
  }
}

async function startDraft() {
  if (!merchant.value || !selectedEligibleChannel.value) return false
  const channel = selectedEligibleChannel.value
  const { data } = await createOrLoadDraft(merchant.value.id, channel.channelCode, channel.productCode)
  applyDraft(data)
  await loadSupportingState()
  return true
}

async function persistProgress(step: number) {
  if (!merchant.value || !draft.value) return false
  const completedSteps = completeStep(draft.value.completedSteps, step)
  const { data } = await saveDraftProgress(merchant.value.id, draft.value.applicationId, step, completedSteps, draft.value.rowVersion)
  applyDraft(data)
  return true
}

async function saveCurrentStep(goNext: boolean) {
  if (!merchant.value) return
  saving.value = true
  saveState.value = 'saving'
  errorMessage.value = ''
  try {
    if (activeStep.value === 1) {
      if (!draft.value && !await startDraft()) return
    } else if (activeStep.value === 2) {
      await refreshEvidence()
      if (!evidence.value?.complete) throw new Error('必传材料尚未全部通过校验与安全扫描')
    } else if (activeStep.value === 3) {
      validateKyc()
      const { data } = await saveKycProfile(merchant.value.id, draft.value!.applicationId, {
        ...kycForm,
        legalName: kycForm.legalName.trim(),
        legalIdentifier: kycForm.legalIdentifier.trim(),
        businessScope: kycForm.businessScope.trim(),
        expectedVersion: draft.value!.rowVersion,
      })
      draft.value!.rowVersion = data.rowVersion
    } else if (activeStep.value === 4) {
      validateSettlement()
      const { data } = await saveSettlementAccount(merchant.value.id, draft.value!.applicationId, {
        ...settlementForm,
        expectedVersion: draft.value!.rowVersion,
      })
      draft.value!.rowVersion = data.rowVersion
    } else {
      if (platforms.value.length === 0) throw new Error('请至少维护一个经营平台')
      const pricingVersionId = selectedEligibleChannel.value?.pricingVersionId || draft.value!.pricingVersionId
      if (!pricingVersionId) throw new Error('当前草稿没有可用定价版本')
      if (draft.value!.pricingVersionId !== pricingVersionId) {
        const { data } = await selectOnboardingPricing(merchant.value.id, draft.value!.applicationId, pricingVersionId, draft.value!.rowVersion)
        draft.value!.rowVersion = data.rowVersion
        draft.value!.pricingVersionId = data.pricingVersionId
      }
    }
    await persistProgress(activeStep.value)
    await loadSupportingState()
    saveState.value = 'saved'
    if (goNext && activeStep.value < 5) activeStep.value += 1
    Message.success('草稿已保存')
  } catch (error) {
    handleSaveError(error)
  } finally {
    saving.value = false
  }
}

function handleSaveError(error: unknown) {
  if (isDraftConflict(error)) {
    saveState.value = 'conflict'
    Modal.warning({
      title: '草稿版本已变化',
      content: '另一会话已经保存了更新版本。请重载服务器版本后继续，当前页面不会覆盖新数据。',
      okText: '重载服务器版本',
      hideCancel: false,
      onOk: reloadServerDraft,
    })
    return
  }
  saveState.value = 'dirty'
  errorMessage.value = getErrorMessage(error)
}

function createEvidenceUpload(evidenceType: string) {
  return (options: RequestOption) => {
    const controller = new AbortController()
    ;(async () => {
      const { fileItem, onProgress, onSuccess, onError } = options
      if (!draft.value || !fileItem.file) return
      try {
        onProgress(20)
        const response = await uploadKycAttachment(draft.value.kycVersionId, evidenceType, fileItem.file)
        onProgress(100)
        onSuccess(response)
        await refreshEvidence()
        markDirty()
        Message.success('材料已上传')
      } catch (error) {
        onError(error)
      }
    })()
    return { abort: () => controller.abort() }
  }
}

async function refreshEvidence() {
  if (!merchant.value || !draft.value) return
  const { data } = await getEvidenceSummary(merchant.value.id, draft.value.applicationId)
  evidence.value = data
}

async function viewAttachment(attachmentId: string) {
  try {
    const { data } = await getKycAttachmentAccess(attachmentId)
    window.open(data.url, '_blank', 'noopener,noreferrer')
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '附件临时访问失败')
  }
}

function validateKyc() {
  const values = [kycForm.legalName, kycForm.legalIdentifier, kycForm.licenseIssueDate, kycForm.licenseExpiryDate, kycForm.businessScope, kycForm.address.registeredAddress, kycForm.address.operatingRegion, kycForm.address.operatingAddress]
  if (values.some((value) => !String(value || '').trim())) throw new Error('请完整填写主体、证照、地址和经营范围')
  if (kycForm.persons.some((person) => !person.name || !person.identityNumber || !person.mobile || !person.documentValidFrom || !person.documentValidTo)) {
    throw new Error('请完整填写法人、经办人和受益所有人资料')
  }
  if (merchant.value?.merchantType === 'ENTERPRISE') {
    if (kycForm.shareholders.some((item) => !item.name || !item.identifier || !item.ownershipPercent)) throw new Error('请完整填写股东资料')
    const total = kycForm.shareholders.reduce((sum, item) => sum + Number(item.ownershipPercent || 0), 0)
    if (Math.abs(total - 100) > 0.0001) throw new Error('股东持股比例合计必须为 100%')
  }
}

function validateSettlement() {
  if ([settlementForm.accountHolderName, settlementForm.bankCode, settlementForm.bankBranchName, settlementForm.accountNumber].some((value) => !value.trim())) {
    throw new Error('请完整填写结算账户资料')
  }
}

function addBeneficiary() {
  kycForm.persons.push(emptyPerson('BENEFICIAL_OWNER'))
  markDirty()
}

function canRemovePerson(role: KycPersonReq['role']) {
  return role === 'BENEFICIAL_OWNER' && kycForm.persons.filter((item) => item.role === role).length > 1
}

function removePerson(index: number) {
  kycForm.persons.splice(index, 1)
  markDirty()
}

function addShareholder() {
  kycForm.shareholders.push({ ...emptyShareholder(), ownershipPercent: 0 })
  markDirty()
}

function removeShareholder(index: number) {
  kycForm.shareholders.splice(index, 1)
  markDirty()
}

function personRoleLabel(role: KycPersonReq['role']) {
  return { LEGAL_REPRESENTATIVE: '法定代表人', OPERATOR: '经办人', BENEFICIAL_OWNER: '受益所有人' }[role]
}

function attachmentStatusColor(record: EvidenceAttachment) {
  if (record.scanStatus === 'CLEAN' && record.validationStatus === 'VALID') return 'green'
  if (record.scanStatus === 'INFECTED' || record.validationStatus === 'INVALID') return 'red'
  return 'orange'
}

function attachmentStatusLabel(record: EvidenceAttachment) {
  if (record.scanStatus === 'CLEAN' && record.validationStatus === 'VALID') return '可用'
  if (record.scanStatus === 'INFECTED') return '安全扫描未通过'
  if (record.validationStatus === 'INVALID') return '内容校验未通过'
  return '待安全扫描'
}

function platformStatusLabel(status: PlatformCertificationStatus) {
  return { UNVERIFIED: '未认证', CERTIFIED: '已认证', REJECTED: '认证驳回' }[status]
}

function openPlatformModal(platform?: OperatingPlatform) {
  editingPlatform.value = platform
  Object.assign(platformForm, platform
    ? {
        platformCode: platform.platformCode,
        storeName: platform.storeName,
        storeUrl: platform.storeUrl || '',
        storeIdentifier: platform.storeIdentifier,
        certificationStatus: platform.certificationStatus,
      }
    : emptyPlatformForm())
  platformModalVisible.value = true
}

async function savePlatform() {
  if (!merchant.value || !draft.value) return false
  if (!platformForm.platformCode.trim() || !platformForm.storeName.trim() || !platformForm.storeIdentifier.trim()) {
    Message.warning('请完整填写平台编码、店铺名称和店铺标识')
    return false
  }
  try {
    if (editingPlatform.value) {
      await updateOperatingPlatform(merchant.value.id, draft.value.applicationId, editingPlatform.value.id, {
        storeName: platformForm.storeName.trim(),
        storeUrl: platformForm.storeUrl?.trim() || undefined,
        storeIdentifier: platformForm.storeIdentifier.trim(),
        certificationStatus: platformForm.certificationStatus,
        expectedVersion: editingPlatform.value.rowVersion,
      })
    } else {
      await createOperatingPlatform(merchant.value.id, draft.value.applicationId, {
        ...platformForm,
        platformCode: platformForm.platformCode.trim().toUpperCase(),
        storeName: platformForm.storeName.trim(),
        storeUrl: platformForm.storeUrl?.trim() || undefined,
        storeIdentifier: platformForm.storeIdentifier.trim(),
      })
    }
    const { data } = await listOperatingPlatforms(merchant.value.id, draft.value.applicationId)
    platforms.value = data
    markDirty()
    Message.success('经营平台已保存')
    return true
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '经营平台保存失败')
    return false
  }
}

async function linkProof(platform: OperatingPlatform, attachment: EvidenceAttachment) {
  if (!merchant.value || !draft.value) return
  try {
    await linkOperatingPlatformProof(merchant.value.id, draft.value.applicationId, platform.id, attachment.attachmentId, attachment.evidenceType)
    const { data } = await listOperatingPlatforms(merchant.value.id, draft.value.applicationId)
    platforms.value = data
    markDirty()
    Message.success('经营平台证明已关联')
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '证明关联失败')
  }
}

async function openFinalPreview() {
  if (!merchant.value || !draft.value) return
  if (!draft.value.completedSteps.includes(5) || saveState.value === 'dirty') {
    await saveCurrentStep(false)
    if (saveState.value !== 'saved') return
  }
  previewVisible.value = true
  previewLoading.value = true
  try {
    const { data } = await getOnboardingFinalPreview(merchant.value.id, draft.value.applicationId)
    preview.value = data
    if (!idempotencyKey.value || !idempotencyKey.value.includes(`-${data.businessVersion}-`)) {
      idempotencyKey.value = createIdempotencyKey(data.applicationId, data.businessVersion)
    }
  } catch (error) {
    errorMessage.value = getErrorMessage(error, '最终预览加载失败')
  } finally {
    previewLoading.value = false
  }
}

async function confirmSubmit() {
  if (!merchant.value || !draft.value || !preview.value?.readyForSubmission) return false
  submitting.value = true
  try {
    const { data } = await submitOnboarding(merchant.value.id, draft.value.applicationId, preview.value.businessVersion, idempotencyKey.value)
    Message.success(`申请 ${data.applicationNo} 已提交`)
    saveState.value = 'saved'
    visible.value = false
    emit('submitted')
    return true
  } catch (error) {
    handleSaveError(error)
    return false
  } finally {
    submitting.value = false
  }
}

function beforeClose() {
  if (saveState.value !== 'dirty') return true
  return new Promise<boolean>((resolve) => {
    Modal.warning({
      title: '存在未保存修改',
      content: '关闭后，本次尚未保存的修改将丢失。',
      okText: '放弃修改',
      hideCancel: false,
      onOk: () => resolve(true),
      onCancel: () => resolve(false),
    })
  })
}

defineExpose({ onOpen: open })
</script>

<style scoped>
.wizard { min-height: min(720px, calc(100vh - 140px)); display: flex; flex-direction: column; }
.wizard__heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; padding-bottom: 14px; border-bottom: 1px solid var(--color-border-2); }
.wizard__merchant, .wizard__save-state { display: flex; align-items: center; gap: 10px; min-width: 0; }
.wizard__merchant strong { font-size: 16px; }
.secondary, .step-panel__title p { color: var(--color-text-3); }
.wizard__steps { margin: 22px 0 18px; }
.wizard__alert { margin-bottom: 14px; }
.wizard__body { width: 100%; flex: 1; }
.step-panel { min-height: 420px; }
.step-panel__title { display: flex; align-items: flex-start; justify-content: space-between; gap: 16px; margin-bottom: 18px; }
.step-panel__title h3 { margin: 0 0 4px; font-size: 16px; }
.step-panel__title p { margin: 0; }
.channel-list { display: grid; gap: 10px; }
.channel-option { min-height: 72px; display: flex; align-items: center; gap: 14px; padding: 14px 16px; border: 1px solid var(--color-border-2); border-radius: 6px; cursor: pointer; }
.channel-option:has(.arco-radio-checked) { border-color: rgb(var(--primary-6)); background: var(--color-primary-light-1); }
.channel-option__main { flex: 1; display: grid; gap: 4px; }
.channel-option__main span { color: var(--color-text-3); }
.evidence-list { border-top: 1px solid var(--color-border-2); }
.evidence-row { min-height: 64px; display: grid; grid-template-columns: minmax(180px, 1fr) minmax(180px, auto) auto; align-items: center; gap: 14px; border-bottom: 1px solid var(--color-border-2); }
.evidence-row__name, .evidence-row__status { display: flex; align-items: center; gap: 8px; }
.evidence-row__status { color: var(--color-text-3); }
.warning { color: rgb(var(--warning-6)); }
.danger { color: rgb(var(--danger-6)); }
.attachment-table, .pricing-summary, .blocker-list { margin-top: 18px; }
.saved-summary { margin-bottom: 18px; }
.form-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0 16px; }
.form-grid--three { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.form-grid--four { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.repeat-row { padding: 14px 0 4px; border-bottom: 1px solid var(--color-border-2); }
.repeat-row__heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.wizard__footer { position: sticky; bottom: 0; display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 22px; padding-top: 14px; background: var(--color-bg-2); border-top: 1px solid var(--color-border-2); }
.wizard__footer-actions { display: flex; gap: 10px; }
.blocker-list :deep(.arco-list-item) { display: flex; gap: 10px; justify-content: flex-start; }
@media (max-width: 900px) {
  .form-grid--three, .form-grid--four { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .wizard__heading, .step-panel__title { align-items: stretch; flex-direction: column; }
  .wizard__save-state { flex-wrap: wrap; }
  .wizard__steps { overflow-x: auto; padding-bottom: 8px; }
  .form-grid, .form-grid--three, .form-grid--four { grid-template-columns: 1fr; }
  .evidence-row { grid-template-columns: 1fr auto; padding: 12px 0; }
  .evidence-row__status { grid-column: 1 / -1; }
  .wizard__footer { align-items: stretch; flex-direction: column-reverse; }
  .wizard__footer-actions { display: grid; grid-template-columns: 1fr 1fr; }
  .wizard__footer > .arco-btn, .wizard__footer-actions .arco-btn { width: 100%; }
}
</style>
