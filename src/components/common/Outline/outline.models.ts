/** One turn of a conversation as the Outline lists it. */
export interface OutlineItem {
  /** The conversation block id. */
  id: string;
  /** 1-based turn number, shown as Q1, Q2, ... */
  number: number;
  prompt: string;
  /** Second line, e.g. "2 responses · Anthropic, OpenAI · 10:34 PM". */
  meta?: string;
  /** A reply is still streaming: the row shows a pulse. */
  isGenerating?: boolean;
}
