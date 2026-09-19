// Primitives
export { Icon } from './components/common/Icon/Icon';
export { default as PillButton } from './components/common/PillButton/PillButton';
export type { PillButtonProps } from './components/common/PillButton/PillButton';
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

export { default as ScrollArea } from './components/common/ScrollArea/ScrollArea';
export type { ScrollAreaProps } from './components/common/ScrollArea/ScrollArea';

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
export { Toast, ToastContainer } from './components/common/Toast/Toast';
export type { ToastMessage } from './components/common/Toast/Toast';
export { default as MobileFullPageModal } from './components/common/MobileFullPageModal/MobileFullPageModal';
export { default as MobileHeader } from './components/common/MobileHeader/MobileHeader';
export { default as MobileMenu } from './components/common/MobileMenu/MobileMenu';
export type { MobileMenuProps } from './components/common/MobileMenu/MobileMenu';
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
