import type { Meta, StoryObj } from '@storybook/react';
import DataTable from './DataTable';

interface KeyRow {
  name: string;
  requests: string;
  cost: string;
}

const rows: KeyRow[] = [
  { name: 'CI server', requests: '1,204', cost: '$0.58' },
  { name: 'Local scripts', requests: '0', cost: '$0.00' },
];

const meta: Meta<typeof DataTable<KeyRow>> = {
  title: 'Components/Settings/DataTable',
  component: DataTable,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `A plain settings table: uppercase headers that may wrap, right-aligned numeric columns, an optional totals footer and an empty message. It scrolls sideways when the card is narrower than the table. Put it in a \`flush\` **SettingsCard**.`,
      },
    },
  },
  args: {
    rows,
    rowKey: row => row.name,
    caption: 'Your API keys',
    emptyText: 'No API keys yet.',
    columns: [
      { key: 'name', header: 'Name', render: row => row.name },
      {
        key: 'requests',
        header: 'Requests, 30 days',
        numeric: true,
        render: row => row.requests,
      },
      {
        key: 'cost',
        header: 'Cost, 30 days',
        numeric: true,
        render: row => row.cost,
      },
    ],
  },
};
export default meta;

type Story = StoryObj<typeof DataTable<KeyRow>>;

export const Default: Story = {};
export const WithTotals: Story = {
  args: { footer: ['All keys', '1,204', '$0.58'] },
};
export const Empty: Story = { args: { rows: [] } };
