import completed from './fixtures/completed_six_searches.json';
import live from './fixtures/live_mid_turn.json';
import denied from './fixtures/denied_searches.json';
import errorTurn from './fixtures/error_turn.json';
import subagent from './fixtures/subagent_call.json';
import memoryOnly from './fixtures/memory_only.json';
import stopped from './fixtures/stopped_turn.json';
import { ActivityEvent } from './activity.models';
import {
  ActivityView,
  appendActivity,
  isActivityEvent,
  reduceActivity,
} from './activity.reduce';

type Fixture = {
  events: unknown[];
  web_sources: { index: number }[];
  live: boolean;
  stop_reason: string | null;
};

function reduce(fixture: Fixture, nowMs?: number): ActivityView {
  return reduceActivity(fixture.events as ActivityEvent[], {
    isLive: fixture.live,
    nowMs,
    stopReason: fixture.stop_reason,
    citedFallback: fixture.web_sources.map(s => s.index),
  });
}

const phaseMs = (view: ActivityView) =>
  Object.fromEntries(view.phases.map(p => [p.id, p.ms]));

describe('reduceActivity — the design 6 completed turn', () => {
  const view = reduce(completed as Fixture);

  it('totals the turn like the receipt on the boards', () => {
    expect(view.status).toBe('done');
    expect(view.totalMs).toBe(22000);
    expect(view.searches).toEqual({ used: 6, max: 6 });
    expect(view.sources).toEqual({ found: 31, cited: 6 });
    expect(view.memories).toEqual({ core: 14, recalled: 2 });
  });

  it('splits the time into the five phases', () => {
    expect(phaseMs(view)).toEqual({
      memory: 400,
      plan: 3100,
      search: 10000,
      reason: 6500,
      answer: 2000,
    });
    expect(view.phases.map(p => p.id)).toEqual([
      'memory',
      'plan',
      'search',
      'reason',
      'answer',
    ]);
    expect(view.phases.some(p => p.running)).toBe(false);
  });

  it('tells the story in seven beats', () => {
    expect(view.beats.map(b => b.type)).toEqual([
      'memory',
      'plan',
      'tools',
      'plan',
      'tools',
      'read',
      'answer',
    ]);
    expect(view.beats.map(b => b.durationMs)).toEqual([
      400, 3100, 4800, 2900, 5200, 3600, 2000,
    ]);
    const plan = view.beats[1];
    expect(plan.type === 'plan' && plan.reasoning).toMatch(
      /^Those three wedges were inferences/
    );
  });

  it('pairs each search with its purpose, result count and time', () => {
    const tools = view.beats[2];
    if (tools.type !== 'tools') throw new Error('expected tools');
    expect(tools.family).toBe('search');
    expect(
      tools.calls.map(c => [c.seq, c.status, c.resultCount, c.durationMs])
    ).toEqual([
      [1, 'done', 9, 4600],
      [2, 'done', 8, 3900],
      [3, 'done', 8, 4200],
    ]);
    expect(tools.calls[0].purpose).toBe(
      'Find measured technology adoption by industry for small firms.'
    );
    expect(tools.calls[0].query).toBe(
      'US small business technology adoption by industry, Census ABS 2024-2025'
    );
    expect(tools.found).toBe(25);
    expect(tools.cited).toBe(4);
    const empty = view.beats[4];
    expect(empty.type === 'tools' && empty.calls[2].resultCount).toBe(0);
  });

  it('marks sources cited or not and keeps their site, icon and date', () => {
    const first = view.evidence[0].sources[0];
    expect(first).toMatchObject({
      index: 1,
      domain: 'cms.gov',
      cited: true,
      favicon: 'https://www.cms.gov/favicon.ico',
      published_date: '2023-06-01',
      callSeq: 1,
    });
    expect(view.evidence[0].sources[1]).toMatchObject({
      index: 2,
      cited: false,
    });
  });

  it('ends with the answer and the sources it cites', () => {
    const answer = view.beats[6];
    if (answer.type !== 'answer') throw new Error('expected answer');
    expect(answer.citedSources.map(s => s.index)).toEqual([
      1, 3, 12, 21, 26, 27,
    ]);
  });

  it('groups the evidence by step', () => {
    expect(view.evidence.map(g => [g.found, g.cited, g.durationMs])).toEqual([
      [25, 4, 4800],
      [6, 2, 5200],
    ]);
    expect(view.evidence[0].beatId).toBe(view.beats[2].id);
  });

  it('keeps the author-only data for the author', () => {
    expect(view.memoryTexts?.recalled).toHaveLength(2);
    expect(view.memoryTexts?.core).toHaveLength(14);
    expect(view.developer).toHaveLength(3);
  });
});

describe('reduceActivity — live mid-turn', () => {
  const view = reduce(live as Fixture, 14300);

  it('runs the clock from the server timeline', () => {
    expect(view.status).toBe('live');
    expect(view.totalMs).toBe(14300);
    expect(phaseMs(view)).toEqual({
      memory: 400,
      plan: 3100,
      search: 7900,
      reason: 2900,
    });
    expect(view.phases.find(p => p.running)?.id).toBe('search');
  });

  it('shows the running round with one query ticked off', () => {
    const running = view.beats[view.beats.length - 1];
    if (running.type !== 'tools') throw new Error('expected tools');
    expect(running.status).toBe('running');
    expect(running.calls.map(c => [c.status, c.resultCount ?? null])).toEqual([
      ['done', 4],
      ['running', null],
      ['running', null],
    ]);
    expect(running.calls[1].purpose).toBe(
      'Measure how much eligible CCM billing goes unused.'
    );
    expect(view.current).toEqual({
      kind: 'search',
      query: 'unused CCM billing eligible practices percent',
    });
  });

  it('counts the searches in flight and holds citations until the answer', () => {
    expect(view.searches).toEqual({ used: 6, max: 6 });
    expect(view.sources).toEqual({ found: 25, cited: null });
    expect(view.evidence[0].sources.every(s => s.cited === null)).toBe(true);
  });

  it('never trusts the interim full source list as citations', () => {
    const v = reduceActivity(live.events as ActivityEvent[], {
      isLive: true,
      nowMs: 14300,
      citedFallback: [1, 2, 3],
    });
    expect(v.sources.cited).toBeNull();
  });
});

describe('reduceActivity — when the answer starts', () => {
  const events = completed.events as ActivityEvent[];
  /** The completed turn's log up to and including the first matching event. */
  const upTo = (type: string, id: string) =>
    events.slice(
      0,
      events.findIndex(e => e.type === type && 'id' in e && e.id === id) + 1
    );
  const answering = (log: ActivityEvent[]) =>
    reduceActivity(log, { isLive: true }).answering;

  it("takes the step for the answer once it writes more than a preamble's worth", () => {
    expect(answering(upTo('step.progress', 'NODAGENT001:3'))).toBe(false);
    expect(answering(upTo('step.writing', 'NODAGENT001:3'))).toBe(true);
  });

  it('never takes a preamble followed by a tool call for the answer', () => {
    expect(answering(upTo('step.progress', 'NODAGENT001:1'))).toBe(false);
    expect(answering(upTo('step.calling', 'NODAGENT001:1'))).toBe(false);
    const longPreamble: ActivityEvent[] = [
      ...upTo('step.writing', 'NODAGENT001:3'),
      { v: 2, at: 21500, type: 'step.calling', id: 'NODAGENT001:3' },
    ];
    expect(answering(longPreamble)).toBe(false);
  });

  it('is the answer once the answer step ends, however short it was', () => {
    expect(answering(upTo('step.end', 'NODAGENT001:3'))).toBe(true);
  });

  it('is thinking while a later step runs, and never once the log says the turn is over', () => {
    expect(answering(live.events as ActivityEvent[])).toBe(false);
    const ended = reduceActivity(events, { isLive: true });
    expect(ended.status).toBe('done');
    expect(ended.answering).toBe(false);
  });
});

describe('reduceActivity — budget modes', () => {
  const view = reduce(denied as Fixture);

  it('counts only the searches that reached the provider', () => {
    expect(view.searches).toEqual({ used: 5, max: 5 });
    expect(view.sources).toEqual({ found: 6, cited: 2 });
  });

  it('reports skipped and denied calls as failed evidence', () => {
    const statuses = view.evidence.map(g => g.calls.map(c => c.status));
    expect(statuses).toEqual([
      ['done', 'done', 'done', 'skipped'],
      ['done', 'skipped', 'skipped'],
      ['done', 'denied'],
    ]);
    expect(view.evidence.reduce((n, g) => n + g.failedCalls.length, 0)).toBe(4);
  });

  it('numbers the planning rounds', () => {
    const rounds = view.beats
      .filter(b => b.type === 'plan')
      .map(b => (b.type === 'plan' ? b.round : 0));
    expect(rounds).toEqual([1, 2, 3]);
  });
});

describe('reduceActivity — failure, delegation, plain answers, stops', () => {
  it('marks an open step failed when the turn errored and knows no citations', () => {
    const view = reduce(errorTurn as Fixture);
    expect(view.status).toBe('failed');
    expect(view.totalMs).toBe(4200);
    const last = view.beats[view.beats.length - 1];
    expect(last).toMatchObject({
      type: 'thinking',
      status: 'failed',
      durationMs: 700,
    });
    const tools = view.beats[2];
    expect(tools.type === 'tools' && tools.calls[1]).toMatchObject({
      status: 'failed',
      error: 'TimeoutError: search provider did not answer within 30s',
    });
    expect(view.sources.cited).toBeNull();
    expect(view.memories).toEqual({ core: 0, recalled: 0 });
  });

  it('treats a subagent as its own tool family with an author-only trace', () => {
    const view = reduce(subagent as Fixture);
    expect(view.beats.map(b => b.type)).toEqual([
      'memory',
      'plan',
      'tools',
      'read',
      'answer',
    ]);
    const plan = view.beats[1];
    expect(plan.type === 'plan' && plan.family).toBe('subagent');
    const tools = view.beats[2];
    if (tools.type !== 'tools') throw new Error('expected tools');
    expect(tools.family).toBe('subagent');
    expect(tools.calls[0]).toMatchObject({
      query: expect.stringMatching(/^Compare ChartSpan and ThoroughCare/),
      purpose: 'Compare the two funded CCM vendors on price and practice size.',
      hasDetails: true,
      resultCount: 2,
    });
    expect(view.sources).toEqual({ found: 2, cited: 2 });
  });

  it('answers without tools in two beats and splits reasoning from writing', () => {
    const view = reduce(memoryOnly as Fixture);
    expect(view.beats.map(b => b.type)).toEqual(['memory', 'answer']);
    expect(view.beats[1].durationMs).toBe(1900);
    expect(phaseMs(view)).toEqual({ memory: 200, reason: 600, answer: 1300 });
    expect(view.searches.used).toBe(0);
  });

  it('shows a stopped turn as stopped, with the calls that finished', () => {
    const view = reduce(stopped as Fixture);
    expect(view.status).toBe('stopped');
    expect(view.totalMs).toBe(7900);
    const tools = view.beats[view.beats.length - 1];
    if (tools.type !== 'tools') throw new Error('expected tools');
    expect(tools.status).toBe('stopped');
    expect(tools.calls.map(c => c.status)).toEqual(['stopped', 'done', 'done']);
    expect(view.current).toBeUndefined();
  });
});

describe('reduceActivity — robustness', () => {
  it('is empty for no log', () => {
    expect(reduceActivity(null, { isLive: false }).isEmpty).toBe(true);
  });

  it('counts the wait before the first step as setup while live', () => {
    const view = reduceActivity([{ v: 2, at: 0, type: 'turn.start' }], {
      isLive: true,
      nowMs: 2400,
    });
    expect(view.phases).toEqual([{ id: 'setup', ms: 2400, running: true }]);
  });

  it('ignores unknown event types and other versions', () => {
    const events = [
      ...(completed.events as ActivityEvent[]),
      { v: 2, at: 1, type: 'step.future', id: 'x' },
      {
        v: 3,
        at: 1,
        type: 'step.start',
        id: 'y',
        kind: 'llm',
        node: 'y',
        name: 'Y',
      },
    ] as unknown as ActivityEvent[];
    expect(reduceActivity(events, { isLive: false }).beats).toHaveLength(7);
  });

  it('tolerates a replayed prefix on reattach', () => {
    const events = completed.events as ActivityEvent[];
    const replayed = [...events.slice(0, 6), ...events];
    const view = reduceActivity(replayed, { isLive: false });
    expect(view.beats.map(b => b.type)).toEqual(
      reduce(completed as Fixture).beats.map(b => b.type)
    );
  });

  it('tolerates converted history without timestamps', () => {
    const events: ActivityEvent[] = [
      { v: 2, at: null, type: 'turn.start' },
      {
        v: 2,
        at: null,
        type: 'step.start',
        id: 'a:1',
        kind: 'llm',
        node: 'a',
        name: 'Agent',
      },
      {
        v: 2,
        at: null,
        type: 'step.end',
        id: 'a:1',
        kind: 'llm',
        node: 'a',
        name: 'Agent',
        outcome: 'answer',
      },
      { v: 2, at: null, type: 'turn.end', outcome: 'completed' },
    ];
    const view = reduceActivity(events, { isLive: false });
    expect(view.status).toBe('done');
    expect(view.totalMs).toBeNull();
    expect(view.beats).toEqual([
      expect.objectContaining({ type: 'answer', durationMs: null }),
    ]);
    // Nothing to put in the tiles: no time, searches, sources or memories.
    expect(view.hasReceipt).toBe(false);
  });

  it('keeps the receipt whenever a tile has something to say', () => {
    for (const f of [completed, live, memoryOnly, stopped]) {
      const view = reduceActivity(f.events as ActivityEvent[], {
        isLive: f.live,
        stopReason: f.stop_reason,
      });
      expect(view.hasReceipt).toBe(true);
    }
  });

  it('appends only real v2 events', () => {
    const start = { v: 2, at: 0, type: 'turn.start' };
    expect(appendActivity(null, start)).toEqual([start]);
    expect(appendActivity([], { t: 'ks' })).toEqual([]);
    expect(isActivityEvent({ v: 1, type: 'turn.start' })).toBe(false);
  });
});
