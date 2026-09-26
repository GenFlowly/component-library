import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ThinkingSteps from './ThinkingSteps';
import { ThinkingStep } from './conversation.models';
import { applyThinkingStep } from './thinkingStepUtils';

// TextContainerCore pulls in remark-math, an ESM-only package Jest's default
// transform can't parse — mocked with the same pass-through shell
// Response.test.tsx already uses, since it's the same component.
jest.mock('../../common/TextContainer/TextContainer', () => ({
  __esModule: true,
  default: (props: any) => {
    const { title, content, showCopyButton, 'data-testid': testId } = props;
    return (
      <div data-testid={testId || 'text-container'}>
        <div data-testid="tc-title">{title}</div>
        <div data-testid="tc-content">{content}</div>
        {showCopyButton && <button data-testid="tc-copy">Copy</button>}
      </div>
    );
  },
}));

describe('ThinkingSteps', () => {
  test('renders nothing for an empty list', () => {
    render(<ThinkingSteps steps={[]} />);
    expect(screen.queryByTestId('thinking-step-list')).not.toBeInTheDocument();
  });

  test('a running step shows its live label with a pulse', () => {
    const steps: ThinkingStep[] = [
      {
        node: 'qa',
        name: 'Query Analyzer',
        kind: 'LLM',
        status: 'running',
        label: 'Query Analyzer: thinking…',
      },
    ];
    render(<ThinkingSteps steps={steps} />);

    const step = screen.getByTestId('thinking-step');
    expect(step).toHaveAttribute('data-status', 'running');
    expect(screen.getByText('Query Analyzer: thinking…')).toBeInTheDocument();
    expect(screen.getByTestId('thinking-step-pulse')).toBeInTheDocument();
    // Running steps carry no detail/items/expanders yet
    expect(screen.queryByTestId('thinking-step-items')).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('thinking-step-prompt')
    ).not.toBeInTheDocument();
  });

  test('running → done transition swaps the label for name + detail', () => {
    const runningStep: ThinkingStep = {
      node: 'qa',
      name: 'Query Analyzer',
      kind: 'LLM',
      status: 'running',
      label: 'Query Analyzer: thinking…',
    };
    let steps = applyThinkingStep([], runningStep);
    const { rerender } = render(<ThinkingSteps steps={steps} />);
    expect(screen.getByText('Query Analyzer: thinking…')).toBeInTheDocument();

    steps = applyThinkingStep(steps, {
      node: 'qa',
      name: 'Query Analyzer',
      kind: 'LLM',
      status: 'done',
      detail: 'Intent: lookup (needs rewrite: no)',
    });
    rerender(<ThinkingSteps steps={steps} />);

    expect(screen.getAllByTestId('thinking-step')).toHaveLength(1);
    expect(screen.getByTestId('thinking-step')).toHaveAttribute(
      'data-status',
      'done'
    );
    expect(screen.getByText('Query Analyzer')).toBeInTheDocument();
    expect(
      screen.getByText('Intent: lookup (needs rewrite: no)')
    ).toBeInTheDocument();
    expect(
      screen.queryByText('Query Analyzer: thinking…')
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('thinking-step-pulse')).not.toBeInTheDocument();
  });

  test('done retrieval step lists its items', () => {
    const steps: ThinkingStep[] = [
      {
        node: 'retriever',
        name: 'Document Retriever',
        kind: 'RETRIEVAL',
        status: 'done',
        detail: 'Found 2 relevant document(s)',
        items: ['Q3 sales report', 'Pricing FAQ'],
      },
    ];
    render(<ThinkingSteps steps={steps} isThinking />);

    const items = screen.getByTestId('thinking-step-items');
    expect(items).toBeInTheDocument();
    expect(screen.getByText('Q3 sales report')).toBeInTheDocument();
    expect(screen.getByText('Pricing FAQ')).toBeInTheDocument();
  });

  test('a done step with expandable content is collapsed by default, and expands on click', () => {
    const steps: ThinkingStep[] = [
      {
        node: 'retriever',
        name: 'Document Retriever',
        kind: 'RETRIEVAL',
        status: 'done',
        detail: 'Found 1 relevant document(s)',
        items: ['Q3 sales report'],
      },
    ];
    render(<ThinkingSteps steps={steps} />);

    // detail is always visible — it's the compact summary
    expect(
      screen.getByText('Found 1 relevant document(s)')
    ).toBeInTheDocument();
    // the expandable content is not, until the row is expanded
    expect(screen.queryByText('Q3 sales report')).not.toBeInTheDocument();

    const toggle = screen.getByTestId('thinking-step-toggle');
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    userEvent.click(toggle);

    expect(screen.getByText('Q3 sales report')).toBeInTheDocument();
  });

  test('a row without expandable content renders no toggle', () => {
    const steps: ThinkingStep[] = [
      {
        node: 'qa',
        name: 'Query Analyzer',
        kind: 'LLM',
        status: 'done',
        detail: 'Intent: lookup',
      },
    ];
    render(<ThinkingSteps steps={steps} />);

    expect(screen.getByText('Intent: lookup')).toBeInTheDocument();
    expect(
      screen.queryByTestId('thinking-step-toggle')
    ).not.toBeInTheDocument();
  });

  test('a step auto-collapses the instant isThinking flips false, but stays manually re-expandable', () => {
    const steps: ThinkingStep[] = [
      {
        node: 'qa',
        name: 'Query Analyzer',
        kind: 'LLM',
        status: 'done',
        detail: 'Intent: lookup',
        prompt: 'You are a query analyzer…',
      },
    ];
    const { rerender } = render(<ThinkingSteps steps={steps} isThinking />);
    expect(screen.getByText('You are a query analyzer…')).toBeInTheDocument();

    rerender(<ThinkingSteps steps={steps} isThinking={false} />);
    expect(
      screen.queryByText('You are a query analyzer…')
    ).not.toBeInTheDocument();

    // Still inspectable afterward — collapsing isn't the same as hiding
    userEvent.click(screen.getByTestId('thinking-step-toggle'));
    expect(screen.getByText('You are a query analyzer…')).toBeInTheDocument();
  });

  test('prompt renders inline and response renders via TextContainer, same rich treatment as the final answer', () => {
    const steps: ThinkingStep[] = [
      {
        node: 'qa',
        name: 'Query Analyzer',
        kind: 'LLM',
        status: 'done',
        detail: 'Intent: lookup',
        prompt: 'You are a query analyzer…',
        response: '{"intent":"lookup"}',
      },
    ];
    render(<ThinkingSteps steps={steps} isThinking />);

    expect(screen.getByTestId('thinking-step-prompt')).toBeInTheDocument();
    expect(screen.getByText('You are a query analyzer…')).toBeInTheDocument();

    const responseBlock = screen.getByTestId('thinking-step-response');
    expect(responseBlock).toBeInTheDocument();
    // Rendered via the (mocked) TextContainer — title is the step name, same
    // component the final answer uses, not a plain monospace dump.
    expect(screen.getByTestId('tc-title')).toHaveTextContent('Query Analyzer');
    expect(screen.getByTestId('tc-content')).toHaveTextContent(
      '{"intent":"lookup"}'
    );
  });

  test('the terminal step response is not duplicated when it matches the message final text', () => {
    const steps: ThinkingStep[] = [
      {
        node: 'gen',
        name: 'Generate Response',
        kind: 'LLM',
        status: 'done',
        detail: 'Response generated',
        prompt: 'Answer the question…',
        response: 'The final answer text.',
      },
    ];
    render(
      <ThinkingSteps
        steps={steps}
        isThinking
        finalText="The final answer text."
      />
    );

    // Prompt still shows — only the duplicate response block is skipped
    expect(screen.getByText('Answer the question…')).toBeInTheDocument();
    expect(
      screen.queryByTestId('thinking-step-response')
    ).not.toBeInTheDocument();
  });

  test('a terminal step with nothing but the duplicate response renders no toggle', () => {
    const steps: ThinkingStep[] = [
      {
        node: 'gen',
        name: 'Generate Response',
        kind: 'LLM',
        status: 'done',
        detail: 'Response generated',
        response: 'The final answer text.',
      },
    ];
    render(
      <ThinkingSteps
        steps={steps}
        isThinking
        finalText="The final answer text."
      />
    );

    // Nothing expandable is left once the duplicate response is excluded
    expect(
      screen.queryByTestId('thinking-step-toggle')
    ).not.toBeInTheDocument();
  });

  test('a cycle (same node running again after done) renders as two stacked steps', () => {
    let steps = applyThinkingStep([], {
      node: 'qa',
      name: 'Query Analyzer',
      kind: 'LLM',
      status: 'running',
      label: 'Query Analyzer: thinking…',
    });
    steps = applyThinkingStep(steps, {
      node: 'qa',
      name: 'Query Analyzer',
      kind: 'LLM',
      status: 'done',
      detail: 'first pass',
    });
    steps = applyThinkingStep(steps, {
      node: 'qa',
      name: 'Query Analyzer',
      kind: 'LLM',
      status: 'running',
      label: 'Query Analyzer: re-checking…',
    });
    render(<ThinkingSteps steps={steps} />);

    const rows = screen.getAllByTestId('thinking-step');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute('data-status', 'done');
    expect(screen.getByText('first pass')).toBeInTheDocument();
    expect(rows[1]).toHaveAttribute('data-status', 'running');
    expect(
      screen.getByText('Query Analyzer: re-checking…')
    ).toBeInTheDocument();
  });

  test('legacy plain steps (no kind) render label-only rows without an icon', () => {
    const steps: ThinkingStep[] = [
      { node: 'legacy-0', name: 'pondering deeply', status: 'done' },
    ];
    render(<ThinkingSteps steps={steps} />);

    const step = screen.getByTestId('thinking-step');
    expect(screen.getByText('pondering deeply')).toBeInTheDocument();
    expect(step.querySelector('svg')).toBeNull();
  });

  test('kinds map to their lucide icons', () => {
    const steps: ThinkingStep[] = [
      { node: 'a', name: 'LLM node', kind: 'LLM', status: 'done' },
      { node: 'b', name: 'Memory node', kind: 'MEMORY', status: 'done' },
      { node: 'c', name: 'Retrieval node', kind: 'RETRIEVAL', status: 'done' },
      { node: 'd', name: 'Web node', kind: 'WEB_SEARCH', status: 'done' },
      {
        node: 'e',
        name: 'Reflection node',
        kind: 'REFLECTION',
        status: 'done',
      },
      { node: 'f', name: 'Tool node', kind: 'TOOL', status: 'done' },
    ];
    render(<ThinkingSteps steps={steps} />);

    const rows = screen.getAllByTestId('thinking-step');
    expect(rows).toHaveLength(6);
    rows.forEach(row => expect(row.querySelector('svg')).not.toBeNull());
  });

  test('a tool-calling generator turn shows reasoning and each call signature, not the generic detail string', () => {
    const steps: ThinkingStep[] = [
      {
        node: 'gen',
        name: 'Generate Response',
        kind: 'LLM',
        status: 'done',
        detail: 'Calling tools: web_search(query="a"), web_search(query="b")',
        reasoning:
          'The static search results look stale — let me search again.',
        tool_calls: [
          { name: 'web_search', args: { query: 'a', topic: 'news' } },
          { name: 'web_search', args: { query: 'b' } },
        ],
      },
    ];
    render(<ThinkingSteps steps={steps} isThinking />);

    expect(
      screen.getByText(
        'The static search results look stale — let me search again.'
      )
    ).toBeInTheDocument();
    const calls = screen.getByTestId('thinking-step-tool-calls');
    expect(calls).toBeInTheDocument();
    expect(
      screen.getByText('web_search(query="a", topic="news")')
    ).toBeInTheDocument();
    expect(screen.getByText('web_search(query="b")')).toBeInTheDocument();
    // The generic joined-string detail is superseded by the structured calls
    expect(
      screen.queryByText(
        'Calling tools: web_search(query="a"), web_search(query="b")'
      )
    ).not.toBeInTheDocument();
  });

  test('narration (reasoning) stays visible when the row is collapsed', () => {
    // The model's "why I'm searching" sentence is part of the turn's story —
    // it must read in the flow after the turn completes, not vanish behind
    // the expander like prompts do.
    const steps: ThinkingStep[] = [
      {
        node: 'gen',
        name: 'Generate Response',
        kind: 'LLM',
        status: 'done',
        reasoning: 'The first results mix own and operate — searching again.',
        tool_calls: [{ name: 'web_search', args: { query: 'x' } }],
      },
    ];
    render(<ThinkingSteps steps={steps} />); // not thinking → collapsed

    expect(
      screen.getByText(
        'The first results mix own and operate — searching again.'
      )
    ).toBeInTheDocument();
    // The call signatures stay behind the toggle
    expect(
      screen.queryByTestId('thinking-step-tool-calls')
    ).not.toBeInTheDocument();
    userEvent.click(screen.getByTestId('thinking-step-toggle'));
    expect(screen.getByTestId('thinking-step-tool-calls')).toBeInTheDocument();
  });

  test('a long query is shown in full, not truncated', () => {
    // A truncated query defeats the point of showing it — being able to read
    // exactly what was searched for is the whole reason it's on screen.
    const query = 'x'.repeat(200);
    const steps: ThinkingStep[] = [
      {
        node: 'gen',
        name: 'Generate Response',
        kind: 'LLM',
        status: 'done',
        tool_calls: [{ name: 'web_search', args: { query } }],
      },
    ];
    render(<ThinkingSteps steps={steps} isThinking />);

    expect(
      screen.getByText(`web_search(query="${query}")`)
    ).toBeInTheDocument();
  });

  test('a TOOL step renders each call as its own breakdown with its own sources, not one merged list', () => {
    const steps: ThinkingStep[] = [
      {
        node: 'executor',
        name: 'Tools',
        kind: 'TOOL',
        status: 'done',
        detail: 'Executed 2 tool(s)',
        items: ['fallback title — unused when calls is present'],
        calls: [
          {
            name: 'web_search',
            args: { query: 'MGM Resorts owned hotels Las Vegas' },
            sources: [
              {
                index: 1,
                title: 'MGM Resorts official site',
                url: 'https://mgmresorts.com',
              },
            ],
          },
          {
            name: 'web_search',
            args: { query: 'W' },
            sources: [
              {
                index: 2,
                title: 'W. Kamau Bell on Instagram',
                url: 'https://instagram.com/wkamaubell',
              },
            ],
          },
        ],
      },
    ];
    render(<ThinkingSteps steps={steps} isThinking />);

    expect(screen.getByText('Executed 2 tool(s)')).toBeInTheDocument();
    const callBlocks = screen.getAllByTestId('thinking-step-tool-call');
    expect(callBlocks).toHaveLength(2);
    expect(
      screen.getByText('web_search(query="MGM Resorts owned hotels Las Vegas")')
    ).toBeInTheDocument();
    expect(screen.getByText('web_search(query="W")')).toBeInTheDocument();

    const mgmLink = screen.getByText('MGM Resorts official site');
    expect(mgmLink.closest('a')).toHaveAttribute(
      'href',
      'https://mgmresorts.com'
    );
    const wLink = screen.getByText('W. Kamau Bell on Instagram');
    expect(wLink.closest('a')).toHaveAttribute(
      'href',
      'https://instagram.com/wkamaubell'
    );

    // The flat back-compat items list is superseded by the per-call breakdown
    expect(screen.queryByTestId('thinking-step-items')).not.toBeInTheDocument();
  });

  test('a failed call in a TOOL step shows its error instead of sources', () => {
    const steps: ThinkingStep[] = [
      {
        node: 'executor',
        name: 'Tools',
        kind: 'TOOL',
        status: 'done',
        detail: 'Executed 1 tool(s)',
        calls: [
          {
            name: 'web_search',
            args: { query: 'x' },
            error: 'upstream timeout',
          },
        ],
      },
    ];
    render(<ThinkingSteps steps={steps} isThinking />);

    expect(screen.getByText('upstream timeout')).toBeInTheDocument();
  });

  test('a WEB_SEARCH step with sources renders the full linked list instead of the capped items', () => {
    const steps: ThinkingStep[] = [
      {
        node: 'web',
        name: 'Web Search',
        kind: 'WEB_SEARCH',
        status: 'done',
        detail: 'Found 1 web result(s)',
        items: ['Example title'],
        sources: [
          { index: 1, title: 'Example title', url: 'https://example.com' },
        ],
      },
    ];
    render(<ThinkingSteps steps={steps} isThinking />);

    const link = screen.getByText('Example title').closest('a');
    expect(link).toHaveAttribute('href', 'https://example.com');
    expect(screen.queryByTestId('thinking-step-items')).not.toBeInTheDocument();
  });
});
