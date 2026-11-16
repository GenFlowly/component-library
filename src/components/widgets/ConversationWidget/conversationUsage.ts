import { ConversationBlock } from './conversation.models';

/** One vendor's usage summed over a conversation's responses. */
export interface VendorUsageTotals {
  vendor: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  tokensReadFromCache: number;
  /** Null when none of the vendor's responses carries a cost. */
  costUsd: number | null;
}

/**
 * Per-vendor totals of every response with usage data, in the order the
 * vendors first answered. Responses without any usage field are skipped, so
 * a vendor that only failed or is still streaming has no entry.
 */
export function conversationUsageByVendor(
  blocks: ConversationBlock[]
): VendorUsageTotals[] {
  const totals = new Map<string, VendorUsageTotals>();
  for (const block of blocks) {
    for (const msg of block.responseMessages) {
      if (!msg.aiVendor) continue;
      const hasUsage =
        msg.inputTokens != null ||
        msg.outputTokens != null ||
        msg.totalTokens != null ||
        msg.costUsd != null;
      if (!hasUsage) continue;
      const prev = totals.get(msg.aiVendor) ?? {
        vendor: msg.aiVendor,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        tokensReadFromCache: 0,
        costUsd: null,
      };
      totals.set(msg.aiVendor, {
        vendor: msg.aiVendor,
        inputTokens: prev.inputTokens + (msg.inputTokens ?? 0),
        outputTokens: prev.outputTokens + (msg.outputTokens ?? 0),
        totalTokens: prev.totalTokens + (msg.totalTokens ?? 0),
        tokensReadFromCache:
          prev.tokensReadFromCache + (msg.tokensReadFromCache ?? 0),
        costUsd:
          msg.costUsd != null
            ? (prev.costUsd ?? 0) + msg.costUsd
            : prev.costUsd,
      });
    }
  }
  return Array.from(totals.values());
}

/** "$1.23" / "$0.0421": sub-dollar amounts keep enough decimals for sub-cent costs. */
export function formatUsd(cost: number): string {
  return cost >= 1 ? `$${cost.toFixed(2)}` : `$${cost.toFixed(4)}`;
}
