import { AIVendor } from './vendors';
import { AttachmentRef } from './attachment.models';
import type { ActivityEvent } from '../ActivityPanel/activity.models';

/**
 * A web-search source backing an inline [n] citation marker in the response
 * text. `index` matches the bracketed number the model emits.
 */
export interface WebSource {
  index: number;
  title: string;
  url: string;
  /** The site's icon URL, when the search provider returned one. */
  favicon?: string;
  /** Publish date as the provider sent it; a calendar date. */
  published_date?: string;
}

/**
 * One fact the async memory-extraction pipeline learned about the user from an
 * exchange. `memoryId` is the handle for deleting it from memory again.
 */
export interface LearnedFact {
  memoryId: string;
  text: string;
}

/**
 * Represents a single AI model's response.
 */
export interface Message {
  /** Vendor id: legacy enum name (OPENAI/CLAUDE/GEMINI) or a BYOK provider id */
  aiVendor: string;
  /** Model that generated this response (e.g. "gpt-4o") */
  model?: string | null;
  text: string;
  messageId: string;
  previousMessageId?: string;
  isLoading?: boolean;
  /**
   * Reason the generation failed for this vendor, if it did. Any text
   * streamed before the failure is kept in `text`; the UI renders the
   * error below it. Only ever set client-side — never persisted.
   */
  error?: string | null;
  /**
   * The turn's activity log (contract v2): the `ac` events in stream order,
   * live and as persisted. Everything the thinking panel shows comes from it.
   */
  activity?: ActivityEvent[] | null;
  /**
   * The vendor's raw finish reason for this turn (end_turn / stop /
   * max_tokens / refusal / content_filter / …). Streamed live via the "sr"
   * chunk and persisted; drives the footer note explaining why generation
   * ended (subtle for a normal finish, prominent for a refusal/truncation).
   * Absent for records predating the feature.
   */
  stopReason?: string | null;
  /**
   * Web-search sources for the [n] citation markers in `text`. Streamed live
   * via the "ws" chunk and persisted in DDB; absent when no web search ran.
   */
  webSources?: WebSource[] | null;
  /**
   * Files built-in tools produced during the turn (e.g. PDFs from
   * generate_pdf), stored in the attachments bucket. Streamed live via the
   * "ga" chunk and persisted on the assistant message; download URLs are
   * fetched on demand via the attachments endpoint.
   */
  generatedAttachments?: AttachmentRef[] | null;
  inputTokens?: number | null;
  outputTokens?: number | null;
  totalTokens?: number | null;
  tokensReadFromCache?: number | null;
  /**
   * Exact USD cost of this response (vendor-reported token buckets priced at
   * the model-catalog rates, computed server-side and persisted per message).
   * Null for responses persisted before cost tracking.
   */
  costUsd?: number | null;
  /**
   * Facts the async memory extraction learned about the user from this
   * exchange. Only set for messages loaded from history: an array (possibly
   * empty) when extraction finished, null when the backend doesn't know
   * (pending/legacy). Messages generated in this session leave it undefined —
   * the UI polls the learned-facts endpoint for those instead.
   */
  learnedFacts?: LearnedFact[] | null;
}

/**
 * Display identity of the user who sent a prompt, resolved server-side from
 * the message's customerId. Matters when viewing a shared conversation, where
 * the author is not the viewer.
 */
export interface MessageSender {
  customerId: string;
  name?: string | null;
  picture?: string | null;
}

/**
 * Represents a single conversation block consisting of:
 * - a user’s markdown input
 * - the AI-generated messages
 * - loading state
 */
export interface ConversationBlock {
  conversationBlockId: string;
  prompt: string;
  /** Image attachments sent with the prompt (S3 references, bytes live in the bucket) */
  attachments?: AttachmentRef[];
  responseMessages: Message[];
  isLoading: boolean;
  status: 'draft' | 'resolved';
  /**
   * Epoch ms of when the prompt was sent to the generation API. Stamped
   * client-side on send; for conversations loaded from history it comes from
   * the backend's promptCreatedAt (the user message's DDB createdAt). Absent
   * only for records predating the timestamp plumbing.
   */
  sentAt?: number;
  /**
   * Author of the prompt, from the backend's per-message sender. Absent for
   * blocks created live in this session (the viewer is the author then) and
   * for history loaded from servers predating the field.
   */
  sender?: MessageSender;
}

/**
 * Shape of the Conversation Context for managing:
 * - all conversation blocks
 * - CRUD operations on blocks
 * - generation workflow
 * - selected response per block
 *
 * The host app implements this (typically backed by its own React context and
 * generation services) and injects it via ConversationWidgetProvider.
 */
export interface IConversationContext {
  conversationBlockList: ConversationBlock[];
  conversationId: string;
  activeBlockId: string;
  setActiveBlockId: (id: string) => void;
  systemPrompt: string;
  setSystemPrompt: (prompt: string) => void;
  addNewConversationBlock: () => void;
  addNewConversationBlockWithId: (id: string) => void;
  updateResponseInConversationBlock: (
    conversationBlockId: string,
    prompt: string
  ) => void;
  generateResponses: (
    conversationBlockId: string,
    prompt?: string,
    selectedMessageId?: string | null
  ) => void;
  generateResponsesStream: (
    conversationBlockId: string,
    prompt?: string,
    selectedMessageId?: string | null,
    vendorToRegenerate?: AIVendor,
    attachments?: AttachmentRef[]
  ) => void;
  stopGenerating: (blockId?: string, vendor?: string) => void;
  /**
   * Fork the loaded conversation at the given response message: creates a new
   * conversation containing everything up to and including that message and
   * navigates to it. Optional — hosts without forking don't show the button.
   */
  forkConversation?: (messageId: string) => void | Promise<void>;

  /** Per-block selected response management */
  selectedResponseByBlock: Record<string, string | null>;
  setSelectedResponseForBlock: (blockId: string, responseId: string) => void;
  getSelectedResponseForBlock: (blockId: string) => string | null;

  /** Per-block vendor visibility (which vendors are toggled on) */
  getVendorSelectionForBlock: (blockId: string) => string[];
  setVendorSelectionForBlock: (blockId: string, vendors: string[]) => void;
  loadConversation: (id: string) => Promise<void>;
  resetConversation: () => void;
  /**
   * Project the NEXT brand-new conversation will be created into (set by the
   * history sidebar's per-project "new conversation" action; cleared by
   * resetConversation). Optional: hosts without projects don't model it.
   */
  pendingProjectId?: string | null;
  /** Reset to a fresh conversation that will be born inside [projectId]. */
  startConversationInProject?: (projectId: string) => void;
  /**
   * Drop the pending project and keep the draft: the next conversation is
   * born outside any project (its project was deleted meanwhile).
   */
  clearPendingProject?: () => void;

  /** Active Instruction Management */
  selectedInstructionId: string | null;
  setSelectedInstructionId: (id: string | null) => void;

  conversationTitle: string | null;

  /** Caller's role on the loaded conversation. Defaults to OWNER for new/unloaded state. */
  conversationRole: 'OWNER' | 'EDIT' | 'VIEW';
}

/**
 * Fast-changing UI state kept OUT of IConversationContext so typing
 * (editorPrompt) and scrolling (activeViewportItem) don't re-render the
 * whole conversation tree.
 */
export interface IConversationUIContext {
  editorPrompt: string;
  setEditorPrompt: (prompt: string) => void;
  activeViewportItem: { blockId: string; type: 'request' | 'response' } | null;
  setActiveViewportItem: (
    item: { blockId: string; type: 'request' | 'response' } | null
  ) => void;
}
