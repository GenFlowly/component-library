import type { Element, ElementContent, Root } from 'hast';
import {
  countCitations,
  linkifyCitations,
  rehypeCitationRuns,
  MAX_CHIPS_IN_RUN,
} from './citations';

const sources = [
  { index: 1, title: 'One', url: 'https://one.example/a' },
  { index: 2, title: 'Two', url: 'https://two.example/b' },
];

const text = (value: string): ElementContent => ({ type: 'text', value });
const cite = (n: number): Element => ({
  type: 'element',
  tagName: 'a',
  properties: { href: `https://s${n}.example` },
  children: [{ type: 'text', value: `[${n}]` }],
});
const paragraph = (...children: ElementContent[]): Root => ({
  type: 'root',
  children: [{ type: 'element', tagName: 'p', properties: {}, children }],
});
const run = (tree: Root) => {
  rehypeCitationRuns({ runClassName: 'run' })(tree);
  return (tree.children[0] as Element).children;
};

describe('linkifyCitations', () => {
  test('links markers that have a source and leaves the rest as text', () => {
    expect(linkifyCitations('A [1][2] and [7].', sources)).toBe(
      'A [[1]](https://one.example/a)[[2]](https://two.example/b) and [7].'
    );
  });

  test('leaves an existing markdown link alone', () => {
    expect(linkifyCitations('[1](https://x.example)', sources)).toBe(
      '[1](https://x.example)'
    );
  });

  test('links markers written with escaped brackets, as plain markers', () => {
    expect(
      linkifyCitations('Growth: **300 req/min** \\[2\\] and \\[7\\].', sources)
    ).toBe('Growth: **300 req/min** [[2]](https://two.example/b) and \\[7\\].');
  });

  test('changes nothing without sources', () => {
    expect(linkifyCitations('A [1].', null)).toBe('A [1].');
    expect(linkifyCitations('A [1].', [])).toBe('A [1].');
  });
});

describe('countCitations', () => {
  test('counts each marker by index', () => {
    const counts = countCitations('a [1] b [2][1] c [1] [x](y) [3](z)');
    expect(counts.get(1)).toBe(3);
    expect(counts.get(2)).toBe(1);
    expect(counts.has(3)).toBe(false);
  });

  test('counts escaped markers too', () => {
    expect(countCitations('a \\[1\\] b [1] c \\[2\\]').get(1)).toBe(2);
  });
});

describe('rehypeCitationRuns', () => {
  test('keeps the last word and its chips together without the space between', () => {
    const children = run(
      paragraph(text('AMZN shares '), cite(16), cite(17), text('.'))
    );
    expect(children[0]).toEqual(text('AMZN '));
    const span = children[1] as Element;
    expect(span.tagName).toBe('span');
    expect(span.properties.className).toEqual(['run']);
    expect(span.children[0]).toEqual(text('shares'));
    expect(span.children.slice(1)).toEqual([cite(16), cite(17)]);
    expect(children[2]).toEqual(text('.'));
  });

  test('keeps a bold last word with its chips, still bold', () => {
    const strong: Element = {
      type: 'element',
      tagName: 'strong',
      properties: {},
      children: [text('123,366,734 (2025)')],
    };
    const children = run(
      paragraph(text('Population: '), strong, text(' '), cite(10))
    );
    expect(children[0]).toEqual(text('Population: '));
    expect(children[1]).toEqual({
      ...strong,
      children: [text('123,366,734 ')],
    });
    const span = children[2] as Element;
    expect(span.children[0]).toEqual({ ...strong, children: [text('(2025)')] });
    expect(span.children[1]).toEqual(cite(10));
  });

  test('leaves inline code whole before chips', () => {
    const code: Element = {
      type: 'element',
      tagName: 'code',
      properties: {},
      children: [text('SP.POP.TOTL value')],
    };
    const children = run(paragraph(text('See '), code, cite(6)));
    expect(children[1]).toEqual(code);
    expect((children[2] as Element).children).toEqual([cite(6)]);
  });

  test('joins chips separated only by spaces into one run', () => {
    const children = run(paragraph(text('Claim'), cite(1), text(' '), cite(2)));
    expect(children).toHaveLength(1);
    const span = children[0] as Element;
    expect(span.children).toEqual([text('Claim'), cite(1), cite(2)]);
  });

  test(`folds a run of more than ${MAX_CHIPS_IN_RUN} into the first ones and a "+N" link`, () => {
    const children = run(
      paragraph(
        text('Claim '),
        cite(1),
        cite(2),
        cite(3),
        cite(4),
        cite(5),
        cite(6)
      )
    );
    const span = children[0] as Element;
    const links = span.children.filter(
      (node): node is Element => node.type === 'element'
    );
    expect(links).toHaveLength(MAX_CHIPS_IN_RUN);
    const more = links[MAX_CHIPS_IN_RUN - 1];
    expect(more.properties.dataCitationMore).toBe('4 5 6');
    expect(more.properties.href).toBe('https://s4.example');
    expect(more.children).toEqual([text('[4][5][6]')]);
  });

  test(`keeps a run of ${MAX_CHIPS_IN_RUN} whole`, () => {
    const children = run(
      paragraph(text('Claim '), cite(1), cite(2), cite(3), cite(4))
    );
    const span = children[0] as Element;
    expect(span.children.filter(node => node.type === 'element')).toHaveLength(
      4
    );
  });

  test('leaves ordinary links and code alone', () => {
    const link: Element = {
      type: 'element',
      tagName: 'a',
      properties: { href: 'https://x.example' },
      children: [text('a page')],
    };
    const code: Element = {
      type: 'element',
      tagName: 'code',
      properties: {},
      children: [cite(1)],
    };
    const children = run(paragraph(text('See '), link, text(' and '), code));
    expect(children).toEqual([text('See '), link, text(' and '), code]);
  });

  test('works inside nested elements such as table cells', () => {
    const tree: Root = {
      type: 'root',
      children: [
        {
          type: 'element',
          tagName: 'td',
          properties: {},
          children: [text('Rate can drop'), cite(3)],
        },
      ],
    };
    rehypeCitationRuns({ runClassName: 'run' })(tree);
    const cell = tree.children[0] as Element;
    expect(cell.children[0]).toEqual(text('Rate can '));
    expect((cell.children[1] as Element).tagName).toBe('span');
  });
});
