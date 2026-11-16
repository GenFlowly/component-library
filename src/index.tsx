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

export { ErrorBoundary } from './components/common/ErrorBoundary/ErrorBoundary';
export type { ErrorBoundaryProps } from './components/common/ErrorBoundary/ErrorBoundary';
export { default as ScrollArea } from './components/common/ScrollArea/ScrollArea';
export type { ScrollAreaProps } from './components/common/ScrollArea/ScrollArea';
export { Grid, GridCol } from './components/common/Grid/Grid';
export type {
  GridProps,
  GridColProps,
  GridSpan,
} from './components/common/Grid/Grid';
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
export { default as CopyToClipboard } from './components/common/CopyToClipboard/CopyToClipboard';
export {
  default as SidebarListPanel,
  SidebarListLoadMore,
  sidebarListPanelStyles,
} from './components/common/SidebarListPanel/SidebarListPanel';
export type {
  SidebarListItem,
  SidebarListItemAction,
  SidebarListGroup,
  SidebarListPanelProps,
} from './components/common/SidebarListPanel/SidebarListPanel';
export { default as ResizableSidebar } from './components/common/ResizableSidebar/ResizableSidebar';
export type { ResizableSidebarProps } from './components/common/ResizableSidebar/ResizableSidebar';
export { default as VerticalSplit } from './components/common/VerticalSplit/VerticalSplit';
export type { VerticalSplitProps } from './components/common/VerticalSplit/VerticalSplit';
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
export { default as SidebarCard } from './components/common/SidebarCard/SidebarCard';
export type { SidebarCardProps } from './components/common/SidebarCard/SidebarCard';
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
  ThinkingStep,
  ThinkingStepKind,
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
export { applyThinkingStep } from './components/widgets/ConversationWidget/thinkingStepUtils';
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
