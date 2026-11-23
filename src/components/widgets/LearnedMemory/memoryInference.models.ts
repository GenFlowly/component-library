/** Wire shapes of GET /api/v1/memories/{memoryId}/inference/{runId}. */

export interface MemoryRunResponse {
  messageId: string;
  vendor: string;
  model?: string | null;
}

export interface MemoryRunOperation {
  op: string;
  memoryId?: string | null;
  text?: string | null;
  reason?: string | null;
  messageIndex?: number | null;
  /** applied, noop or error */
  outcome: string;
  /** The memory this operation made has since been deleted. */
  memoryDeleted?: boolean;
}

export interface MemoryRun {
  runId: string;
  source: string;
  conversationId?: string | null;
  projectId?: string | null;
  turnMessageId?: string | null;
  messageIds: string[];
  responsesRead: MemoryRunResponse[];
  existingShown: number;
  agentId?: string | null;
  agentVersion?: number | null;
  vendor?: string | null;
  model?: string | null;
  startedAt: string;
  durationMs: number;
  inputTokens?: number | null;
  outputTokens?: number | null;
  costUsd?: number | null;
  operations: MemoryRunOperation[];
  truncated?: boolean;
}

export interface MemoryInferenceExcerpt {
  messageId: string;
  role: string;
  vendor?: string | null;
  index: number;
  text: string;
  taken: boolean;
}

export interface MemoryInferencePlacement {
  projectId?: string | null;
  kind: string;
}

export interface MemoryInferenceMemory {
  memoryId: string;
  text: string;
  kind: string;
  category?: string | null;
  version: number;
  placements: MemoryInferencePlacement[];
  createdAt: string;
  updatedAt: string;
}

export interface MemoryInferenceChange {
  changeId: string;
  type: string;
  createdAt: string;
  version?: number | null;
  reason?: string | null;
  messageId?: string | null;
  runId?: string | null;
}

export interface MemoryInference {
  memory: MemoryInferenceMemory;
  change?: MemoryInferenceChange | null;
  run: MemoryRun;
  excerpts: MemoryInferenceExcerpt[];
  conversationTitle?: string | null;
  conversationDeleted: boolean;
}
