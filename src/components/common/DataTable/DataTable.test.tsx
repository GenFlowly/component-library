import React from 'react';
import { render, screen, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DataTable, { DataTableColumn } from './DataTable';
import StatTile from '../StatTile/StatTile';
import KnowledgeStrip from '../KnowledgeStrip/KnowledgeStrip';

interface Row {
  vendor: string;
  tokens: string;
}

const columns: DataTableColumn<Row>[] = [
  { key: 'vendor', header: 'Vendor', render: row => row.vendor },
  { key: 'tokens', header: 'Tokens', numeric: true, render: row => row.tokens },
];

describe('DataTable', () => {
  test('renders headers, rows and a totals footer', () => {
    render(
      <DataTable
        columns={columns}
        rows={[
          { vendor: 'OpenAI', tokens: '1.8M' },
          { vendor: 'Anthropic', tokens: '486,400' },
        ]}
        rowKey={row => row.vendor}
        footer={['All', '2.3M']}
        caption="By vendor"
      />
    );
    const table = screen.getByRole('table', { name: 'By vendor' });
    expect(
      within(table)
        .getAllByRole('columnheader')
        .map(th => th.textContent)
    ).toEqual(['Vendor', 'Tokens']);
    expect(within(table).getByText('1.8M')).toHaveClass('numeric');
    expect(within(table).getByText('2.3M')).toBeInTheDocument();
  });

  test('shows the empty text when there are no rows', () => {
    render(
      <DataTable
        columns={columns}
        rows={[]}
        rowKey={row => row.vendor}
        emptyText="No usage yet"
      />
    );
    expect(screen.getByText('No usage yet')).toBeInTheDocument();
  });
});

describe('StatTile', () => {
  test('shows label, value and sub line', () => {
    render(<StatTile label="Cache tokens" value="1.1M" sub="17 days" />);
    expect(screen.getByText('Cache tokens')).toBeInTheDocument();
    expect(screen.getByText('1.1M')).toBeInTheDocument();
    expect(screen.getByText('17 days')).toBeInTheDocument();
  });
});

describe('KnowledgeStrip', () => {
  test('lists each title with its text, and renders nothing when empty', () => {
    const { container, rerender } = render(
      <KnowledgeStrip
        aria-label="About this page"
        items={[
          {
            title: 'What priority means',
            text: 'Priority 1 is your main provider.',
          },
          { title: 'Where to get a key', text: "From the provider's website." },
        ]}
      />
    );
    expect(screen.getByText('What priority means').tagName).toBe('DT');
    expect(screen.getByText('Priority 1 is your main provider.').tagName).toBe(
      'DD'
    );
    rerender(<KnowledgeStrip items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
