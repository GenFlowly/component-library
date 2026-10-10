import React from 'react';
import { render, screen } from '@testing-library/react';
import TextContainer, { extractText, PreBlock } from './TextContainer';
import '@testing-library/jest-dom';

// Mock the lazy-loaded Core module so Suspense resolves immediately in tests
jest.mock('./TextContainerCore', () => {
  const React = require('react');
  return {
    __esModule: true,
    extractText: (nodes: any[]) =>
      nodes
        .map(
          (n: any) =>
            n.value ||
            (n.children
              ? n.children.map((c: any) => c.value || '').join('')
              : '')
        )
        .join(''),
    PreBlock: ({ node, children, ...props }: any) => (
      <div style={{ position: 'relative' }}>
        <button title="Copy Code">Copy Code</button>
        <pre {...props}>{children}</pre>
      </div>
    ),
    default: ({
      title,
      content,
      showCopyButton = true,
      className,
      isLoading,
      children,
      'data-testid': testId,
      loadingContent,
    }: any) => {
      const headerContent =
        typeof title === 'string' ? <h2>{title}</h2> : title;
      return (
        <article className={`article ${className || ''}`} data-testid={testId}>
          {(headerContent || showCopyButton) && (
            <header data-testid={testId ? `${testId}-header` : undefined}>
              <div>
                {headerContent}
                {showCopyButton && (
                  <button
                    data-testid={testId ? `${testId}-copy-button` : undefined}
                  >
                    Copy
                  </button>
                )}
              </div>
            </header>
          )}
          {isLoading ? (
            loadingContent
          ) : (
            <div data-testid="markdown-content">{content}</div>
          )}
          {children}
        </article>
      );
    },
  };
});

// Mock ReactMarkdown and plugins to avoid ESM issues and simplify testing
jest.mock('react-markdown', () => (props: any) => {
  return <div data-testid="markdown-content">{props.children}</div>;
});
jest.mock('remark-gfm', () => () => {});
jest.mock('remark-math', () => () => {});
jest.mock('rehype-highlight', () => () => {});
jest.mock('rehype-katex', () => () => {});

describe('TextContainer Component', () => {
  const defaultProps = {
    content: 'Markdown Content',
    'data-testid': 'test-container',
  };

  test('renders content correctly', async () => {
    render(<TextContainer {...defaultProps} />);

    const container = screen.getByTestId('test-container');
    expect(container).toBeInTheDocument();

    const markdown = await screen.findByTestId('markdown-content');
    expect(markdown).toHaveTextContent('Markdown Content');
  });

  test('renders loading state', () => {
    render(
      <TextContainer
        {...defaultProps}
        isLoading={true}
        loadingContent={<div data-testid="custom-loading">Loading...</div>}
      />
    );

    const loading = screen.getByTestId('custom-loading');
    expect(loading).toBeInTheDocument();
    expect(loading).toHaveTextContent('Loading...');

    // Should not render markdown when loading
    expect(screen.queryByTestId('markdown-content')).not.toBeInTheDocument();
  });

  test('renders nothing when loading if no loadingContent provided', () => {
    render(<TextContainer {...defaultProps} isLoading={true} />);
    expect(screen.queryByTestId('markdown-content')).not.toBeInTheDocument();
    // and no loading content
    expect(
      screen.queryByTestId('test-container-loading')
    ).not.toBeInTheDocument();
  });

  test('does NOT render loadingContent when isLoading is false', () => {
    render(
      <TextContainer
        {...defaultProps}
        isLoading={false}
        loadingContent={<div data-testid="should-not-exist">Loading...</div>}
      />
    );

    expect(screen.queryByTestId('should-not-exist')).not.toBeInTheDocument();
    expect(screen.getByTestId('markdown-content')).toBeInTheDocument();
  });

  test('renders title as string', () => {
    render(<TextContainer {...defaultProps} title="My Title" />);

    const header = screen.getByTestId('test-container-header');
    expect(header).toBeInTheDocument();
    expect(header).toHaveTextContent('My Title');
    expect(header.querySelector('h2')).toBeInTheDocument();
  });

  test('renders title as component', () => {
    render(
      <TextContainer
        {...defaultProps}
        title={<span data-testid="custom-title">Custom Title</span>}
      />
    );

    const customTitle = screen.getByTestId('custom-title');
    expect(customTitle).toBeInTheDocument();
    expect(customTitle).toHaveTextContent('Custom Title');
  });

  test('shows copy button by default', () => {
    render(<TextContainer {...defaultProps} />);

    const copyButton = screen.getByTestId('test-container-copy-button');
    expect(copyButton).toBeInTheDocument();
  });

  test('hides copy button when prop is false', () => {
    render(<TextContainer {...defaultProps} showCopyButton={false} />);

    expect(
      screen.queryByTestId('test-container-copy-button')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByTestId('test-container-header')
    ).not.toBeInTheDocument();
  });

  test('renders children', () => {
    render(
      <TextContainer {...defaultProps}>
        <div data-testid="child-element">Child</div>
      </TextContainer>
    );

    expect(screen.getByTestId('child-element')).toBeInTheDocument();
  });
});

describe('TextContainer Internals', () => {
  describe('extractText', () => {
    test('extracts text from simple node', () => {
      const nodes = [{ value: 'Hello' }];
      expect(extractText(nodes)).toBe('Hello');
    });

    test('extracts text from nested nodes', () => {
      const nodes = [{ value: 'Hello ' }, { children: [{ value: 'World' }] }];
      expect(extractText(nodes)).toBe('Hello World');
    });

    test('handles empty input', () => {
      expect(extractText([])).toBe('');
    });

    test('ignores nodes without value or children', () => {
      const nodes = [{ other: 'prop' }, { value: 'Text' }];
      expect(extractText(nodes)).toBe('Text');
    });
  });

  describe('PreBlock', () => {
    test('renders pre block with copy button', () => {
      const node = {
        children: [{ value: 'console.log("test")' }],
      };

      render(
        <PreBlock node={node}>
          <code>console.log("test")</code>
        </PreBlock>
      );

      expect(screen.getByTitle('Copy Code')).toBeInTheDocument();
      expect(screen.getByText('console.log("test")')).toBeInTheDocument();
    });

    test('handles node without children', () => {
      render(
        <PreBlock>
          <code>Info</code>
        </PreBlock>
      );
      expect(screen.getByTitle('Copy Code')).toBeInTheDocument();
    });
  });

  describe('normalizeMathDelimiters', () => {
    const { normalizeMathDelimiters } = jest.requireActual(
      './TextContainerCore'
    );

    test('converts TeX display math to dollar blocks', () => {
      const out = normalizeMathDelimiters('Cost: \\[ \\frac{a}{b} \\]');
      expect(out).toContain('$$\n\\frac{a}{b}\n$$');
      expect(out).not.toContain('\\[');
    });

    test('converts TeX inline math to double dollars (single-dollar math is disabled)', () => {
      expect(normalizeMathDelimiters('where \\( x^2 \\) grows')).toBe(
        'where $$x^2$$ grows'
      );
    });

    test('leaves currency dollar amounts untouched', () => {
      // Real prod regression: two currency amounts in one paragraph must not
      // be altered — with singleDollarTextMath disabled they render as prose.
      const prose =
        'the studio itself has raised roughly **$50M total** to fund this ' +
        'activity across **35+ spinouts** since 2015 — averages somewhere ' +
        'around $1–1.5M, though that is my arithmetic.';
      expect(normalizeMathDelimiters(prose)).toBe(prose);
    });

    test('leaves code fences and inline code untouched', () => {
      const code = '```\n\\[ not math \\]\n```';
      expect(normalizeMathDelimiters(code)).toBe(code);
      expect(normalizeMathDelimiters('`\\( keep \\)`')).toBe('`\\( keep \\)`');
    });

    test('passes through text without math unchanged', () => {
      expect(normalizeMathDelimiters('plain [brackets] (parens)')).toBe(
        'plain [brackets] (parens)'
      );
    });
  });

  describe('rehypeTableMeta', () => {
    const { rehypeTableMeta, MarkdownTable } = jest.requireActual(
      './TextContainerCore'
    );

    // Minimal hast table mirroring remark-gfm output, including the
    // whitespace text nodes it interleaves between elements
    const el = (tagName: string, children: any[] = [], properties: any = {}) =>
      ({ type: 'element', tagName, properties, children }) as any;
    const text = (value: string) => ({ type: 'text', value }) as any;
    const makeTable = (headers: string[], rows: string[][]) =>
      el('table', [
        text('\n'),
        el('thead', [
          el(
            'tr',
            headers.map(h => el('th', [text(h)]))
          ),
        ]),
        text('\n'),
        el('tbody', [
          text('\n'),
          ...rows.map(cells =>
            el(
              'tr',
              cells.map(c => el('td', [text(c)]))
            )
          ),
        ]),
      ]);

    const run = (table: any) => {
      rehypeTableMeta()({ type: 'root', children: [table] });
      return table;
    };

    const bodyCells = (table: any) =>
      table.children
        .filter((n: any) => n.tagName === 'tbody')
        .flatMap((tbody: any) =>
          tbody.children.filter((n: any) => n.tagName === 'tr')
        )
        .flatMap((tr: any) =>
          tr.children.filter((n: any) => n.tagName === 'td')
        );

    test('5+ column tables stack early, cells carry their header label', () => {
      const table = run(
        makeTable(
          ['Model', 'Context', 'Price', 'Speed', 'Notes'],
          [['Fable 5', '1M', '$15', 'fast', 'best']]
        )
      );
      expect(table.properties.dataStack).toBe('early');
      expect(
        bodyCells(table).map((td: any) => td.properties.dataLabel)
      ).toEqual(['Model', 'Context', 'Price', 'Speed', 'Notes']);
    });

    test('3-4 column tables stack late', () => {
      const table = run(
        makeTable(['Name', 'Role', 'Team'], [['Ada', 'Eng', 'Core']])
      );
      expect(table.properties.dataStack).toBe('late');
    });

    test('1-2 column tables are left untouched — wrapping alone keeps them legible', () => {
      const table = run(makeTable(['Key', 'Value'], [['a', '1']]));
      expect(table.properties.dataStack).toBeUndefined();
      expect(
        bodyCells(table).every(
          (td: any) => td.properties.dataLabel === undefined
        )
      ).toBe(true);
    });

    test('extra cells beyond the header get no label', () => {
      const table = run(
        makeTable(['A', 'B', 'C'], [['1', '2', '3', 'surplus']])
      );
      const labels = bodyCells(table).map((td: any) => td.properties.dataLabel);
      expect(labels).toEqual(['A', 'B', 'C', undefined]);
    });

    test('MarkdownTable wraps the table in the scroll safety net', () => {
      render(
        <MarkdownTable data-stack="early">
          <tbody>
            <tr>
              <td>cell</td>
            </tr>
          </tbody>
        </MarkdownTable>
      );
      const table = screen.getByRole('table');
      expect(table).toHaveAttribute('data-stack', 'early');
      expect(table.parentElement?.className).toContain('tableScroll');
    });
  });

  describe('REMARK_PLUGINS math config', () => {
    const { REMARK_PLUGINS } = jest.requireActual('./TextContainerCore');

    test('disables single-dollar inline math so currency stays prose', () => {
      // Guards the prod bug where "$50M … $1.5M" in one paragraph was
      // typeset as a single KaTeX span (spaces dropped, ** became ∗∗).
      const mathEntry = REMARK_PLUGINS.find((plugin: any) =>
        Array.isArray(plugin)
      );
      expect(mathEntry).toBeDefined();
      expect(mathEntry[1]).toEqual({ singleDollarTextMath: false });
    });
  });

  describe('MarkdownLink', () => {
    // The module-level mock above stubs TextContainerCore; pull the real
    // component (its react-markdown import stays mocked)
    const { MarkdownLink: RealMarkdownLink } = jest.requireActual(
      './TextContainerCore'
    );

    test('opens in a new tab with safe rel and keeps href/children', () => {
      render(
        <RealMarkdownLink href="https://example.com">example</RealMarkdownLink>
      );
      const link = screen.getByRole('link', { name: 'example' });
      expect(link).toHaveAttribute('href', 'https://example.com');
      expect(link).toHaveAttribute('target', '_blank');
      expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });
});
