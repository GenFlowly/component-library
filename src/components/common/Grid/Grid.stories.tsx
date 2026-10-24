import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { Grid, GridCol } from './Grid';

const meta: Meta<typeof Grid> = {
  title: 'Common/Grid',
  component: Grid,
  parameters: {
    docs: {
      description: {
        component:
          'Bootstrap-style 12-column grid. Breakpoints follow the grid container width ' +
          '(not the viewport), so sidebars shrinking the content area reflow the columns. ' +
          'The standard card layout is `<GridCol span={12} md={6} lg={4}>`.',
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof Grid>;

const DemoCard = ({ label }: { label: string }) => (
  <div
    style={{
      border: '1px solid #d1d5db',
      borderRadius: 12,
      padding: '1.25rem',
      background: '#f9fafb',
    }}
  >
    {label}
  </div>
);

/** Three cards per row on wide containers, two at medium, one when narrow. */
export const CardLayout: Story = {
  render: () => (
    <Grid>
      {Array.from({ length: 6 }, (_, i) => (
        <GridCol key={i} span={12} md={6} lg={4}>
          <DemoCard label={`Card ${i + 1}`} />
        </GridCol>
      ))}
    </Grid>
  ),
};

/** Mixed spans: a 8/4 split that stacks on narrow containers. */
export const MixedSpans: Story = {
  render: () => (
    <Grid>
      <GridCol span={12} lg={8}>
        <DemoCard label="Main (8)" />
      </GridCol>
      <GridCol span={12} lg={4}>
        <DemoCard label="Side (4)" />
      </GridCol>
    </Grid>
  ),
};
