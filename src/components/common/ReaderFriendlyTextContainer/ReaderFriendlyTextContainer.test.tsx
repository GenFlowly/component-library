import React from 'react';
import { act, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReaderFriendlyTextContainer from './ReaderFriendlyTextContainer';

// The markdown pipeline is ESM-only; the mock renders each [label](url) link
// in the content through the container's own `a` renderer, so the citation
// path is the real one.
jest.mock('react-markdown', () => (props: any) => {
  const React = jest.requireActual('react');
  const A = props.components.a;
  const parts: any[] = [];
  // [label](url) is a link; {more:18 19|url} is the "+N" link that
  // rehypeCitationRuns folds a long run into
  const pattern = /\[(\[\d+\]|[^\]]+)\]\(([^)]+)\)|\{more:([\d ]+)\|([^}]+)\}/g;
  const text = String(props.children);
  let last = 0;
  let key = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    parts.push(text.slice(last, match.index));
    if (match[3]) {
      const markers = match[3]
        .split(' ')
        .map((n: string) => `[${n}]`)
        .join('');
      parts.push(
        React.createElement(
          A,
          { key: key++, href: match[4], 'data-citation-more': match[3] },
          markers
        )
      );
    } else {
      parts.push(
        React.createElement(A, { key: key++, href: match[2] }, match[1])
      );
    }
    last = match.index + match[0].length;
  }
  parts.push(text.slice(last));
  return React.createElement('div', { 'data-testid': 'markdown' }, parts);
});
jest.mock('remark-gfm', () => () => {});
jest.mock('remark-math', () => () => {});
jest.mock('rehype-highlight', () => () => {});
jest.mock('rehype-katex', () => () => {});

const sources = [
  {
    index: 16,
    title: 'Form 4: Jassy Andrew R',
    url: 'https://www.sec.gov/form4',
    published_date: '2026-11-05',
  },
  { index: 17, title: 'Insider tracker', url: 'https://tracker.example/j' },
];

const click = (element: Element) => {
  const event = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    button: 0,
  });
  act(() => {
    element.dispatchEvent(event);
  });
  return event;
};

describe('ReaderFriendlyTextContainer', () => {
  test("a citation from the model's own knowledge is a chip that opens nothing", async () => {
    render(
      <ReaderFriendlyTextContainer
        content="Defaults work [4]."
        sources={[
          {
            index: 4,
            title: 'Madrian & Shea, QJE, 2001',
            url: '',
            origin: 'training',
          },
        ]}
      />
    );
    const chip = await screen.findByTestId('citation-chip');
    expect(chip).toHaveAttribute('data-label', '4');
    expect(chip).not.toHaveAttribute('href');
    expect(chip).toHaveAttribute('role', 'button');
    click(chip);
    const row = await screen.findByTestId('citation-source');
    expect(row).toHaveTextContent('Madrian & Shea, QJE, 2001');
    expect(row).toHaveTextContent('From training knowledge');
    expect(row.querySelector('a')).toBeNull();
  });

  test('turns citation markers with a source into chips', async () => {
    render(
      <ReaderFriendlyTextContainer
        content="Visible wealth is $600M [16][17] and more [9]."
        sources={sources}
        data-testid="reader"
      />
    );
    const chips = await screen.findAllByTestId('citation-chip');
    expect(chips).toHaveLength(2);
    expect(chips[0]).toHaveAttribute('data-label', '16');
    expect(chips[0]).toHaveAttribute('href', 'https://www.sec.gov/form4');
    expect(chips[0]).toHaveAttribute(
      'aria-label',
      'Source 16: Form 4: Jassy Andrew R'
    );
    expect(chips[0]).toHaveTextContent('[16]');
    expect(screen.getByTestId('markdown')).toHaveTextContent('[9]');
  });

  test('a chip opens its source with domain, date and how often it is cited', async () => {
    render(
      <ReaderFriendlyTextContainer
        content="A [16]. B [16]. C [17]."
        sources={sources}
      />
    );
    const [chip] = await screen.findAllByTestId('citation-chip');
    click(chip);
    const row = await screen.findByTestId('citation-source');
    expect(row).toHaveTextContent('Form 4: Jassy Andrew R');
    expect(row).toHaveTextContent('sec.gov');
    expect(row).toHaveTextContent('Nov 5, 2026');
    expect(row).toHaveTextContent('Cited 2 times in this answer');
    const title = row.querySelector('a[href="https://www.sec.gov/form4"]');
    expect(title).toHaveAttribute('target', '_blank');
  });

  test('copies the markdown the response has always copied', async () => {
    render(
      <ReaderFriendlyTextContainer
        content="Claim [16]."
        sources={sources}
        data-testid="reader"
      />
    );
    await screen.findByTestId('citation-chip');
    const copy = screen.getByTestId('reader-copy-button');
    expect(copy).toBeInTheDocument();
  });

  test('ordinary links stay links', async () => {
    render(
      <ReaderFriendlyTextContainer
        content="See [the filing](https://www.sec.gov/form4)."
        sources={sources}
      />
    );
    const link = await screen.findByText('the filing');
    expect(link.tagName).toBe('A');
    expect(screen.queryByTestId('citation-chip')).not.toBeInTheDocument();
  });

  test('without sources the text has no chips', async () => {
    render(<ReaderFriendlyTextContainer content="Claim [16]." />);
    expect(await screen.findByTestId('markdown')).toHaveTextContent(
      'Claim [16].'
    );
    expect(screen.queryByTestId('citation-chip')).not.toBeInTheDocument();
  });

  test('the article carries the reading setting', async () => {
    render(
      <ReaderFriendlyTextContainer
        content="Text"
        className="host"
        data-testid="reader"
      />
    );
    await screen.findByTestId('markdown');
    const article = screen.getByTestId('reader');
    expect(article.className).toContain('reader');
    expect(article.className).toContain('host');
  });

  test('a folded run shows "+N" and lists its sources', async () => {
    const many = [16, 17, 18, 19].map(index => ({
      index,
      title: `Source ${index}`,
      url: `https://s${index}.example/`,
    }));
    render(
      <ReaderFriendlyTextContainer
        content="Claim {more:18 19|https://s18.example/}."
        sources={many}
      />
    );
    const more = await screen.findByTestId('citation-more-chip');
    expect(more).toHaveAttribute('data-label', '+2');
    expect(more).toHaveAttribute('aria-label', '2 more sources');
    expect(more).toHaveTextContent('[18][19]');
    click(more);
    const rows = await screen.findAllByTestId('citation-source');
    expect(rows.map(row => row.textContent)).toEqual([
      expect.stringContaining('Source 18'),
      expect.stringContaining('Source 19'),
    ]);
  });
});
