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
  /**
   * Fork the loaded conversation at the given response message: the host
   * creates a new conversation containing everything up to and including that
   * message. Optional — hosts without forking simply don't get the button.
   */
  forkConversation?: (messageId: string) => void | Promise<void>;
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
 * no uploadAttachment → image paste/attach is off; no getAttachmentViewUrl →
 * attachment thumbnails/downloads don't render; no getLearnedFacts → the
 * learned-facts stat is hidden; no getVendorDisplayName → title-cased
 * fallback names. uploadAttachment receives an image already converted by
 * prepareImageForUpload.
 */
export interface ConversationWidgetServices {
  uploadAttachment?: (token: string, file: File) => Promise<AttachmentRef>;
  getAttachmentViewUrl?: (
    token: string,
    attachmentId: string
  ) => Promise<string>;
  getLearnedFacts?: (
    token: string,
    conversationId: string,
    messageId: string
  ) => Promise<{ status: 'pending' | 'done'; facts: LearnedFact[] }>;
  deleteMemoryFact?: (token: string, memoryId: string) => Promise<void>;
  /** Opens a memory on the Memory page. */
  openMemory?: (memoryId: string) => void;
  /** Opens "How it was inferred" for a memory learned by run [runId]. */
  openMemoryInference?: (memoryId: string, runId: string) => void;
  /** Opens the Memory page ("Manage in Memory"). */
  openMemoryPage?: () => void;
  /** Sync vendor display-name lookup (host resolves it from its provider catalog). */
  getVendorDisplayName?: (vendorId: string) => string;
}

export interface ConversationWidgetLayout {
  isLeftSidebarExpanded: boolean;
  isRightSidebarExpanded: boolean;
}

/** What the host puts into the prompt editor. */
export interface ConversationWidgetComposer {
  /**
   * Extra controls in the desktop editor's bottom bar, between the attach
   * button and Generate (e.g. the host's instruction picker chip).
   */
  controls?: React.ReactNode;
  /**
   * False when the viewer can't post (a view-only shared conversation): no
   * empty editor is added after the last finished turn. @default true
   */
  canCompose?: boolean;
}

export interface ConversationWidgetContextValue {
  conversation: ConversationWidgetApi;
  conversationUI: ConversationWidgetUiApi;
  auth: ConversationWidgetAuth;
  services?: ConversationWidgetServices;
  /** Sidebar state; both-collapsed enables the side-by-side response layout. */
  layout?: ConversationWidgetLayout;
  /** Shows a toast; `duration` (ms) is optional, for longer messages. */
  showToast?: (message: string, duration?: number) => void;
  composer?: ConversationWidgetComposer;
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

const DEFAULT_COMPOSER: ConversationWidgetComposer = {};

export function useConversationComposer(): ConversationWidgetComposer {
  return useWidgetContext().composer ?? DEFAULT_COMPOSER;
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
