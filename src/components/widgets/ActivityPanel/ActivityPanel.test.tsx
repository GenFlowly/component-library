import React from 'react';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import ActivityPanel from './ActivityPanel';
import { ActivityEvent } from './activity.models';
import completed from './fixtures/completed_six_searches.json';
import live from './fixtures/live_mid_turn.json';
import denied from './fixtures/denied_searches.json';
import stopped from './fixtures/stopped_turn.json';

const completedEvents = completed.events as ActivityEvent[];
const liveEvents = live.events as ActivityEvent[];

/** The completed log as a non-author receives it: the proxy strips these keys. */
function redacted(events: ActivityEvent[]): ActivityEvent[] {
  return JSON.parse(JSON.stringify(events)).map(
    (e: Record<string, unknown>) => {
      delete e.developer;
      if (e.type === 'step.end' && e.kind === 'memory') delete e.memories;
      return e as unknown as ActivityEvent;
    }
  );
}

function header() {
  return screen.getByTestId('activity-header');
}

describe('ActivityPanel', () => {
  it('renders nothing for a finished turn without a log', () => {
    const { container } = render(<ActivityPanel events={[]} isLive={false} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the header while live before the first event arrives', () => {
    render(<ActivityPanel events={[]} isLive />);
    expect(header()).toHaveTextContent('Thinking');
    expect(header()).toHaveAttribute('aria-expanded', 'true');
  });

  it('stays open while the agent thinks and folds once the answer streams', () => {
    const upTo = (type: string, id: string) =>
      completedEvents.slice(
        0,
        completedEvents.findIndex(
          e => e.type === type && 'id' in e && e.id === id
        ) + 1
      );
    const { rerender } = render(
      <ActivityPanel events={liveEvents.slice(0, 6)} isLive />
    );
    expect(header()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('activity-panel')).toHaveAttribute(
      'data-thinking',
      'true'
    );
    // A round's preamble streams like an answer until its tool call starts
    rerender(
      <ActivityPanel events={upTo('step.progress', 'NODAGENT001:1')} isLive />
    );
    rerender(<ActivityPanel events={liveEvents} isLive />);
    expect(header()).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('activity-story')).toBeInTheDocument();

    // The answer: open through its first sentence, folded once it is more
    rerender(
      <ActivityPanel events={upTo('step.progress', 'NODAGENT001:3')} isLive />
    );
    expect(header()).toHaveAttribute('aria-expanded', 'true');
    rerender(
      <ActivityPanel events={upTo('step.writing', 'NODAGENT001:3')} isLive />
    );
    expect(header()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('activity-panel')).not.toHaveAttribute(
      'data-thinking'
    );
    expect(header()).toHaveTextContent('Thinking');

    // The log ends a moment before the stream closes: still folded
    rerender(<ActivityPanel events={completedEvents} isLive />);
    expect(header()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByTestId('activity-panel')).not.toHaveAttribute(
      'data-thinking'
    );
  });

  it('opens again when the agent goes back to tools after writing', () => {
    const writing = completedEvents.slice(
      0,
      completedEvents.findIndex(e => e.type === 'step.writing') + 1
    );
    const { rerender } = render(<ActivityPanel events={writing} isLive />);
    expect(header()).toHaveAttribute('aria-expanded', 'false');

    rerender(
      <ActivityPanel
        events={[
          ...writing,
          { v: 2, at: 21500, type: 'step.calling', id: 'NODAGENT001:3' },
        ]}
        isLive
      />
    );
    expect(header()).toHaveAttribute('aria-expanded', 'true');
  });

  it('folds once when the turn ends', () => {
    const { rerender } = render(<ActivityPanel events={liveEvents} isLive />);
    expect(header()).toHaveAttribute('aria-expanded', 'true');

    rerender(
      <ActivityPanel
        events={completedEvents}
        isLive={false}
        citedSources={completed.web_sources}
      />
    );
    expect(header()).toHaveAttribute('aria-expanded', 'false');
    expect(header()).toHaveTextContent('Thought for 22s');
    expect(header()).toHaveTextContent('6 searches');
    expect(header()).toHaveTextContent('31 sources, 6 cited');
    expect(screen.queryByTestId('activity-story')).not.toBeInTheDocument();
  });

  it('says what the agent is doing right now and ticks the running query', () => {
    render(<ActivityPanel events={liveEvents} isLive />);
    expect(header()).toHaveTextContent(
      'searching: unused CCM billing eligible practices percent'
    );
    const beats = screen.getAllByTestId('activity-beat');
    const round = beats[beats.length - 1];
    const calls = within(round).getAllByTestId('activity-call');
    expect(calls.map(c => c.getAttribute('data-call-status'))).toEqual([
      'done',
      'running',
      'running',
    ]);
    expect(calls[0]).toHaveTextContent('4 results');
    expect(calls[1]).toHaveTextContent(
      'Measure how much eligible CCM billing goes unused.'
    );
    expect(screen.getByTestId('activity-tile-searches')).toHaveTextContent(
      '6 of 6'
    );
    expect(screen.getByTestId('activity-tile-sources')).toHaveTextContent(
      'cited when answered'
    );
    expect(screen.getByTestId('activity-phase-search').className).toMatch(
      /phaseRunning/
    );
  });

  it('never shows memory texts until asked, even while live', () => {
    render(<ActivityPanel events={liveEvents} isLive />);
    const memoryBeat = screen.getAllByTestId('activity-beat')[0];
    expect(
      within(memoryBeat).queryByTestId('activity-memory-texts')
    ).not.toBeInTheDocument();
    fireEvent.click(within(memoryBeat).getByTestId('activity-beat-toggle'));
    expect(
      within(memoryBeat).getByTestId('activity-memory-texts')
    ).toBeInTheDocument();
  });

  it('opens a finished turn on demand with the receipt and a one-line story', () => {
    render(
      <ActivityPanel
        events={completedEvents}
        isLive={false}
        citedSources={completed.web_sources}
      />
    );
    expect(header()).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(header());
    expect(screen.getByTestId('activity-tile-time')).toHaveTextContent('22s');
    expect(screen.getByTestId('activity-tile-sources')).toHaveTextContent(
      '6 cited'
    );
    expect(screen.getByTestId('activity-tile-memories')).toHaveTextContent(
      '16'
    );
    const beats = screen.getAllByTestId('activity-beat');
    expect(beats.map(b => b.getAttribute('data-beat-type'))).toEqual([
      'memory',
      'plan',
      'tools',
      'plan',
      'tools',
      'read',
      'answer',
    ]);
    expect(beats[2]).toHaveTextContent('Searched the web · 3 queries');
    expect(beats[2]).toHaveTextContent('4.8s');
    // Folded beats keep their detail behind a toggle; the answer shows its sources.
    expect(
      within(beats[2]).queryByTestId('activity-calls')
    ).not.toBeInTheDocument();
    expect(screen.getByTestId('activity-answer-sources')).toHaveTextContent(
      '[26] thoroughcare.net'
    );
    fireEvent.click(within(beats[1]).getByTestId('activity-beat-toggle'));
    expect(beats[1]).toHaveTextContent('Those three wedges were inferences');
  });

  it('names the reference on a training-knowledge chip, not just its number', () => {
    render(
      <ActivityPanel
        events={completedEvents}
        isLive={false}
        citedSources={[
          ...completed.web_sources,
          {
            index: 31,
            title: 'Madrian & Shea, QJE, 2001',
            url: '',
            origin: 'training' as const,
          },
          { index: 32, title: ' ', url: '', origin: 'training' as const },
        ]}
      />
    );
    fireEvent.click(header());
    const chips = screen.getByTestId('activity-answer-sources');
    expect(chips).toHaveTextContent('[31] Madrian & Shea, QJE, 2001');
    // A reference that came back empty still says where the citation is from.
    expect(chips).toHaveTextContent('[32] From training knowledge');
    expect(chips).toHaveTextContent('[26] thoroughcare.net');
  });

  it('switches to the evidence ledger on the cited sources', () => {
    render(
      <ActivityPanel
        events={completedEvents}
        isLive={false}
        citedSources={completed.web_sources}
      />
    );
    fireEvent.click(header());
    fireEvent.click(screen.getByTestId('activity-tab-evidence'));
    expect(screen.getByTestId('activity-tab-evidence')).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getAllByTestId('activity-evidence-source')).toHaveLength(6);
    expect(
      screen.getAllByTestId('activity-evidence-source')[0]
    ).toHaveTextContent('cms.gov · Jun 1, 2023 · query 1');

    expect(screen.getByRole('radio', { name: 'Cited · 6' })).toHaveAttribute(
      'aria-checked',
      'true'
    );
    fireEvent.click(screen.getByRole('radio', { name: /Not cited · 25/ }));
    expect(screen.getAllByTestId('activity-evidence-source')).toHaveLength(25);
    fireEvent.click(screen.getByRole('radio', { name: 'Cited · 6' }));
    fireEvent.click(screen.getAllByTestId('activity-show-not-cited')[0]);
    expect(screen.getAllByTestId('activity-evidence-source')).toHaveLength(
      6 + 21
    );
  });

  it('cross-links a story beat to its evidence and back', () => {
    render(<ActivityPanel events={liveEvents} isLive />);
    fireEvent.click(screen.getAllByTestId('activity-show-evidence')[0]);
    expect(screen.getByTestId('activity-evidence')).toBeInTheDocument();
    const group = screen.getAllByTestId('activity-evidence-group')[0];
    expect(group.className).toMatch(/beatFocused/);
    fireEvent.click(within(group).getByTestId('activity-evidence-group-head'));
    expect(screen.getByTestId('activity-story')).toBeInTheDocument();
    const focused = screen
      .getAllByTestId('activity-beat')
      .filter(b => /beatFocused/.test(b.className));
    expect(focused).toHaveLength(1);
    expect(focused[0]).toHaveAttribute('data-beat-type', 'tools');
  });

  it('shows a non-author counts only', () => {
    render(
      <ActivityPanel
        events={redacted(completedEvents)}
        isLive={false}
        citedSources={completed.web_sources}
      />
    );
    fireEvent.click(header());
    expect(screen.getByTestId('activity-tile-memories')).toHaveTextContent(
      '16'
    );
    const memoryBeat = screen.getAllByTestId('activity-beat')[0];
    expect(
      within(memoryBeat).queryByTestId('activity-beat-toggle')
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId('activity-tab-evidence'));
    expect(
      screen.queryByTestId('activity-developer-section')
    ).not.toBeInTheDocument();
    fireEvent.click(
      within(screen.getByTestId('activity-memory-section')).getByRole('button')
    );
    expect(screen.getByTestId('activity-memory-redacted')).toBeInTheDocument();
    expect(
      screen.queryByTestId('activity-memory-texts')
    ).not.toBeInTheDocument();
  });

  it('gives the author memory texts and developer details', () => {
    render(
      <ActivityPanel
        events={completedEvents}
        isLive={false}
        citedSources={completed.web_sources}
      />
    );
    fireEvent.click(header());
    fireEvent.click(screen.getByTestId('activity-tab-evidence'));
    fireEvent.click(
      within(screen.getByTestId('activity-memory-section')).getByRole('button')
    );
    expect(screen.getByTestId('activity-memory-texts')).toHaveTextContent(
      'Prefers free and open-source tools.'
    );
    expect(
      screen.getByTestId('activity-developer-section')
    ).toBeInTheDocument();
  });

  it('lists skipped and denied searches as failed evidence', () => {
    render(
      <ActivityPanel
        events={denied.events as ActivityEvent[]}
        isLive={false}
        citedSources={denied.web_sources}
      />
    );
    fireEvent.click(header());
    fireEvent.click(screen.getByTestId('activity-tab-evidence'));
    fireEvent.click(screen.getByRole('radio', { name: /Failed · 4/ }));
    const failed = screen.getAllByTestId('activity-evidence-failed');
    expect(failed).toHaveLength(4);
    expect(failed[3]).toHaveTextContent('Denied: search limit reached');
    expect(screen.getByTestId('activity-tile-searches')).toHaveTextContent(
      '5 of 5'
    );
  });

  it('marks a stopped turn and its unfinished calls', () => {
    render(
      <ActivityPanel
        events={stopped.events as ActivityEvent[]}
        isLive={false}
        stopReason="cancelled"
      />
    );
    expect(screen.getByTestId('activity-panel')).toHaveAttribute(
      'data-status',
      'stopped'
    );
    expect(header()).toHaveTextContent('Stopped after 7.9s');
    fireEvent.click(header());
    const beats = screen.getAllByTestId('activity-beat');
    fireEvent.click(
      within(beats[beats.length - 1]).getByTestId('activity-beat-toggle')
    );
    const calls = screen.getAllByTestId('activity-call');
    expect(calls.map(c => c.getAttribute('data-call-status'))).toEqual([
      'stopped',
      'done',
      'done',
    ]);
  });

  it('falls back to a monogram when a site icon fails or is not https', () => {
    render(<ActivityPanel events={liveEvents} isLive />);
    const icons = screen.getAllByTestId('activity-site-icon');
    expect(icons[0]).toHaveAttribute('referrerpolicy', 'no-referrer');
    const before = screen.queryAllByTestId('activity-site-monogram').length;
    fireEvent.error(icons[0]);
    expect(screen.queryAllByTestId('activity-site-monogram')).toHaveLength(
      before + 1
    );
  });

  it('never loads an http icon', () => {
    const events = JSON.parse(JSON.stringify(liveEvents));
    const toolsEnd = events.find(
      (e: { type: string; kind?: string }) =>
        e.type === 'step.end' && e.kind === 'tools'
    );
    toolsEnd.calls[0].sources[0].favicon = 'http://www.cms.gov/favicon.ico';
    render(<ActivityPanel events={events} isLive />);
    const first = screen.getAllByTestId('activity-source')[0];
    expect(
      within(first).queryByTestId('activity-site-icon')
    ).not.toBeInTheDocument();
    expect(
      within(first).getByTestId('activity-site-monogram')
    ).toHaveTextContent('C');
  });

  it('keeps the live clock running between events', () => {
    jest.useFakeTimers();
    const now = jest.spyOn(performance, 'now');
    try {
      now.mockReturnValue(1000);
      render(<ActivityPanel events={liveEvents} isLive />);
      expect(screen.getByTestId('activity-tile-time')).toHaveTextContent('14s');
      now.mockReturnValue(4000);
      act(() => {
        jest.advanceTimersByTime(300);
      });
      expect(screen.getByTestId('activity-tile-time')).toHaveTextContent('17s');
    } finally {
      now.mockRestore();
      jest.useRealTimers();
    }
  });
});
