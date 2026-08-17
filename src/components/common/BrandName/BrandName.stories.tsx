import React from 'react';
import type { Meta, StoryObj } from '@storybook/react';
import BrandName, {
  OpenAIBrandName,
  ClaudeBrandName,
  GeminiBrandName,
  UserBrandName,
  CollapsedOpenAIBrandName,
  CollapsedClaudeBrandName,
  CollapsedGeminiBrandName,
} from './BrandName';

const meta: Meta<typeof BrandName> = {
  title: 'Components/BrandName',
  component: BrandName,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof BrandName>;

export const Default: Story = {
  args: {
    name: 'Custom Brand',
  },
};

export const VendorNames: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <OpenAIBrandName />
      <ClaudeBrandName />
      <GeminiBrandName />
    </div>
  ),
};

export const CollapsedVariants: Story = {
  render: () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <CollapsedOpenAIBrandName />
      <CollapsedClaudeBrandName />
      <CollapsedGeminiBrandName />
      <CollapsedClaudeBrandName size={32} />
      <CollapsedGeminiBrandName size={40} />
    </div>
  ),
};

export const User: Story = {
  render: () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <UserBrandName name="Jane Doe" />
      <UserBrandName name="Jane Doe" picture="https://i.pravatar.cc/48?img=5" />
    </div>
  ),
};

export const AsHeading: Story = {
  args: {
    name: 'Rendered as an h3',
    as: 'h3',
  },
};
