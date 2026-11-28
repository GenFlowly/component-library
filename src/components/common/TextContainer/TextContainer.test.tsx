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
      copyLabel,
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
                    aria-label={copyLabel}
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

  test('passes a custom copy label to the copy button', () => {
    render(<TextContainer {...defaultProps} copyLabel="Copy Prompt" />);

    expect(screen.getByTestId('test-container-copy-button')).toHaveAttribute(
      'aria-label',
      'Copy Prompt'
    );
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

    test('leaves a citation marker with escaped brackets as text, not a formula', () => {
      // Real prod answer: a model escaped its citations, which read as display math
      const line = '- Growth: **300 req/min** \\[6\\]\n\n### Next';
      expect(normalizeMathDelimiters(line)).toBe(line);
      expect(normalizeMathDelimiters('x \\[ 2 + 2 \\]')).toContain(
        '$$\n2 + 2\n$$'
      );
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

    describe('numeric columns', () => {
      const { isNumericColumn } = jest.requireActual('./TextContainerCore');
      const decorate = (headers: string[], rows: string[][]) => {
        const tree = el('root', [makeTable(headers, rows)]);
        rehypeTableMeta()(tree);
        return tree;
      };
      const cells = (tree: any, tag: string): any[] => {
        const out: any[] = [];
        const walk = (node: any) => {
          if (node.tagName === tag) out.push(node);
          (node.children || []).forEach(walk);
        };
        walk(tree);
        return out;
      };

      test.each([
        '12',
        '1,234',
        '1,234.50',
        '$0.12',
        '-$5',
        '+3.5',
        '12%',
        '−3',
        '€1.2',
        '1.5k',
        '2M',
        '3.2B',
        '.5',
      ])('%s is a number', value => {
        expect(isNumericColumn([value])).toBe(true);
      });

      test.each([
        'abc',
        '12 apples',
        'v2',
        '2026-11-04',
        '12:30',
        '1.2.3',
        '#5',
        '12 ms',
        '~3',
      ])('%s is not a number', value => {
        expect(isNumericColumn([value])).toBe(false);
      });

      test('placeholders are ignored, but a column of only placeholders is not numeric', () => {
        expect(isNumericColumn(['12', '', '-', '—', '–', 'N/A', 'n/a'])).toBe(
          true
        );
        expect(isNumericColumn(['', '-', 'N/A'])).toBe(false);
        expect(isNumericColumn([])).toBe(false);
      });

      test('one text value makes the whole column text', () => {
        expect(isNumericColumn(['12', 'about 40'])).toBe(false);
      });

      test('marks the header and cells of a numeric column only', () => {
        const tree = decorate(
          ['Item', 'Price'],
          [
            ['Tea', '$3.00'],
            ['Coffee', '$4.50'],
          ]
        );
        expect(cells(tree, 'th').map(c => c.properties.dataNumeric)).toEqual([
          undefined,
          true,
        ]);
        expect(cells(tree, 'td').map(c => c.properties.dataNumeric)).toEqual([
          undefined,
          true,
          undefined,
          true,
        ]);
      });

      test('an alignment set in the markdown wins', () => {
        const table = makeTable(['Item', 'Price'], [['Tea', '3']]);
        const mark = (node: any) => {
          if (
            (node.tagName === 'th' || node.tagName === 'td') &&
            node.children[0].value !== 'Item' &&
            node.children[0].value !== 'Tea'
          ) {
            node.properties = { ...node.properties, align: 'center' };
          }
          (node.children || []).forEach(mark);
        };
        mark(table);
        const tree = el('root', [table]);
        rehypeTableMeta()(tree);
        expect(cells(tree, 'td')[1].properties.dataNumeric).toBeUndefined();
      });
    });

    describe('author alignment', () => {
      // remark-gfm puts a column's ---: / :---: on each of its cells as align
      const aligned = (align: string) => {
        const table = makeTable(
          ['Product', 'Probable status', 'Reason'],
          [
            ['Mobile app', 'Not affected', 'Uses a different stack'],
            ['Web app', 'Affected', 'Same vendor SDK'],
          ]
        );
        const mark = (node: any) => {
          const column = node.tagName === 'tr' ? node.children : [];
          if (column[1]) {
            column[1].properties = { ...column[1].properties, align };
          }
          (node.children || []).forEach(mark);
        };
        mark(table);
        return run(table);
      };
      const columnCells = (table: any) => [
        table.children[1].children[0].children[1],
        ...bodyCells(table).filter((_: any, i: number) => i % 3 === 1),
      ];

      test.each(['right', 'center'])(
        'a %s-aligned column carries it as data-align, not align',
        align => {
          const table = aligned(align);
          for (const cell of columnCells(table)) {
            expect(cell.properties.align).toBeUndefined();
            expect(cell.properties.dataAlign).toBe(align);
          }
          // The label for the stacked cards is still stamped
          expect(bodyCells(table)[1].properties.dataLabel).toBe(
            'Probable status'
          );
        }
      );

      test('cells without an alignment get no data-align', () => {
        const table = aligned('right');
        const others = bodyCells(table).filter(
          (_: any, i: number) => i % 3 !== 1
        );
        expect(others.every((td: any) => !('dataAlign' in td.properties))).toBe(
          true
        );
      });
    });

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

    test('marks long unbreakable runs in cells as data-token spans', () => {
      const table = run(
        makeTable(
          ['Variable', 'Purpose'],
          [['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'Anon key for the browser client']]
        )
      );
      const [key, purpose] = bodyCells(table);
      expect(key.children).toEqual([
        el('span', [text('NEXT_PUBLIC_SUPABASE_ANON_KEY')], {
          dataToken: true,
        }),
      ]);
      // Ordinary prose is left as one text node
      expect(purpose.children).toEqual([
        text('Anon key for the browser client'),
      ]);
    });

    // Token spans hold their text with a soft break after each slash
    const wbr = () => el('wbr');
    const token = (...parts: string[]) =>
      el(
        'span',
        parts.flatMap((part, i) => (i ? [wbr(), text(part)] : [text(part)])),
        { dataToken: true }
      );
    const runCell = (cell: any) => {
      run(
        el('table', [
          el('thead', [el('tr', [el('th', [text('Notes')])])]),
          el('tbody', [el('tr', [cell])]),
        ])
      );
      return cell.children;
    };

    test('keeps the text around a token and recurses into formatting', () => {
      expect(
        runCell(
          el('td', [
            text('see java.util.concurrent.ConcurrentHashMap docs '),
            el('strong', [text('/var/lib/postgresql/data')]),
            el('code', [text('a_very_long_identifier_in_code')]),
          ])
        )
      ).toEqual([
        text('see '),
        token('java.util.concurrent.ConcurrentHashMap'),
        text(' docs '),
        el('strong', [token('/', 'var/', 'lib/', 'postgresql/', 'data')]),
        // Code already wraps anywhere on its own, and ends the run
        el('code', [text('a_very_long_identifier_in_code')]),
      ]);
    });

    test('a run continues across formatting and literal HTML', () => {
      // The browser lays **PostgreSQL**/**MySQL**… out as one unbroken run
      expect(
        runCell(
          el('td', [
            el('strong', [text('PostgreSQL')]),
            text('/'),
            el('strong', [text('MySQL')]),
            text('/'),
            el('strong', [text('SQLite')]),
            text(' or none'),
          ])
        )
      ).toEqual([
        el('strong', [token('PostgreSQL')]),
        token('/'),
        el('strong', [token('MySQL')]),
        token('/'),
        el('strong', [token('SQLite')]),
        text(' or none'),
      ]);
      // Without rehype-raw, <br> renders as text
      const raw = (value: string) => ({ type: 'raw', value }) as any;
      expect(
        runCell(
          el('td', [
            text('Mon'),
            raw('<br>'),
            text('Tue'),
            raw('<br>'),
            text('Wed'),
            raw('<br>'),
            text('Thu'),
          ])
        )
      ).toEqual([
        token('Mon'),
        token('<br>'),
        token('Tue'),
        token('<br>'),
        token('Wed'),
        token('<br>'),
        token('Thu'),
      ]);
    });

    test('leaves links, images, whitespace and short runs alone', () => {
      const cell = el('td', [
        el('a', [text('https://example.com/a/very/long/path/to/a/page')], {
          href: 'https://example.com/a/very/long/path/to/a/page',
        }),
        text(' left' + ' '.repeat(30) + 'right '),
        el('img', [], { alt: 'a_very_long_image_alt_text_here' }),
      ]);
      const before = JSON.stringify(cell);
      runCell(cell);
      expect(JSON.stringify(cell)).toBe(before);
    });

    test('marks header cells too, and labels stay plain text', () => {
      const table = run(
        makeTable(
          ['Key', 'storage.retention_period_days', 'Notes'],
          [['a', '30', 'b']]
        )
      );
      const [th] = table.children
        .find((n: any) => n.tagName === 'thead')
        .children[0].children.slice(1);
      expect(th.children).toEqual([token('storage.retention_period_days')]);
      expect(bodyCells(table)[1].properties.dataLabel).toBe(
        'storage.retention_period_days'
      );
    });

    test('isLongToken: identifiers sooner than words', () => {
      const { isLongToken } = jest.requireActual('./TextContainerCore');
      // Identifier-like runs from 16 characters
      expect(isLongToken('order_created_at_utc')).toBe(true);
      expect(isLongToken('src/components/App.tsx')).toBe(true);
      expect(isLongToken('ConcurrentHashMap')).toBe(true);
      expect(isLongToken('DATABASE_URL')).toBe(false);
      // Ordinary words stay whole until absurdly long
      expect(isLongToken('Internationalization')).toBe(false);
      expect(isLongToken('well-established,')).toBe(false);
      expect(isLongToken('Auftragsverarbeitungsvertrag')).toBe(true);
      // Numbers stay whole up to 21 characters
      expect(isLongToken('$210,352,000,000')).toBe(false);
      expect(isLongToken('602,214,076,000,000,000,000,000')).toBe(true);
      expect(isLongToken('')).toBe(false);
      expect(isLongToken(' '.repeat(30))).toBe(false);
    });

    test('isLongToken: CJK and Thai sentences break on their own', () => {
      const { isLongToken } = jest.requireActual('./TextContainerCore');
      expect(
        isLongToken('欧盟范围内保护个人数据的法规，自二零一八年五月起生效。')
      ).toBe(false);
      expect(isLongToken('個人データの保護に関する欧州連合の規則です。')).toBe(
        false
      );
      expect(isLongToken('ข้อบังคับคุ้มครองข้อมูลส่วนบุคคลของสหภาพยุโรป')).toBe(
        false
      );
      // ...but an identifier written into one still counts
      expect(
        isLongToken('在.env文件中设置NEXT_PUBLIC_SUPABASE_ANON_KEY环境变量')
      ).toBe(true);
    });

    test('runs before rehype-katex, while inline math is still <code>', () => {
      const { REHYPE_PLUGINS, rehypeTableMeta: plugin } = jest.requireActual(
        './TextContainerCore'
      );
      expect(REHYPE_PLUGINS[0]).toBe(plugin);
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
