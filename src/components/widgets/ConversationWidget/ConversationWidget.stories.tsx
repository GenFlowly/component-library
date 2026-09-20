import React, { useMemo, useRef, useState } from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import ConversationWidget from './ConversationWidget';
import {
  ConversationWidgetProvider,
  ConversationWidgetContextValue,
} from './ConversationWidgetContext';
import { ConversationBlock } from './conversation.models';
import { AIVendor } from './vendors';

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
          'blocks with a markdown prompt editor, streaming-aware response cards, thinking steps, ' +
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
function StoryHost({ initialBlocks }: { initialBlocks: ConversationBlock[] }) {
  const [blocks, setBlocks] = useState<ConversationBlock[]>(initialBlocks);
  const selectionsRef = useRef<Record<string, string[]>>({});
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
              thinkingStepList: [
                {
                  node: 'retriever',
                  name: 'Document Retriever',
                  kind: 'RETRIEVAL',
                  status: 'done',
                  detail: 'Found 1 relevant document(s)',
                  items: ['Q3 sales report'],
                },
              ],
              thinkingDurationMs: 2400,
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
