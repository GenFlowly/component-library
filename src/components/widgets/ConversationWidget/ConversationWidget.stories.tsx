import React, { useMemo, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ConversationWidget from './ConversationWidget';
import {
  ConversationWidgetProvider,
  ConversationWidgetContextValue,
} from './ConversationWidgetContext';
import { ConversationBlock, Message } from './conversation.models';
import { AIVendor } from './vendors';
import { ActivityEvent } from '../ActivityPanel/activity.models';
import memoryOnlyActivity from '../ActivityPanel/fixtures/memory_only.json';
import completedActivity from '../ActivityPanel/fixtures/completed_six_searches.json';

const meta: Meta<typeof ConversationWidget> = {
  title: 'Widgets/ConversationWidget',
  component: ConversationWidget,
  tags: ['autodocs'],
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'The conversation surface extracted from the GenFlowly web app: a list of request/response ' +
          'blocks with a markdown prompt editor, streaming-aware response cards, the agent activity panel, ' +
          'sources, usage badges and follow-up flow. It is fully host-driven: wrap it in ' +
          '`ConversationWidgetProvider` and inject the conversation state (`ConversationWidgetApi`), ' +
          'auth surface, optional services (uploads, learned facts, vendor names) and layout flags. ' +
          'This story wires a tiny in-memory host that fakes a streamed response.',
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof ConversationWidget>;

/** Minimal in-memory host: one draft block, fake streaming on Generate. */
function StoryHost({
  initialBlocks,
  initialSelections,
}: {
  initialBlocks: ConversationBlock[];
  /** Per-block vendor visibility to start from (blockId -> vendor ids). */
  initialSelections?: Record<string, string[]>;
}) {
  const [blocks, setBlocks] = useState<ConversationBlock[]>(initialBlocks);
  const selectionsRef = useRef<Record<string, string[]>>(
    initialSelections ?? {}
  );
  const [, forceRender] = useState(0);

  const value = useMemo<ConversationWidgetContextValue>(() => {
    const updateBlock = (
      id: string,
      patch: (b: ConversationBlock) => ConversationBlock
    ) =>
      setBlocks(prev =>
        prev.map(b => (b.conversationBlockId === id ? patch(b) : b))
      );

    return {
      conversation: {
        get conversationBlockList() {
          return blocks;
        },
        conversationId: 'story-conversation',
        setActiveBlockId: () => undefined,
        addNewConversationBlockWithId: id =>
          setBlocks(prev => [
            ...prev,
            {
              conversationBlockId: id,
              prompt: '',
              responseMessages: [],
              isLoading: false,
              status: 'draft',
            },
          ]),
        generateResponsesStream: (blockId, prompt) => {
          const text =
            'Streaming a **markdown** demo answer for:\n\n> ' +
            (prompt || '(regenerated)');
          updateBlock(blockId, b => ({
            ...b,
            prompt: prompt ?? b.prompt,
            status: 'resolved',
            isLoading: true,
            sentAt: Date.now(),
            responseMessages: [
              {
                aiVendor: AIVendor.CLAUDE,
                model: 'claude-sonnet-4-6',
                text: '',
                messageId: `story-msg-${Date.now()}`,
                isLoading: true,
              },
            ],
          }));
          let i = 0;
          const timer = setInterval(() => {
            i += 7;
            const done = i >= text.length;
            updateBlock(blockId, b => ({
              ...b,
              isLoading: !done,
              responseMessages: b.responseMessages.map(m => ({
                ...m,
                text: text.slice(0, i),
                isLoading: !done,
                ...(done
                  ? {
                      inputTokens: 42,
                      outputTokens: 128,
                      totalTokens: 170,
                      tokensReadFromCache: 0,
                    }
                  : {}),
              })),
            }));
            if (done) clearInterval(timer);
          }, 60);
        },
        stopGenerating: blockId => {
          if (!blockId) return;
          updateBlock(blockId, b => ({
            ...b,
            isLoading: false,
            responseMessages: b.responseMessages.map(m => ({
              ...m,
              isLoading: false,
            })),
          }));
        },
        setSelectedResponseForBlock: () => undefined,
        getSelectedResponseForBlock: () => null,
        getVendorSelectionForBlock: blockId =>
          selectionsRef.current[blockId] ?? [],
        setVendorSelectionForBlock: (blockId, vendors) => {
          selectionsRef.current[blockId] = vendors;
          forceRender(n => n + 1);
        },
      },
      conversationUI: {
        setEditorPrompt: () => undefined,
        setActiveViewportItem: () => undefined,
      },
      auth: {
        isAuthenticated: true,
        customerId: 'story-customer',
        customerName: 'Storybook User',
        aiVendorAPIKeyStatusList: [
          { aiVendor: AIVendor.CLAUDE, isAPIKeyValid: true, priority: 1 },
          { aiVendor: AIVendor.OPENAI, isAPIKeyValid: true, priority: 2 },
        ],
        getAccessTokenSilently: async () => 'story-token',
      },
      layout: { isLeftSidebarExpanded: false, isRightSidebarExpanded: false },
      showToast: message => console.log('[toast]', message),
    };
  }, [blocks]);

  return (
    <div
      style={{
        padding: '1rem',
        background: 'var(--color-background)',
        minHeight: '100vh',
      }}
    >
      <ConversationWidgetProvider value={value}>
        <ConversationWidget />
      </ConversationWidgetProvider>
    </div>
  );
}

export const EmptyDraft: Story = {
  render: () => (
    <StoryHost
      initialBlocks={[
        {
          conversationBlockId: 'block-1',
          prompt: '',
          responseMessages: [],
          isLoading: false,
          status: 'draft',
        },
      ]}
    />
  ),
};

export const WithHistory: Story = {
  render: () => (
    <StoryHost
      initialBlocks={[
        {
          conversationBlockId: 'block-1',
          prompt: 'What did we learn from the Q3 report?',
          responseMessages: [
            {
              aiVendor: AIVendor.CLAUDE,
              model: 'claude-sonnet-4-6',
              text: 'Revenue grew **12%** quarter over quarter [1].',
              messageId: 'hist-1',
              activity: memoryOnlyActivity.events as ActivityEvent[],
              webSources: [
                {
                  index: 1,
                  title: 'Q3 sales report',
                  url: 'https://example.com/q3',
                },
              ],
              inputTokens: 1200,
              outputTokens: 340,
              totalTokens: 1540,
              tokensReadFromCache: 0,
              costUsd: 0.0212,
              learnedFacts: null,
            },
          ],
          isLoading: false,
          status: 'resolved',
          sentAt: Date.now() - 60_000,
        },
        {
          conversationBlockId: 'block-2',
          prompt: '',
          responseMessages: [],
          isLoading: false,
          status: 'draft',
        },
      ]}
    />
  ),
};

// --- Fully loaded: every markdown + chrome element in one conversation ------
// The theme-regression fixture: tables (wide grid AND the stacked mobile
// presentation), fenced code with syntax highlighting, inline code,
// blockquote, nested/ordered lists, long unbreakable URLs, KaTeX math,
// citations with web sources, a full agent activity log, usage/cost
// badges, learned facts, model chips and a truncation stop reason. Flip the
// toolbar theme and the viewport to hunt for token collisions (see the
// Design System/Design Tokens story).

const RICH_RESPONSE_MD = `## Memory-chip supply chain, quickly

The **HBM boom** is pulling capacity away from commodity DRAM [1]. Spot prices
for \`DDR5\` rose ~18% QoQ, and *SK Hynix* says HBM is sold out through 2027
[2]. Details in the [capacity update](https://example.com/hynix-ir).

### Positioning table

| Candidate | Why it benefits | Pros | Cons |
| --- | --- | --- | --- |
| **SK Hynix** | #1 HBM maker, still gaining share | Direct HBM exposure, cheaper multiple | Korea-listed (ADR access) |
| **Micron** | Only US-listed pure DRAM play | Street keeps raising targets | Already re-rated hard |
| **Western Digital** | NAND shortage pushes bulk storage back to HDDs | Pricing power now | "Older tech" perception |

### Wide metrics table

| Ticker | P/E | Fwd P/E | EV/EBITDA | Rev growth | HBM share | Rating |
| --- | --- | --- | --- | --- | --- | --- |
| HXSCL | 11.2 | 8.4 | 6.1 | +38% | 53% | Buy |
| MU | 14.8 | 9.9 | 7.3 | +29% | 21% | Hold |
| WDC | 9.6 | 8.1 | 5.2 | +11% | — | Buy |

A quick sizing helper:

\`\`\`python
def position_size(portfolio: float, conviction: float, max_weight=0.05) -> float:
    """Cap any single-name bet at max_weight of the portfolio."""
    return round(portfolio * min(conviction * 0.08, max_weight), 2)

print(position_size(250_000, conviction=0.8))
\`\`\`

And the streaming handler in TypeScript:

\`\`\`typescript
export async function* streamQuotes(tickers: string[]): AsyncGenerator<Quote> {
  const res = await fetch(\`/api/quotes?symbols=\${tickers.join(',')}\`);
  for await (const chunk of res.body!) yield parseQuote(chunk);
}
\`\`\`

> Semiconductor memory is a cyclical business wearing an AI costume — size
> positions for the cycle, not the costume.

Checklist before buying:

1. Confirm the **capex guide** at the next earnings call
2. Watch \`DXI\` spot pricing weekly
   - a 3-week downtick is an early cycle-top warning
   - cross-check with [TrendForce](https://www.trendforce.com/price/) spot data
3. Re-read the risk appendix at
   https://example.com/research/memory-supercycle-2026-risk-appendix-and-position-limits

Expected value per the usual model: $EV = \\sum_i p_i \\cdot \\text{payoff}_i$

$$
f^{*} = \\frac{p \\cdot b - q}{b}
\\quad\\text{(Kelly fraction)}
$$
`;

const SECOND_RESPONSE_MD = `### Short take

Most of the upside is priced in. Track \`DXI\` momentum before adding:

| Signal | Status |
| --- | --- |
| DXI momentum | rising |
| Capex guides | raising |

\`\`\`bash
curl -s https://api.example.com/v1/dxi | jq '.spot'
\`\`\`

This answer stops mid-thought because the demo pins \`max_tokens\`, so the
truncation notice below renders…`;

function makeFullyLoadedBlocks(): ConversationBlock[] {
  const claudeMessage: Message = {
    aiVendor: AIVendor.CLAUDE,
    model: 'claude-sonnet-4-6',
    text: RICH_RESPONSE_MD,
    messageId: 'rich-claude-1',
    activity: completedActivity.events as ActivityEvent[],
    webSources: [
      {
        index: 1,
        title: 'TrendForce: DRAM spot index',
        url: 'https://www.trendforce.com/price/',
      },
      {
        index: 2,
        title: 'SK Hynix IR — HBM capacity update',
        url: 'https://example.com/hynix-ir',
      },
    ],
    inputTokens: 1840,
    outputTokens: 912,
    totalTokens: 2752,
    tokensReadFromCache: 1200,
    costUsd: 0.0341,
    stopReason: 'end_turn',
    learnedFacts: [
      {
        memoryId: 'fact-1',
        text: 'Caps single-name positions at 5% of the portfolio',
      },
    ],
  };

  const openAiMessage: Message = {
    aiVendor: AIVendor.OPENAI,
    model: 'gpt-4o',
    text: SECOND_RESPONSE_MD,
    messageId: 'rich-openai-1',
    inputTokens: 1620,
    outputTokens: 256,
    totalTokens: 1876,
    tokensReadFromCache: 0,
    costUsd: 0.0125,
    stopReason: 'max_tokens',
    learnedFacts: [],
  };

  return [
    {
      conversationBlockId: 'block-rich',
      prompt:
        'Which **memory-chip** stocks benefit most from the AI hardware boom?\n\n' +
        'Compare the usual suspects in a table and show me how you would size a starter position in `python`.',
      responseMessages: [claudeMessage, openAiMessage],
      isLoading: false,
      status: 'resolved',
      sentAt: Date.now() - 5 * 60_000,
    },
    {
      conversationBlockId: 'block-draft',
      prompt: '',
      responseMessages: [],
      isLoading: false,
      status: 'draft',
    },
  ];
}

const FULLY_LOADED_SELECTIONS = {
  'block-rich': [AIVendor.CLAUDE as string, AIVendor.OPENAI as string],
};

export const FullyLoaded: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Kitchen-sink conversation: two vendor responses containing every markdown element the ' +
          'response surface renders (grid + stacked tables, highlighted code, inline code, math, ' +
          'blockquote, lists, long URLs, citations) plus the full card chrome (activity panel, ' +
          'sources, usage/cost badges, learned facts, model chip, truncation notice). Use the ' +
          'toolbar to flip light/dark and the viewport menu to check mobile.',
      },
    },
  },
  render: () => (
    <StoryHost
      initialBlocks={makeFullyLoadedBlocks()}
      initialSelections={FULLY_LOADED_SELECTIONS}
    />
  ),
};

export const FullyLoadedMobileDark: Story = {
  globals: { theme: 'dark' },
  parameters: {
    viewport: { defaultViewport: 'mobile2' },
    docs: {
      description: {
        story:
          'The historical trouble spot: dark theme on a phone-sized viewport, where the response ' +
          'card background is stripped and content sits directly on the response container surface ' +
          '(#3a3a3c in dark — the same value as border-light and background-tertiary). Tables ' +
          'stack into row cards; table borders and code-block boundaries must stay visible here.',
      },
    },
  },
  render: () => (
    <StoryHost
      initialBlocks={makeFullyLoadedBlocks()}
      initialSelections={FULLY_LOADED_SELECTIONS}
    />
  ),
};

export const ThemesSideBySide: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'The fully loaded conversation in both themes at once — the right panel re-scopes the ' +
          'CSS custom properties with data-theme="dark". Keep the toolbar theme on light: the ' +
          'left panel inherits the page theme, and there is no light re-scope selector to force ' +
          'it back.',
      },
    },
  },
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        alignItems: 'start',
        minHeight: '100vh',
      }}
    >
      <StoryHost
        initialBlocks={makeFullyLoadedBlocks()}
        initialSelections={FULLY_LOADED_SELECTIONS}
      />
      <div data-theme="dark" style={{ background: 'var(--color-background)' }}>
        <StoryHost
          initialBlocks={makeFullyLoadedBlocks()}
          initialSelections={FULLY_LOADED_SELECTIONS}
        />
      </div>
    </div>
  ),
};
