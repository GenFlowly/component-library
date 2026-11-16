import { conversationUsageByVendor, formatUsd } from './conversationUsage';
import { ConversationBlock } from './conversation.models';

const block = (id: string, messages: any[]): ConversationBlock =>
  ({
    conversationBlockId: id,
    prompt: 'Q',
    responseMessages: messages,
    isLoading: false,
    status: 'resolved',
  }) as ConversationBlock;

describe('conversationUsageByVendor', () => {
  test('sums each vendor across turns, in first-answer order', () => {
    const totals = conversationUsageByVendor([
      block('b1', [
        {
          messageId: 'm1',
          text: 'a',
          aiVendor: 'openai',
          inputTokens: 100,
          outputTokens: 20,
          totalTokens: 120,
          tokensReadFromCache: 0,
          costUsd: 0.001,
        },
      ]),
      block('b2', [
        {
          messageId: 'm2',
          text: 'b',
          aiVendor: 'anthropic',
          inputTokens: 50,
          outputTokens: 5,
          totalTokens: 55,
          costUsd: null,
        },
        {
          messageId: 'm3',
          text: 'c',
          aiVendor: 'openai',
          inputTokens: 300,
          outputTokens: 40,
          totalTokens: 340,
          tokensReadFromCache: 256,
          costUsd: 0.002,
        },
      ]),
    ]);
    expect(totals).toEqual([
      {
        vendor: 'openai',
        inputTokens: 400,
        outputTokens: 60,
        totalTokens: 460,
        tokensReadFromCache: 256,
        costUsd: 0.003,
      },
      {
        vendor: 'anthropic',
        inputTokens: 50,
        outputTokens: 5,
        totalTokens: 55,
        tokensReadFromCache: 0,
        costUsd: null,
      },
    ]);
  });

  test('skips responses without usage and responses without a vendor', () => {
    const totals = conversationUsageByVendor([
      block('b1', [
        { messageId: 'm1', text: '', aiVendor: 'xai', isLoading: true },
        { messageId: 'm2', text: 'x', inputTokens: 10 },
      ]),
    ]);
    expect(totals).toEqual([]);
  });

  test('an empty conversation has no totals', () => {
    expect(conversationUsageByVendor([])).toEqual([]);
  });
});

describe('formatUsd', () => {
  test('keeps cents above a dollar and four decimals below', () => {
    expect(formatUsd(1.234)).toBe('$1.23');
    expect(formatUsd(0.04213)).toBe('$0.0421');
  });
});
