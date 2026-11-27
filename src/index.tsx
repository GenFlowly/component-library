// Primitives
export { Icon } from './components/common/Icon/Icon';
export { default as PillButton } from './components/common/PillButton/PillButton';
export type { PillButtonProps } from './components/common/PillButton/PillButton';
export { default as Chip } from './components/common/Chip/Chip';
export type { ChipProps } from './components/common/Chip/Chip';
export { default as RectangleButton } from './components/common/RectangleButton/RectangleButton';
export { InputTextWithHint } from './components/common/InputTextWithHint/InputTextWithHint';
export { InputSelectWithHint } from './components/common/InputSelectWithHint/InputSelectWithHint';
export type { SelectOption } from './components/common/InputSelectWithHint/InputSelectWithHint';
export { default as PillButtonGroup } from './components/common/PillButtonGroup/PillButtonGroup';
export type { ToggleOption } from './components/common/PillButtonGroup/PillButtonGroup';
export { default as CheckboxButtonGroup } from './components/common/PillButtonGroup/CheckboxButtonGroup';
export { default as RadioButtonGroup } from './components/common/PillButtonGroup/RadioButtonGroup';
export {
  default as PageHeader,
  pageHeaderStyles,
} from './components/common/PageHeader/PageHeader';
export { default as Breadcrumbs } from './components/common/Breadcrumbs/Breadcrumbs';
export type { BreadcrumbItem } from './components/common/Breadcrumbs/Breadcrumbs';

export {
  ErrorBoundary,
  setErrorBoundaryReporter,
} from './components/common/ErrorBoundary/ErrorBoundary';
export type {
  ErrorBoundaryProps,
  ErrorBoundaryReporter,
} from './components/common/ErrorBoundary/ErrorBoundary';
export { default as ScrollArea } from './components/common/ScrollArea/ScrollArea';
export type { ScrollAreaProps } from './components/common/ScrollArea/ScrollArea';
export { Grid, GridCol } from './components/common/Grid/Grid';
export type {
  GridProps,
  GridColProps,
  GridSpan,
} from './components/common/Grid/Grid';
export { default as DesktopOptimalReadingWidthContainer } from './components/common/DesktopOptimalReadingWidthContainer/DesktopOptimalReadingWidthContainer';
export type { DesktopOptimalReadingWidthContainerProps } from './components/common/DesktopOptimalReadingWidthContainer/DesktopOptimalReadingWidthContainer';
export { default as ChatReadingWidthContainer } from './components/common/DesktopOptimalReadingWidthContainer/ChatReadingWidthContainer';
export type { ChatReadingWidthContainerProps } from './components/common/DesktopOptimalReadingWidthContainer/ChatReadingWidthContainer';
export {
  default as DateRangePicker,
  DEFAULT_DATE_RANGE_PRESETS,
} from './components/common/DateRangePicker/DateRangePicker';
export type {
  DateRange,
  DateRangePreset,
  DateRangePickerProps,
} from './components/common/DateRangePicker/DateRangePicker';

// Overlays and self-contained UI
export { default as Modal } from './components/common/Modal/Modal';
export { default as Tooltip } from './components/common/Tooltip/Tooltip';
export { default as CitationTooltip } from './components/common/CitationTooltip/CitationTooltip';
export type { CitationTooltipProps } from './components/common/CitationTooltip/CitationTooltip';
export { default as CitationChip } from './components/common/CitationTooltip/CitationChip';
export type { CitationChipProps } from './components/common/CitationTooltip/CitationChip';
export { default as CopyToClipboard } from './components/common/CopyToClipboard/CopyToClipboard';
export {
  SidebarListLoadMore,
  sidebarListPanelStyles,
} from './components/common/SidebarListPanel/SidebarListPanel';
export type {
  SidebarListItem,
  SidebarListItemAction,
  SidebarListGroup,
} from './components/common/SidebarListPanel/SidebarListPanel';
export { default as ResizableSidebar } from './components/common/ResizableSidebar/ResizableSidebar';
export type { ResizableSidebarProps } from './components/common/ResizableSidebar/ResizableSidebar';
export { default as SidebarStack } from './components/common/SidebarStack/SidebarStack';
export type { SidebarStackProps } from './components/common/SidebarStack/SidebarStack';
export { Toast, ToastContainer } from './components/common/Toast/Toast';
export type { ToastMessage } from './components/common/Toast/Toast';
export { default as MobileFullPageModal } from './components/common/MobileFullPageModal/MobileFullPageModal';
export { default as MobileHeader } from './components/common/MobileHeader/MobileHeader';
export { default as MobileMenu } from './components/common/MobileMenu/MobileMenu';
export type {
  MobileMenuProps,
  MobileMenuAction,
} from './components/common/MobileMenu/MobileMenu';
export { default as MenuSearchField } from './components/common/MenuSearchField/MenuSearchField';
export type { MenuSearchFieldProps } from './components/common/MenuSearchField/MenuSearchField';
export { default as SidebarWidget } from './components/common/SidebarWidget/SidebarWidget';
export type {
  SidebarWidgetProps,
  SidebarWidgetCustomProps,
  SidebarWidgetListProps,
  SidebarWidgetHistoryProps,
  SidebarWidgetDirectoryProps,
  SidebarWidgetMenuProps,
  SidebarWidgetList,
  SidebarWidgetMenu,
} from './components/common/SidebarWidget/SidebarWidget';
export { default as ActionMenu } from './components/common/ActionMenu/ActionMenu';
export type {
  ActionMenuProps,
  ActionMenuItem,
} from './components/common/ActionMenu/ActionMenu';
export { default as IconButton } from './components/common/IconButton/IconButton';
export type { IconButtonProps } from './components/common/IconButton/IconButton';
export { default as CollapseStrip } from './components/common/CollapseStrip/CollapseStrip';
export type { CollapseStripProps } from './components/common/CollapseStrip/CollapseStrip';
export { default as SidebarRail } from './components/common/SidebarRail/SidebarRail';
export type {
  SidebarRailProps,
  SidebarRailItem,
  SidebarRailTab,
} from './components/common/SidebarRail/SidebarRail';
export { default as Switch } from './components/common/Switch/Switch';
export type { SwitchProps } from './components/common/Switch/Switch';
export { default as ConversationSubBar } from './components/common/ConversationSubBar/ConversationSubBar';
export type { ConversationSubBarProps } from './components/common/ConversationSubBar/ConversationSubBar';
export { default as OutlineMenu } from './components/common/Outline/OutlineMenu';
export type { OutlineMenuProps } from './components/common/Outline/OutlineMenu';
export { default as OutlineSheet } from './components/common/Outline/OutlineSheet';
export type { OutlineSheetProps } from './components/common/Outline/OutlineSheet';
export type { OutlineItem } from './components/common/Outline/outline.models';
export type {
  MobileHeaderProps,
  MobileHeaderMenuItem,
  MobileHeaderTrailingAction,
} from './components/common/MobileHeader/MobileHeader';

// Branding
export { UserAvatarButton } from './components/common/UserAvatarButton/UserAvatarButton';

// Cards
export { default as AttachmentCard } from './components/common/AttachmentCard/AttachmentCard';
export type { AttachmentCardProps } from './components/common/AttachmentCard/AttachmentCard';
export { default as InstructionTile } from './components/common/InstructionTile/InstructionTile';
export type {
  InstructionTileProps,
  InstructionTileOwner,
} from './components/common/InstructionTile/InstructionTile';

// Content rendering / editing
export {
  default as TextContainer,
  extractText,
  PreBlock,
} from './components/common/TextContainer/TextContainer';
export type { TextContainerProps } from './components/common/TextContainer/TextContainer';
export {
  default as ReaderFriendlyTextContainer,
  ReaderLink,
} from './components/common/ReaderFriendlyTextContainer/ReaderFriendlyTextContainer';
export type { ReaderFriendlyTextContainerProps } from './components/common/ReaderFriendlyTextContainer/ReaderFriendlyTextContainer';
export {
  linkifyCitations,
  countCitations,
  rehypeCitationRuns,
} from './components/common/ReaderFriendlyTextContainer/citations';
export { default as TextEditor } from './components/widgets/TextEditorWidget/TextEditor';

// Pages
export { default as InstructionEditor } from './components/widgets/InstructionEditorWidget/InstructionEditor';
export type {
  InstructionEditorProps,
  InstructionEditorLabels,
  InstructionVersionItem,
} from './components/widgets/InstructionEditorWidget/InstructionEditor';

// Graph editing
export { default as GraphEditor } from './components/widgets/GraphEditorWidget/GraphEditor';
export {
  END_NODE_ID,
  REFLECTION_NODE_TYPE,
  DEFAULT_ROUTE_LABEL,
} from './components/widgets/GraphEditorWidget/types';
export {
  DEFAULT_NODE_TYPE_INFOS,
  mergeNodeTypeInfos,
  colorForNodeType,
} from './components/widgets/GraphEditorWidget/nodeTypeInfo';
export type {
  AgentGraph,
  AgentGraphNode,
  NodeCatalogEntry,
  NodeTypeInfo,
  InstructionOption,
  ConditionOption,
  ConditionType,
  GraphEditorProps,
  GraphEditorLabels,
  ValidationIssue,
} from './components/widgets/GraphEditorWidget/types';
export { validateAgentGraph } from './components/widgets/GraphEditorWidget/validation';

// Agents
export {
  default as AgentMaker,
  emptyAgentMakerValues,
} from './components/widgets/AgentMakerWidget/AgentMaker';
export type {
  AgentMakerProps,
  AgentMakerValues,
  AgentMakerInstructionOption,
  AgentMakerVendorOption,
  AgentMakerActionHint,
  AgentMakerNode,
  AgentMakerStrings,
} from './components/widgets/AgentMakerWidget/AgentMaker';

// Settings
export {
  CredentialCard,
  CredentialStatusPill,
} from './components/common/CredentialCard/CredentialCard';
export type {
  CredentialCardProps,
  CredentialStatusPillProps,
  CredentialStatusPillKind,
} from './components/common/CredentialCard/CredentialCard';
export { default as VendorApiKeysManager } from './components/widgets/VendorApiKeysManager/VendorApiKeysManager';
export { default as StatusPill } from './components/common/StatusPill/StatusPill';
export type {
  StatusPillProps,
  StatusPillKind,
} from './components/common/StatusPill/StatusPill';
export { default as SettingsCard } from './components/common/SettingsCard/SettingsCard';
export type { SettingsCardProps } from './components/common/SettingsCard/SettingsCard';
export { default as SettingsRow } from './components/common/SettingsCard/SettingsRow';
export type { SettingsRowProps } from './components/common/SettingsCard/SettingsRow';
export { default as ToggleRow } from './components/common/ToggleRow/ToggleRow';
export type { ToggleRowProps } from './components/common/ToggleRow/ToggleRow';
export { default as KnowledgeStrip } from './components/common/KnowledgeStrip/KnowledgeStrip';
export type {
  KnowledgeStripProps,
  KnowledgeItem,
} from './components/common/KnowledgeStrip/KnowledgeStrip';
export { default as StatTile } from './components/common/StatTile/StatTile';
export type { StatTileProps } from './components/common/StatTile/StatTile';
export { default as DataTable } from './components/common/DataTable/DataTable';
export type {
  DataTableProps,
  DataTableColumn,
} from './components/common/DataTable/DataTable';
export { default as TypedConfirmDialog } from './components/common/TypedConfirmDialog/TypedConfirmDialog';
export type { TypedConfirmDialogProps } from './components/common/TypedConfirmDialog/TypedConfirmDialog';
export type {
  TreeMenuItem,
  TreeMenuLeaf,
  TreeMenuSearchHit,
} from './components/common/TreeMenu/TreeMenu';
export { default as SlideOverPanel } from './components/common/SlideOverPanel/SlideOverPanel';
export type { SlideOverPanelProps } from './components/common/SlideOverPanel/SlideOverPanel';
export { default as InfoDrawer } from './components/common/InfoDrawer/InfoDrawer';
export type { InfoDrawerProps } from './components/common/InfoDrawer/InfoDrawer';
export { default as SettingsPageLayout } from './components/common/SettingsPageLayout/SettingsPageLayout';
export type {
  SettingsPageLayoutProps,
  SettingsPageLayoutStrings,
} from './components/common/SettingsPageLayout/SettingsPageLayout';
export { default as BarChart } from './components/common/BarChart/BarChart';
export type {
  BarChartProps,
  BarChartPoint,
} from './components/common/BarChart/BarChart';
export { formatCount, formatCompactCount } from './utils/numberFormat';
export {
  prepareImageForUpload,
  MAX_IMAGE_UPLOAD_BYTES,
  MAX_IMAGE_UPLOAD_PIXELS,
} from './utils/imageUpload';
export { bucketDailySeries } from './utils/dailySeries';
export type {
  DailyValue,
  SeriesBucket,
  BucketedSeries,
} from './utils/dailySeries';

export type {
  VendorApiKeysManagerProps,
  VendorApiKeyRowData,
  VendorKeySaveResult,
  VendorApiKeysManagerStrings,
} from './components/widgets/VendorApiKeysManager/VendorApiKeysManager';

// Conversation
export { default as ConversationWidget } from './components/widgets/ConversationWidget/ConversationWidget';
export {
  ConversationWidgetProvider,
  useConversation,
  useConversationUI,
  useConversationAuth,
  useConversationServices,
  useConversationLayout,
  useConversationComposer,
} from './components/widgets/ConversationWidget/ConversationWidgetContext';
export type {
  ConversationWidgetContextValue,
  ConversationWidgetApi,
  ConversationWidgetUiApi,
  ConversationWidgetAuth,
  ConversationWidgetServices,
  ConversationWidgetLayout,
  ConversationWidgetComposer,
  ConversationWidgetVendorKeyStatus,
} from './components/widgets/ConversationWidget/ConversationWidgetContext';
export type {
  Message,
  ConversationBlock,
  MessageSender,
  WebSource,
  LearnedFact,
  IConversationContext,
  IConversationUIContext,
} from './components/widgets/ConversationWidget/conversation.models';
export type {
  AttachmentRef,
  CreateAttachmentUploadResponse,
  GetAttachmentUrlResponse,
} from './components/widgets/ConversationWidget/attachment.models';
export {
  ALLOWED_ATTACHMENT_MEDIA_TYPES,
  MAX_ATTACHMENT_SIZE_BYTES,
  MAX_ATTACHMENTS_PER_MESSAGE,
} from './components/widgets/ConversationWidget/attachment.models';
export {
  SUPPORTED_IMAGE_FORMATS,
  checkAttachmentFormat,
} from './components/widgets/ConversationWidget/attachmentFormat';
export type { AttachmentFormatVerdict } from './components/widgets/ConversationWidget/attachmentFormat';
export { useAttachmentValidation } from './components/widgets/ConversationWidget/useAttachmentValidation';
export {
  AIVendor,
  LEGACY_BY_CATALOG_ID,
  storedVendorId,
  catalogIdFor,
  fallbackVendorDisplayName,
} from './components/widgets/ConversationWidget/vendors';
export {
  ActivityPanel,
  SourceRow,
  SiteIcon,
  reduceActivity,
  appendActivity,
  isActivityEvent,
  formatDuration,
  formatSourceDate,
  domainOf,
  ACTIVITY_VERSION,
} from './components/widgets/ActivityPanel';
export type {
  ActivityPanelProps,
  ActivityPanelView,
  SourceRowProps,
  ActivityView,
  ActivityBeat,
  ActivityPhase,
  ActivityPhaseId,
  ActivityTurnStatus,
  ActivityStepStatus,
  ActivityEvidenceGroup,
  ActivitySourceView,
  ActivityCallView,
  ReduceOptions,
  ActivityEvent,
  ActivityStepKind,
  ActivityLlmOutcome,
  ActivityCallMode,
  ActivitySource,
  ActivityToolRequest,
  ActivityToolCall,
  TodoItem,
  TurnStartEvent,
  StepStartEvent,
  StepProgressEvent,
  StepCallEvent,
  StepEndEvent,
  TurnEndEvent,
} from './components/widgets/ActivityPanel';
export {
  conversationUsageByVendor,
  formatUsd,
} from './components/widgets/ConversationWidget/conversationUsage';
export type { VendorUsageTotals } from './components/widgets/ConversationWidget/conversationUsage';
export {
  parseServerDate,
  formatServerTimestamp,
  formatServerDateTime,
  formatServerTime,
  formatServerDateOnly,
} from './components/widgets/ConversationWidget/timeUtils';
export type { PendingAttachment } from './components/widgets/ConversationWidget/AttachmentPreviewStrip';

export { MemoryCard } from './components/common/MemoryCard/MemoryCard';
export type {
  MemoryCardProps,
  MemoryCardAction,
  MemoryCardTag,
} from './components/common/MemoryCard/MemoryCard';
export {
  default as SwipeableRow,
  SwipeRowsContext,
} from './components/common/SidebarListPanel/SwipeableRow';
export { LearnedMemorySection } from './components/widgets/LearnedMemory/LearnedMemorySection';
export type { LearnedMemorySectionProps } from './components/widgets/LearnedMemory/LearnedMemorySection';
export { LearnedMemorySheet } from './components/widgets/LearnedMemory/LearnedMemorySheet';
export { ConfirmDeleteMemory } from './components/widgets/LearnedMemory/ConfirmDeleteMemory';
export { MemoryInference } from './components/widgets/LearnedMemory/MemoryInference';
export type { MemoryInferenceProps } from './components/widgets/LearnedMemory/MemoryInference';
export type {
  MemoryInference as MemoryInferenceData,
  MemoryRun,
  MemoryRunOperation,
  MemoryRunResponse,
  MemoryInferenceExcerpt,
  MemoryInferenceChange,
  MemoryInferenceMemory,
} from './components/widgets/LearnedMemory/memoryInference.models';
