import React, { createContext, useContext } from 'react';
import { AIVendor } from './vendors';
import { AttachmentRef } from './attachment.models';
import {
  ConversationBlock,
  IConversationContext,
  IConversationUIContext,
  LearnedFact,
} from './conversation.models';

/**
 * Injection seam for the conversation widget.
 *
 * The widget is presentation + interaction only: everything stateful (the
 * block list, streaming, auth, uploads) is owned by the HOST app and injected
 * through ConversationWidgetProvider. The interfaces below are the minimal
 * surfaces the widget actually consumes — a host's richer context (e.g. the
 * full IConversationContext) satisfies them structurally.
 */

/** Minimal conversation surface the widget reads/writes. */
export interface ConversationWidgetApi {
  conversationBlockList: ConversationBlock[];
  /** Backend conversation id; '' until the first response created one. */
  conversationId: string;
  setActiveBlockId: (id: string) => void;
  addNewConversationBlockWithId: (id: string) => void;
  /**
   * Start (or continue) streaming generation for a block. `vendorToRegenerate`
   * restricts the run to one vendor (the Regenerate button); `attachments` are
   * image refs already uploaded via the attachments flow.
   */
  generateResponsesStream: (
    conversationBlockId: string,
    prompt?: string,
    selectedMessageId?: string | null,
    vendorToRegenerate?: AIVendor,
    attachments?: AttachmentRef[]
  ) => void;
  stopGenerating: (blockId?: string, vendor?: string) => void;
  setSelectedResponseForBlock: (blockId: string, responseId: string) => void;
  getSelectedResponseForBlock: (blockId: string) => string | null;
  getVendorSelectionForBlock: (blockId: string) => string[];
  setVendorSelectionForBlock: (blockId: string, vendors: string[]) => void;
}

/** Fast-changing UI state surface (kept separate to limit re-renders). */
export interface ConversationWidgetUiApi {
  setEditorPrompt: (prompt: string) => void;
  setActiveViewportItem: (
    item: { blockId: string; type: 'request' | 'response' } | null
  ) => void;
}

/** Vendor API-key status entry — the subset the widget reads. */
export interface ConversationWidgetVendorKeyStatus {
  aiVendor: string;
  isAPIKeyValid: boolean;
  /** Failover priority (1 = primary); orders response columns. */
  priority?: number | null;
}

/** Identity + credentials surface injected by the host. */
export interface ConversationWidgetAuth {
  isAuthenticated: boolean;
  customerId?: string | null;
  customerName?: string | null;
  customerPicture?: string | null;
  user?: { name?: string | null; picture?: string | null } | null;
  aiVendorAPIKeyStatusList: ConversationWidgetVendorKeyStatus[];
  /** Bearer token for the injected services (Auth0 JWT or a gfy_ developer key). */
  getAccessTokenSilently: () => Promise<string>;
}

/**
 * Backend calls the widget performs directly. All optional — a missing
 * service disables the matching UI affordance instead of crashing:
 * no uploadAttachment → attaching (picker, paste, drag-and-drop) is off; no getAttachmentViewUrl →
 * attachment thumbnails/downloads don't render; no getLearnedFacts → the
 * learned-facts stat is hidden; no getVendorDisplayName → title-cased
 * fallback names.
 */
export interface ConversationWidgetServices {
  uploadAttachment?: (token: string, file: File) => Promise<AttachmentRef>;
  /**
   * Short-lived URL for viewing/downloading an attachment. `conversationId`
   * is passed whenever the attachment is shown inside a loaded conversation
   * (undefined before the first response created one): the backend then
   * checks the caller's access to that conversation and presigns the stored
   * key, so every participant of a shared conversation — including PUBLIC
   * viewers — can open files another participant uploaded or generated.
   */
  getAttachmentViewUrl?: (
    token: string,
    attachmentId: string,
    conversationId?: string
  ) => Promise<string>;
  getLearnedFacts?: (
    token: string,
    conversationId: string,
    messageId: string
  ) => Promise<{ status: 'pending' | 'done'; facts: LearnedFact[] }>;
  deleteMemoryFact?: (token: string, memoryId: string) => Promise<void>;
  /** Sync vendor display-name lookup (host resolves it from its provider catalog). */
  getVendorDisplayName?: (vendorId: string) => string;
}

export interface ConversationWidgetLayout {
  isLeftSidebarExpanded: boolean;
  isRightSidebarExpanded: boolean;
}

/**
 * What the platform and the selected models can do with attachments,
 * decided by the host (e.g. from its feature flags and model catalog).
 */
export interface ConversationWidgetCapabilities {
  /**
   * Accept PDF documents as attachments (file picker, paste and
   * drag-and-drop), within the per-PDF size and per-message count limits.
   * Off by default: enable it once the backend reads PDFs for the model.
   */
  pdfAttachments?: boolean;
  /**
   * Display names of the selected models that cannot read PDFs natively
   * (the model catalog's supportsPdfInput is false). While a PDF is
   * attached the composer explains that those models only get the PDF's
   * extracted text. Empty or omitted: no hint.
   */
  modelsWithoutPdfInput?: string[];
}

export interface ConversationWidgetContextValue {
  conversation: ConversationWidgetApi;
  conversationUI: ConversationWidgetUiApi;
  auth: ConversationWidgetAuth;
  services?: ConversationWidgetServices;
  /** Sidebar state; both-collapsed enables the side-by-side response layout. */
  layout?: ConversationWidgetLayout;
  /** Attachment capabilities; omitted = images only, no model hints. */
  capabilities?: ConversationWidgetCapabilities;
  /** Shows a toast; `duration` (ms) is optional, for longer messages. */
  showToast?: (message: string, duration?: number) => void;
}

const ConversationWidgetContext =
  createContext<ConversationWidgetContextValue | null>(null);

export function ConversationWidgetProvider({
  value,
  children,
}: {
  value: ConversationWidgetContextValue;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <ConversationWidgetContext.Provider value={value}>
      {children}
    </ConversationWidgetContext.Provider>
  );
}

function useWidgetContext(): ConversationWidgetContextValue {
  const ctx = useContext(ConversationWidgetContext);
  if (!ctx) {
    throw new Error(
      'Conversation widget components must be rendered inside a ConversationWidgetProvider'
    );
  }
  return ctx;
}

export function useConversation(): ConversationWidgetApi {
  return useWidgetContext().conversation;
}

export function useConversationUI(): ConversationWidgetUiApi {
  return useWidgetContext().conversationUI;
}

export function useConversationAuth(): ConversationWidgetAuth {
  return useWidgetContext().auth;
}

const NO_SERVICES: ConversationWidgetServices = {};

export function useConversationServices(): ConversationWidgetServices {
  return useWidgetContext().services ?? NO_SERVICES;
}

const DEFAULT_LAYOUT: ConversationWidgetLayout = {
  isLeftSidebarExpanded: false,
  isRightSidebarExpanded: false,
};

export function useConversationLayout(): ConversationWidgetLayout {
  return useWidgetContext().layout ?? DEFAULT_LAYOUT;
}

const NO_CAPABILITIES: ConversationWidgetCapabilities = {};

export function useConversationCapabilities(): ConversationWidgetCapabilities {
  return useWidgetContext().capabilities ?? NO_CAPABILITIES;
}

const NOOP_TOAST = () => undefined;

export function useToast(): {
  showToast: (message: string, duration?: number) => void;
} {
  const { showToast } = useWidgetContext();
  return { showToast: showToast ?? NOOP_TOAST };
}

/** Convenience: hosts implementing the app's full contexts can pass them straight through. */
export type { IConversationContext, IConversationUIContext };
