import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import StatTile from './StatTile';
import { Grid, GridCol } from '../Grid/Grid';

const meta: Meta<typeof StatTile> = {
  title: 'Components/Settings/StatTile',
  component: StatTile,
  tags: ['autodocs'],
  parameters: {
    docs: {
      description: {
        component: `One headline number with a short uppercase label. Pass the value already formatted (\`formatCompactCount\` for counts, so 1,700,000 reads "1.7M"). Lay tiles out with **Grid**: two per row on phones, one row on desktop.`,
      },
    },
  },
  args: { label: 'Total cost', value: '$4.12' },
};
export default meta;

type Story = StoryObj<typeof StatTile>;

export const Single: Story = {};
export const WithSubLine: Story = {
  args: { label: 'Requests', value: '318', sub: '11 per day' },
};
export const Row: Story = {
  render: () => (
    <div style={{ maxWidth: 816 }}>
      <Grid gap="sm">
        {[
          ['Total cost', '$4.12'],
          ['Requests', '318'],
          ['Tokens', '2.3M'],
          ['Cache tokens', '1.1M'],
        ].map(([label, value]) => (
          <GridCol key={label} span={6} md={3}>
            <StatTile label={label} value={value} />
          </GridCol>
        ))}
      </Grid>
    </div>
  ),
};
